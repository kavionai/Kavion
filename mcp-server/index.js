import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import MiniSearch from 'minisearch';
import YAML from 'yaml';

const serverVersion = '0.2.1';

const modulePath = fileURLToPath(import.meta.url);
const serverDir = path.dirname(modulePath);
const extensionPath = path.dirname(serverDir);
const workspacePath =
  process.env.KAVION_WORKSPACE_PATH ||
  process.env.GEMINI_PROJECT_DIR ||
  process.env.CLAUDE_PROJECT_DIR ||
  process.env.FORGEKIT_WORKSPACE_PATH ||
  process.cwd();

const kavionRoot = path.join(workspacePath, '.kavion');
const geminiRoot = path.join(workspacePath, '.gemini');
const indexRoot = path.join(kavionRoot, 'index');
const notesRoot = path.join(kavionRoot, 'notes');
const plansRoot = path.join(kavionRoot, 'plans');
const reportsRoot = path.join(kavionRoot, 'reports');
const historyRoot = path.join(kavionRoot, 'history');

const stateDbFile = path.join(kavionRoot, 'state.db');
const projectFile = path.join(kavionRoot, 'PROJECT.md');
const decisionsFile = path.join(kavionRoot, 'DECISIONS.md');
const decisionsArchiveFile = path.join(kavionRoot, 'DECISIONS-archive.md');
const currentFile = path.join(kavionRoot, 'CURRENT.md');
const sessionFile = path.join(kavionRoot, 'session.json');
const gatesFile = path.join(kavionRoot, 'gates.yaml');
const workerLogFile = path.join(kavionRoot, 'worker.log');
const fallbackEventsFile = path.join(kavionRoot, 'fallback.jsonl');
const chunksFile = path.join(indexRoot, 'chunks.jsonl');
const miniSearchFile = path.join(indexRoot, 'bm25.json');
const indexMetaFile = path.join(indexRoot, '.meta.json');
const dirtyFile = path.join(indexRoot, '.dirty');
const projectGeminiSettingsFile = path.join(geminiRoot, 'settings.json');

const maxProjectLines = 300;
const maxCurrentLines = 50;
const maxDecisionEntries = 200;
const minNoteWords = 100;
const maxNoteWords = 2000;
const noteTtlDays = 14;

const searchOptions = {
  fields: ['text', 'heading_path'],
  storeFields: ['path', 'heading_path', 'type', 'updated', 'tokens', 'session_id', 'task_id'],
  searchOptions: {
    boost: { heading_path: 2 },
    fuzzy: 0.2,
    prefix: true,
  },
};

const defaultGateConfig = {
  plan: {
    required_for: ['medium', 'large'],
  },
  test: {
    command: null,
  },
  review: {
    required_sections: ['Summary', 'Evidence'],
  },
  security: {
    trigger_paths: ['src/auth/**', 'src/crypto/**', '**/Dockerfile', 'package.json'],
    command: null,
  },
};

let dbHandle = null;

function rel(filePath) {
  return path.relative(workspacePath, filePath).replace(/\\/g, '/');
}

function nowMs() {
  return Date.now();
}

function isoNow(ms = nowMs()) {
  return new Date(ms).toISOString();
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9_./:-]+/g)
    .filter((token) => token.length > 1);
}

function lines(value) {
  return normalizeWhitespace(value).split('\n').filter(Boolean);
}

function wordCount(value) {
  return normalizeWhitespace(value).split(/\s+/).filter(Boolean).length;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'task';
}

function sha1(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function safeJson(value) {
  return JSON.stringify(value ?? {});
}

function text(data) {
  return {
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath, fallback = '') {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return fallback;
  }
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readJsonl(filePath) {
  try {
    return (await fs.readFile(filePath, 'utf8'))
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function writeTextAtomic(filePath, content) {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tempPath, content, 'utf8');
  await fs.rename(tempPath, filePath);
}

async function writeJsonAtomic(filePath, value) {
  await writeTextAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function appendText(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, content, 'utf8');
}

async function appendJsonl(filePath, value) {
  await appendText(filePath, `${JSON.stringify(value)}\n`);
}

async function removeIfExists(filePath) {
  try {
    await fs.rm(filePath, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

async function logWorker(message, payload = null) {
  const line = `[${isoNow()}] ${message}${payload ? ` ${JSON.stringify(payload)}` : ''}\n`;
  await appendText(workerLogFile, line);
}

async function ensureDirs() {
  await fs.mkdir(kavionRoot, { recursive: true });
  await fs.mkdir(indexRoot, { recursive: true });
  await fs.mkdir(notesRoot, { recursive: true });
  await fs.mkdir(plansRoot, { recursive: true });
  await fs.mkdir(reportsRoot, { recursive: true });
  await fs.mkdir(historyRoot, { recursive: true });
  await fs.mkdir(geminiRoot, { recursive: true });
}

function defaultProjectContent() {
  return `# Project

## Brief
- Name:
- Goal:
- Users:

## Architecture
- Stack:
- Runtime:
- Entry points:
- Data stores:

## Conventions
- Keep this file short and repo-level.
- Put active workflow state in the worker-backed session, not here.
`;
}

function defaultDecisionsContent() {
  return '# Decisions\n\n';
}

function defaultCurrentContent() {
  return `# Current Work

- Active task: none
- Status: idle
- Next step:
- Blockers: none
`;
}

function defaultRenderedSession() {
  return {
    session_id: '',
    task_id: '',
    task: '',
    slug: '',
    task_class: '',
    phase: 'idle',
    status: 'idle',
    next_step: '',
    blocker: 'none',
    agents_used: [],
    files_touched: [],
    recent_events: [],
    updated_at: '',
  };
}

async function detectTestCommand() {
  const packageJson = await readJson(path.join(workspacePath, 'package.json'));
  if (packageJson?.scripts?.test && !/^echo\s+["']?Error/i.test(packageJson.scripts.test)) {
    return 'npm test';
  }
  if (await exists(path.join(workspacePath, 'pyproject.toml'))) return 'pytest';
  if (await exists(path.join(workspacePath, 'package.json'))) return 'npm test';
  return null;
}

async function detectSecurityCommand() {
  if (await exists(path.join(workspacePath, 'package.json'))) {
    return 'npm audit --audit-level=high';
  }
  if (await exists(path.join(workspacePath, 'pyproject.toml'))) {
    return 'bandit -r .';
  }
  return null;
}

async function ensureStaticFiles() {
  await ensureDirs();
  if (!(await exists(projectFile))) await writeTextAtomic(projectFile, defaultProjectContent());
  if (!(await exists(decisionsFile))) await writeTextAtomic(decisionsFile, defaultDecisionsContent());
  if (!(await exists(decisionsArchiveFile))) await writeTextAtomic(decisionsArchiveFile, '# Decisions Archive\n\n');
  if (!(await exists(currentFile))) await writeTextAtomic(currentFile, defaultCurrentContent());
  if (!(await exists(sessionFile))) await writeJsonAtomic(sessionFile, defaultRenderedSession());
  if (!(await exists(gatesFile))) {
    const config = structuredClone(defaultGateConfig);
    config.test.command = await detectTestCommand();
    config.security.command = await detectSecurityCommand();
    await writeTextAtomic(gatesFile, YAML.stringify(config));
  }
}

function openDb() {
  if (dbHandle) return dbHandle;
  dbHandle = new DatabaseSync(stateDbFile);
  dbHandle.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 2000;

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      class TEXT NOT NULL CHECK(class IN ('trivial','medium','debug')),
      status TEXT NOT NULL CHECK(status IN ('open','done','abandoned')) DEFAULT 'open',
      created_at INTEGER NOT NULL,
      closed_at INTEGER,
      requires_followup INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      phase TEXT NOT NULL CHECK(phase IN ('init','plan','code','test','review','ship','closed')),
      status TEXT NOT NULL CHECK(status IN ('active','paused','closed')) DEFAULT 'active',
      next_step TEXT,
      blocker TEXT,
      opened_at INTEGER NOT NULL,
      closed_at INTEGER,
      last_event_id INTEGER NOT NULL DEFAULT 0,
      gemini_session_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_task ON sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(status);

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      ts INTEGER NOT NULL,
      kind TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('hook','tool','reconciler','user')),
      agent TEXT,
      payload_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, id);
    CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind);

    CREATE TABLE IF NOT EXISTS delegations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      agent TEXT NOT NULL,
      spawned_at INTEGER NOT NULL,
      completed_at INTEGER,
      status TEXT NOT NULL CHECK(status IN ('spawned','completed','failed','needs_context')),
      inputs_json TEXT NOT NULL,
      outputs_json TEXT,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_delegations_session ON delegations(session_id);

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      kind TEXT NOT NULL CHECK(kind IN ('plan','report:review','report:qa','report:security','note')),
      payload_json TEXT NOT NULL,
      file_path TEXT,
      file_sha256 TEXT,
      created_at INTEGER NOT NULL,
      superseded_by TEXT REFERENCES artifacts(id)
    );
    CREATE INDEX IF NOT EXISTS idx_artifacts_session_kind ON artifacts(session_id, kind);

    CREATE TABLE IF NOT EXISTS gate_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      name TEXT NOT NULL,
      passed INTEGER NOT NULL,
      exit_code INTEGER,
      stdout_sha256 TEXT,
      stdout_preview TEXT,
      ran_at INTEGER NOT NULL,
      ttl_seconds INTEGER NOT NULL DEFAULT 1800
    );
    CREATE INDEX IF NOT EXISTS idx_gate_runs_session_name ON gate_runs(session_id, name);

    CREATE TABLE IF NOT EXISTS render_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_path TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','done','failed')) DEFAULT 'pending',
      error TEXT,
      enqueued_at INTEGER NOT NULL,
      completed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_render_jobs_pending ON render_jobs(status, id);

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO meta(key, value) VALUES ('schema_version', '1');
    INSERT OR IGNORE INTO meta(key, value) VALUES ('hook_failures', '0');
  `);
  return dbHandle;
}

function getDb() {
  return openDb();
}

function tx(run) {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = run(db);
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function statement(sql) {
  return getDb().prepare(sql);
}

function classifyTask(task) {
  const text = String(task || '').toLowerCase();
  if (!text.trim()) return 'medium';
  if (text.length < 80 && !/\b(implement|refactor|design|architect|workflow|memory)\b/.test(text)) {
    return 'trivial';
  }
  if (/\b(prod|broken|down|hotfix|urgent|bug|crash|error|debug)\b/.test(text)) {
    return 'debug';
  }
  return 'medium';
}

function currentGeminiSessionId() {
  return process.env.GEMINI_SESSION_ID || '';
}

function activeSessionRow() {
  return statement(`
    SELECT
      s.id AS session_id,
      t.id AS task_id,
      t.title AS task,
      t.class AS task_class,
      t.status AS task_status,
      s.phase,
      s.status,
      s.next_step,
      s.blocker,
      s.opened_at,
      s.closed_at,
      s.last_event_id,
      s.gemini_session_id
    FROM sessions s
    JOIN tasks t ON t.id = s.task_id
    WHERE s.status = 'active'
    ORDER BY s.opened_at DESC
    LIMIT 1
  `).get();
}

function sessionById(sessionId) {
  return statement(`
    SELECT
      s.id AS session_id,
      t.id AS task_id,
      t.title AS task,
      t.class AS task_class,
      t.status AS task_status,
      s.phase,
      s.status,
      s.next_step,
      s.blocker,
      s.opened_at,
      s.closed_at,
      s.last_event_id,
      s.gemini_session_id
    FROM sessions s
    JOIN tasks t ON t.id = s.task_id
    WHERE s.id = ?
    LIMIT 1
  `).get(sessionId);
}

function recentEvents(sessionId, limit = 5) {
  return statement(`
    SELECT id, ts, kind, source, agent, payload_json
    FROM events
    WHERE session_id = ?
    ORDER BY id DESC
    LIMIT ?
  `)
    .all(sessionId, limit)
    .reverse()
    .map((row) => ({
      id: row.id,
      ts: row.ts,
      kind: row.kind,
      source: row.source,
      agent: row.agent || '',
      payload: parseJson(row.payload_json, {}),
    }));
}

function sessionFilesTouched(sessionId) {
  const rows = statement(`
    SELECT DISTINCT json_extract(payload_json, '$.path') AS path
    FROM events
    WHERE session_id = ?
      AND kind = 'file_touched'
      AND json_extract(payload_json, '$.path') IS NOT NULL
  `).all(sessionId);
  return rows.map((row) => row.path).filter(Boolean).sort();
}

function sessionAgentsUsed(sessionId) {
  const rows = statement(`
    SELECT DISTINCT COALESCE(agent, json_extract(payload_json, '$.agent')) AS agent_name
    FROM events
    WHERE session_id = ?
      AND COALESCE(agent, json_extract(payload_json, '$.agent')) IS NOT NULL
  `).all(sessionId);
  return rows.map((row) => row.agent_name).filter(Boolean).sort();
}

function appendEvent(sessionId, kind, payload = {}, { source = 'tool', agent = 'main' } = {}) {
  const ts = nowMs();
  const result = statement(`
    INSERT INTO events(session_id, ts, kind, source, agent, payload_json)
    VALUES(?, ?, ?, ?, ?, ?)
  `).run(sessionId, ts, kind, source, agent, safeJson(payload));
  statement('UPDATE sessions SET last_event_id = ? WHERE id = ?').run(Number(result.lastInsertRowid), sessionId);
  return Number(result.lastInsertRowid);
}

function enqueueRender(targetPath, reason) {
  statement(`
    INSERT INTO render_jobs(target_path, reason, status, enqueued_at)
    VALUES(?, ?, 'pending', ?)
  `).run(targetPath, reason, nowMs());
}

function historyMarkdown(session, events) {
  return `# Session History

- Task: ${session.task}
- Class: ${session.task_class}
- Phase: ${session.phase}
- Status: ${session.status}
- Opened: ${isoNow(session.opened_at)}
- Closed: ${session.closed_at ? isoNow(session.closed_at) : ''}

## Next Step
${session.next_step || ''}

## Blocker
${session.blocker || 'none'}

## Recent Events
${events.length ? events.map((event) => `- ${isoNow(event.ts)} ${event.kind}${event.agent ? ` (${event.agent})` : ''}`).join('\n') : '- none'}
`;
}

async function renderSessionViews() {
  await ensureStaticFiles();
  const session = activeSessionRow();
  if (!session) {
    await writeTextAtomic(currentFile, defaultCurrentContent());
    await writeJsonAtomic(sessionFile, defaultRenderedSession());
    return {
      ok: true,
      active: false,
      current_file: rel(currentFile),
      session_file: rel(sessionFile),
    };
  }

  const events = recentEvents(session.session_id, 5);
  const filesTouched = sessionFilesTouched(session.session_id);
  const agentsUsed = sessionAgentsUsed(session.session_id);
  const renderedSession = {
    session_id: session.session_id,
    task_id: session.task_id,
    task: session.task,
    slug: slugify(session.task),
    task_class: session.task_class,
    phase: session.phase,
    status: session.status,
    next_step: session.next_step || '',
    blocker: session.blocker || 'none',
    workflow: session.task_class === 'trivial' ? 'express' : 'standard',
    active_agent: agentsUsed.at(-1) || '',
    agents_used: agentsUsed,
    files_touched: filesTouched,
    recent_events: events.map((event) => ({
      id: event.id,
      kind: event.kind,
      agent: event.agent,
      timestamp: isoNow(event.ts),
    })),
    opened_at: isoNow(session.opened_at),
    updated_at: events.length ? isoNow(events.at(-1).ts) : isoNow(session.opened_at),
  };

  const summaryLines = [
    '# Current Work',
    '',
    `- Active task: ${session.task}`,
    `- Class: ${session.task_class}`,
    `- Phase: ${session.phase}`,
    `- Status: ${session.status}`,
    `- Next step: ${session.next_step || ''}`,
    `- Blockers: ${session.blocker || 'none'}`,
    agentsUsed.length ? `- Agents used: ${agentsUsed.join(', ')}` : '- Agents used:',
    filesTouched.length ? `- Files touched: ${filesTouched.join(', ')}` : '- Files touched:',
  ];

  if (events.length) {
    summaryLines.push('', '## Recent Events');
    for (const event of events) {
      summaryLines.push(`- ${isoNow(event.ts)} ${event.kind}${event.agent ? ` (${event.agent})` : ''}`);
    }
  }

  await writeTextAtomic(currentFile, `${summaryLines.slice(0, maxCurrentLines).join('\n')}\n`);
  await writeJsonAtomic(sessionFile, renderedSession);

  if (session.status === 'closed' || session.phase === 'closed') {
    const historyPath = path.join(historyRoot, `${slugify(session.task)}-${session.session_id}.md`);
    await writeTextAtomic(historyPath, `${historyMarkdown(session, events).trim()}\n`);
  }

  return {
    ok: true,
    active: true,
    session: renderedSession,
    current_file: rel(currentFile),
    session_file: rel(sessionFile),
  };
}

async function touchDirtyIndex() {
  await ensureDirs();
  await writeTextAtomic(dirtyFile, `${isoNow()}\n`);
}

function fallbackHookError(reason) {
  return {
    decision: 'allow',
    systemMessage: `Kavion hook warning: ${reason}`,
  };
}

async function recordFallbackEvent(kind, payload) {
  await appendJsonl(fallbackEventsFile, {
    ts: isoNow(),
    kind,
    payload,
  });
}

async function ensureWorkspaceInitialized() {
  await ensureStaticFiles();
  getDb();
  await renderSessionViews();
}

async function installGeminiHookSettings() {
  await ensureDirs();
  const settings = (await readJson(projectGeminiSettingsFile, {})) || {};
  const hookCommand = (eventName) => `node "${modulePath}" hook ${eventName}`;
  const currentHooks = settings.hooks && typeof settings.hooks === 'object' ? settings.hooks : {};

  function upsertHook(eventName, matcher, name, command) {
    const current = Array.isArray(currentHooks[eventName]) ? currentHooks[eventName] : [];
    const withoutSame = current.filter((entry) => {
      const hooks = Array.isArray(entry?.hooks) ? entry.hooks : [];
      return !hooks.some((hook) => hook?.name === name);
    });
    withoutSame.push({
      matcher,
      hooks: [
        {
          type: 'command',
          name,
          command,
        },
      ],
    });
    currentHooks[eventName] = withoutSame;
  }

  upsertHook('SessionStart', 'startup', 'kavion-session-start', hookCommand('session-start'));
  upsertHook('SessionStart', 'resume', 'kavion-session-start-resume', hookCommand('session-start'));
  upsertHook('BeforeAgent', '*', 'kavion-before-agent', hookCommand('before-agent'));
  upsertHook('AfterTool', '.*', 'kavion-after-tool', hookCommand('after-tool'));

  settings.hooks = currentHooks;
  await writeJsonAtomic(projectGeminiSettingsFile, settings);
  return rel(projectGeminiSettingsFile);
}

async function initializeWorkspace() {
  await ensureWorkspaceInitialized();
  const hooksFile = await installGeminiHookSettings();
  await touchDirtyIndex();
  const index = await buildIndex();
  return {
    ok: true,
    root: rel(kavionRoot),
    state_db: rel(stateDbFile),
    hook_settings: hooksFile,
    files: [
      rel(projectFile),
      rel(decisionsFile),
      rel(decisionsArchiveFile),
      rel(currentFile),
      rel(sessionFile),
      rel(gatesFile),
      rel(notesRoot),
      rel(plansRoot),
      rel(reportsRoot),
      rel(historyRoot),
      rel(indexRoot),
    ],
    index,
  };
}

function createTaskAndSession(taskTitle, taskClass = classifyTask(taskTitle)) {
  const taskId = makeId('task');
  const sessionId = makeId('session');
  const ts = nowMs();
  statement(`
    INSERT INTO tasks(id, title, class, status, created_at)
    VALUES(?, ?, ?, 'open', ?)
  `).run(taskId, taskTitle, taskClass, ts);
  statement(`
    INSERT INTO sessions(id, task_id, phase, status, next_step, blocker, opened_at, gemini_session_id)
    VALUES(?, ?, 'init', 'active', ?, 'none', ?, ?)
  `).run(sessionId, taskId, taskClass === 'trivial' ? 'Apply the requested change.' : 'Create a plan before implementation.', ts, currentGeminiSessionId());
  appendEvent(sessionId, 'session_started', { task: taskTitle, task_class: taskClass }, { source: 'tool', agent: 'main' });
  return sessionById(sessionId);
}

async function sessionStart({ task = '', agent = 'main', force_new = false } = {}) {
  await ensureWorkspaceInitialized();
  const title = normalizeWhitespace(task);
  let session;

  tx(() => {
    const current = activeSessionRow();
    if (!force_new && current && (!title || current.task === title)) {
      session = current;
      appendEvent(current.session_id, 'session_resumed', { task: current.task }, { source: 'tool', agent });
      statement('UPDATE sessions SET gemini_session_id = ? WHERE id = ?').run(currentGeminiSessionId(), current.session_id);
      return;
    }

    if (current && title && current.task !== title) {
      statement(`
        UPDATE sessions
        SET status = 'paused', blocker = COALESCE(blocker, 'Paused for new task.')
        WHERE id = ?
      `).run(current.session_id);
      appendEvent(current.session_id, 'session_paused', { reason: 'new_task_started', next_task: title }, { source: 'tool', agent });
    }

    session = createTaskAndSession(title || current?.task || 'Untitled task');
  });

  await renderSessionViews();
  await touchDirtyIndex();
  return {
    ok: true,
    session,
    rendered: rel(sessionFile),
  };
}

const phaseOrder = ['init', 'plan', 'code', 'test', 'review', 'ship', 'closed'];

async function hasPlanArtifact(sessionId) {
  const row = statement(`
    SELECT id FROM artifacts
    WHERE session_id = ? AND kind = 'plan' AND superseded_by IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `).get(sessionId);
  return Boolean(row);
}

async function sessionTransition({ to_phase, next_step = '', blocker = '' } = {}) {
  await ensureWorkspaceInitialized();
  const active = activeSessionRow();
  if (!active) {
    return { ok: false, reason: 'NO_SESSION', next_step: 'Call kavion_session_start first.' };
  }
  const target = String(to_phase || '').trim();
  if (!phaseOrder.includes(target)) {
    return { ok: false, reason: `Unknown phase: ${target}` };
  }
  if (target === 'code' && active.task_class !== 'trivial' && !(await hasPlanArtifact(active.session_id))) {
    return {
      ok: false,
      reason: 'PLAN_REQUIRED',
      missing_criteria: ['plan_required_for_code_phase'],
      next_step: 'Create a plan with kavion_plan_create before entering code phase.',
    };
  }

  tx(() => {
    statement(`
      UPDATE sessions
      SET phase = ?, next_step = ?, blocker = ?, status = CASE WHEN ? = 'closed' THEN 'closed' ELSE status END,
          closed_at = CASE WHEN ? = 'closed' THEN ? ELSE closed_at END
      WHERE id = ?
    `).run(
      target,
      next_step || active.next_step || '',
      blocker || active.blocker || 'none',
      target,
      target,
      target === 'closed' ? nowMs() : null,
      active.session_id,
    );
    appendEvent(active.session_id, 'phase_transition', { from_phase: active.phase, to_phase: target }, { source: 'tool', agent: 'main' });
  });

  await renderSessionViews();
  await touchDirtyIndex();
  return {
    ok: true,
    session: sessionById(active.session_id),
  };
}

async function updateSessionCompat(payload = {}) {
  await ensureWorkspaceInitialized();
  let active = activeSessionRow();
  if (!active && payload.task) {
    await sessionStart({ task: payload.task, agent: payload.active_agent || 'main' });
    active = activeSessionRow();
  }
  if (!active) {
    return { ok: false, reason: 'NO_SESSION', next_step: 'Call kavion_session_start first.' };
  }

  if (payload.phase && payload.phase !== active.phase) {
    const transitioned = await sessionTransition({
      to_phase: payload.phase,
      next_step: payload.next_step || active.next_step || '',
      blocker: payload.blockers || payload.blocker || active.blocker || 'none',
    });
    if (!transitioned.ok) return transitioned;
    active = activeSessionRow();
  }

  tx(() => {
    if (payload.next_step || payload.blockers || payload.blocker || payload.status) {
      statement(`
        UPDATE sessions
        SET next_step = COALESCE(?, next_step),
            blocker = COALESCE(?, blocker),
            status = CASE WHEN ? IS NULL OR ? = '' THEN status ELSE ? END
        WHERE id = ?
      `).run(
        payload.next_step || null,
        payload.blockers || payload.blocker || null,
        payload.status || null,
        payload.status || '',
        payload.status || '',
        active.session_id,
      );
      appendEvent(active.session_id, 'session_updated', {
        next_step: payload.next_step || undefined,
        blocker: payload.blockers || payload.blocker || undefined,
        status: payload.status || undefined,
      }, { source: 'tool', agent: payload.active_agent || 'main' });
    }

    for (const agentName of uniq([payload.active_agent, ...(payload.agents_used || [])])) {
      appendEvent(active.session_id, 'agent_used', { agent: agentName }, { source: 'tool', agent: agentName || 'main' });
    }

    for (const filePath of uniq(payload.files_touched || [])) {
      appendEvent(active.session_id, 'file_touched', { path: filePath }, { source: 'tool', agent: payload.active_agent || 'main' });
    }
  });

  await renderSessionViews();
  await touchDirtyIndex();
  return {
    ok: true,
    session: sessionById(active.session_id),
  };
}

function planMarkdown({ title, goal, acceptance_criteria, steps, files, risks }) {
  return `# Plan: ${title}

## Goal
${goal || 'TBD'}

## Acceptance Criteria
${acceptance_criteria.length ? acceptance_criteria.map((item) => `- ${item}`).join('\n') : '- TBD'}

## Steps
${steps.length ? steps.map((step, index) => `${index + 1}. ${step}`).join('\n') : '1. Inspect the relevant code.\n2. Implement the change.\n3. Verify the result.'}

## Files
${files.length ? files.map((item) => `- ${item}`).join('\n') : '- TBD'}

## Risks
${risks.length ? risks.map((item) => `- ${item}`).join('\n') : '- none'}
`;
}

async function planCreate({
  slug,
  title = '',
  goal = '',
  acceptance_criteria = [],
  steps = [],
  files = [],
  risks = [],
} = {}) {
  await ensureWorkspaceInitialized();
  const active = activeSessionRow();
  if (!active) {
    return { ok: false, reason: 'NO_SESSION', next_step: 'Call kavion_session_start first.' };
  }
  const planSlug = slugify(slug || title || active.task);
  const planTitle = title || active.task;
  const filePath = path.join(plansRoot, `plan-${planSlug}.md`);
  const body = planMarkdown({
    title: planTitle,
    goal: normalizeWhitespace(goal),
    acceptance_criteria: acceptance_criteria.map((item) => String(item).trim()).filter(Boolean),
    steps: steps.map((item) => String(item).trim()).filter(Boolean),
    files: files.map((item) => String(item).trim()).filter(Boolean),
    risks: risks.map((item) => String(item).trim()).filter(Boolean),
  });
  await writeTextAtomic(filePath, `${body.trim()}\n`);
  const fileContent = await readText(filePath);
  tx(() => {
    const artifactId = makeId('artifact');
    statement(`
      INSERT INTO artifacts(id, session_id, kind, payload_json, file_path, file_sha256, created_at)
      VALUES(?, ?, 'plan', ?, ?, ?, ?)
    `).run(
      artifactId,
      active.session_id,
      safeJson({ title: planTitle, goal, acceptance_criteria, steps, files, risks }),
      rel(filePath),
      sha256(fileContent),
      nowMs(),
    );
    appendEvent(active.session_id, 'artifact_created', { kind: 'plan', path: rel(filePath) }, { source: 'tool', agent: 'planner' });
    statement(`UPDATE sessions SET phase = 'plan', next_step = ? WHERE id = ?`).run('Start implementation after planning.', active.session_id);
  });
  await renderSessionViews();
  await touchDirtyIndex();
  return {
    ok: true,
    file: rel(filePath),
    slug: planSlug,
    session: sessionById(active.session_id),
  };
}

function reportFilename(session, kind) {
  const slug = slugify(session.task);
  const suffix = kind.replace(/^report:/, '');
  return `${slug}-${suffix}.md`;
}

async function reportCreate({
  kind,
  title = '',
  result = '',
  summary = '',
  evidence = [],
  files = [],
  commands = [],
  issues = [],
  verified = [],
} = {}) {
  await ensureWorkspaceInitialized();
  const active = activeSessionRow();
  if (!active) {
    return { ok: false, reason: 'NO_SESSION', next_step: 'Call kavion_session_start first.' };
  }
  const normalizedKind = String(kind || '').trim();
  if (!['report:qa', 'report:review', 'report:security'].includes(normalizedKind)) {
    return { ok: false, reason: `Unsupported report kind: ${normalizedKind}` };
  }

  const filePath = path.join(reportsRoot, reportFilename(active, normalizedKind));
  const body = `# Report: ${title || `${active.task} - ${normalizedKind.replace(/^report:/, '')}`}

**Timestamp:** ${isoNow()}
**Result:** ${result || 'unknown'}

## Summary
${normalizeWhitespace(summary) || 'No summary provided.'}

## Evidence
${evidence.length ? evidence.map((item) => `- ${item}`).join('\n') : '- none'}

## Files
${files.length ? files.map((item) => `- ${item}`).join('\n') : '- none'}

## Commands
${commands.length ? commands.map((item) => `- ${item}`).join('\n') : '- none'}

## Issues
${issues.length ? issues.map((item) => `- ${item}`).join('\n') : '- none'}

## Verified
${verified.length ? verified.map((item) => `- ${item}`).join('\n') : '- none'}
`;

  await writeTextAtomic(filePath, `${body.trim()}\n`);
  const fileContent = await readText(filePath);
  tx(() => {
    const artifactId = makeId('artifact');
    statement(`
      INSERT INTO artifacts(id, session_id, kind, payload_json, file_path, file_sha256, created_at)
      VALUES(?, ?, ?, ?, ?, ?, ?)
    `).run(
      artifactId,
      active.session_id,
      normalizedKind,
      safeJson({ title, result, summary, evidence, files, commands, issues, verified }),
      rel(filePath),
      sha256(fileContent),
      nowMs(),
    );
    appendEvent(active.session_id, 'artifact_created', { kind: normalizedKind, path: rel(filePath) }, { source: 'tool', agent: 'reviewer' });
  });
  await renderSessionViews();
  await touchDirtyIndex();
  return {
    ok: true,
    file: rel(filePath),
    session: sessionById(active.session_id),
  };
}

async function writeNote({ slug, content, persistent = false } = {}) {
  await ensureWorkspaceInitialized();
  const words = wordCount(content);
  if (words < minNoteWords || words > maxNoteWords) {
    return {
      ok: false,
      reason: `Notes must be between ${minNoteWords} and ${maxNoteWords} words.`,
      words,
    };
  }
  const active = activeSessionRow();
  const noteSlug = slugify(slug || content.slice(0, 40));
  const stamp = isoNow().slice(0, 10);
  const filePath = path.join(notesRoot, `note-${stamp}-${noteSlug}.md`);
  const body = `---
persistent: ${persistent ? 'true' : 'false'}
created: ${isoNow()}
---

${normalizeWhitespace(content)}
`;
  await writeTextAtomic(filePath, body);
  const fileContent = await readText(filePath);
  if (active) {
    tx(() => {
      statement(`
        INSERT INTO artifacts(id, session_id, kind, payload_json, file_path, file_sha256, created_at)
        VALUES(?, ?, 'note', ?, ?, ?, ?)
      `).run(
        makeId('artifact'),
        active.session_id,
        safeJson({ slug: noteSlug, persistent }),
        rel(filePath),
        sha256(fileContent),
        nowMs(),
      );
      appendEvent(active.session_id, 'note_added', { path: rel(filePath) }, { source: 'tool', agent: 'main' });
    });
  }
  await touchDirtyIndex();
  return {
    ok: true,
    file: rel(filePath),
    persistent,
    words,
  };
}

async function closeActiveSession(reason = 'completed') {
  await ensureWorkspaceInitialized();
  const active = activeSessionRow();
  if (!active) {
    return { ok: false, reason: 'No active session to archive.' };
  }
  tx(() => {
    statement(`
      UPDATE sessions
      SET status = 'closed', phase = 'closed', closed_at = ?
      WHERE id = ?
    `).run(nowMs(), active.session_id);
    statement(`
      UPDATE tasks
      SET status = 'done', closed_at = ?
      WHERE id = ?
    `).run(nowMs(), active.task_id);
    appendEvent(active.session_id, 'session_closed', { reason }, { source: 'tool', agent: 'main' });
  });
  await renderSessionViews();
  await touchDirtyIndex();
  return {
    ok: true,
    archived: {
      task: active.task,
      session_id: active.session_id,
      reason,
    },
  };
}

async function readGateConfig() {
  await ensureStaticFiles();
  const raw = await readText(gatesFile);
  try {
    return {
      ...structuredClone(defaultGateConfig),
      ...(YAML.parse(raw) || {}),
    };
  } catch {
    return structuredClone(defaultGateConfig);
  }
}

async function runShell(command) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const child = spawn(process.env.SHELL || '/bin/sh', ['-lc', command], {
      cwd: workspacePath,
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (code) => {
      resolve({
        command,
        exit_code: code ?? 1,
        duration_ms: Date.now() - startedAt,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

async function gitBranch() {
  const result = await runShell('git branch --show-current');
  return result.exit_code === 0 ? result.stdout.trim() : null;
}

async function gitStatusPorcelain() {
  const result = await runShell('git status --porcelain');
  return result.exit_code === 0 ? result.stdout : '';
}

async function latestArtifact(sessionId, kind) {
  return statement(`
    SELECT * FROM artifacts
    WHERE session_id = ? AND kind = ? AND superseded_by IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `).get(sessionId, kind);
}

async function runGate(name) {
  await ensureWorkspaceInitialized();
  const active = activeSessionRow();
  if (!active && name !== 'status') {
    return { ok: false, reason: 'NO_SESSION', next_step: 'Call kavion_session_start first.' };
  }

  const config = await readGateConfig();
  if (name === 'status') return getStatus();
  if (name === 'plan') {
    const plan = active ? await latestArtifact(active.session_id, 'plan') : null;
    return {
      gate: 'plan',
      result: plan ? 'pass' : 'block',
      evidence: plan ? `Plan artifact exists at ${plan.file_path}.` : 'No plan artifact found.',
    };
  }
  if (name === 'test') {
    const command = config.test?.command;
    if (!command) {
      return {
        gate: 'test',
        result: 'risk',
        evidence: 'No test command configured in .kavion/gates.yaml.',
      };
    }
    const commandResult = await runShell(command);
    tx(() => {
      statement(`
        INSERT INTO gate_runs(session_id, name, passed, exit_code, stdout_sha256, stdout_preview, ran_at, ttl_seconds)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        active.session_id,
        'test',
        commandResult.exit_code === 0 ? 1 : 0,
        commandResult.exit_code,
        sha256(commandResult.stdout),
        commandResult.stdout.slice(0, 4096),
        nowMs(),
        1800,
      );
      appendEvent(active.session_id, 'gate_run', { name: 'test', passed: commandResult.exit_code === 0 }, { source: 'tool', agent: 'qa-test-engineer' });
    });
    return {
      gate: 'test',
      result: commandResult.exit_code === 0 ? 'pass' : 'block',
      command: commandResult,
      evidence: commandResult.exit_code === 0 ? 'Configured test command exited 0.' : 'Configured test command failed.',
    };
  }
  if (name === 'review') {
    const report = await latestArtifact(active.session_id, 'report:review');
    return {
      gate: 'review',
      result: report ? 'pass' : 'block',
      evidence: report ? `Review artifact exists at ${report.file_path}.` : 'No review report artifact found.',
    };
  }
  if (name === 'security') {
    const command = config.security?.command;
    if (!command) {
      return {
        gate: 'security',
        result: 'risk',
        evidence: 'No security command configured in .kavion/gates.yaml.',
      };
    }
    const commandResult = await runShell(command);
    tx(() => {
      statement(`
        INSERT INTO gate_runs(session_id, name, passed, exit_code, stdout_sha256, stdout_preview, ran_at, ttl_seconds)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        active.session_id,
        'security',
        commandResult.exit_code === 0 ? 1 : 0,
        commandResult.exit_code,
        sha256(commandResult.stdout),
        commandResult.stdout.slice(0, 4096),
        nowMs(),
        1800,
      );
      appendEvent(active.session_id, 'gate_run', { name: 'security', passed: commandResult.exit_code === 0 }, { source: 'tool', agent: 'security-engineer' });
    });
    return {
      gate: 'security',
      result: commandResult.exit_code === 0 ? 'pass' : 'block',
      command: commandResult,
      evidence: commandResult.exit_code === 0 ? 'Configured security command exited 0.' : 'Configured security command failed.',
    };
  }
  if (name === 'ship') {
    const plan = await runGate('plan');
    const review = await runGate('review');
    const test = await runGate('test');
    const security = await runGate('security');
    const branch = await gitBranch();
    const clean = !(await gitStatusPorcelain()).trim();
    const blockers = [plan, review, test, security]
      .filter((result) => result.result === 'block')
      .map((result) => `${result.gate} blocked`);
    if (!clean) blockers.push('git status not clean');
    if (branch === 'main') blockers.push('current branch is main');
    return {
      gate: 'ship',
      result: blockers.length ? 'block' : 'pass',
      evidence: blockers.length ? blockers.join('; ') : 'Plan, review, test, security, branch, and git cleanliness checks passed.',
      component_results: { plan, review, test, security },
      branch,
      clean,
    };
  }
  return { gate: name, result: 'block', evidence: `Unknown gate: ${name}` };
}

async function memoryGc({ delete_expired = true } = {}) {
  await ensureWorkspaceInitialized();
  const names = await fs.readdir(notesRoot).catch(() => []);
  const expired = [];
  const kept = [];
  const now = Date.now();

  for (const name of names.filter((item) => item.endsWith('.md'))) {
    const filePath = path.join(notesRoot, name);
    const content = await readText(filePath);
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat) continue;
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/);
    const parsed = frontmatter ? YAML.parse(frontmatter[1]) : {};
    const ageDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
    if (ageDays > noteTtlDays && !parsed?.persistent) {
      expired.push({ file: rel(filePath), age_days: Number(ageDays.toFixed(1)) });
      if (delete_expired) await fs.rm(filePath, { force: true });
    } else {
      kept.push({ file: rel(filePath), age_days: Number(ageDays.toFixed(1)) });
    }
  }

  const oversized = [];
  const projectLineCount = lines(await readText(projectFile)).length;
  if (projectLineCount > maxProjectLines) oversized.push({ file: rel(projectFile), lines: projectLineCount, max: maxProjectLines });
  const currentLineCount = lines(await readText(currentFile)).length;
  if (currentLineCount > maxCurrentLines) oversized.push({ file: rel(currentFile), lines: currentLineCount, max: maxCurrentLines });
  const decisionsCount = (await readText(decisionsFile)).match(/^##\s+/gm)?.length || 0;
  if (decisionsCount > maxDecisionEntries) oversized.push({ file: rel(decisionsFile), entries: decisionsCount, max: maxDecisionEntries });

  if (delete_expired && expired.length) {
    await touchDirtyIndex();
  }

  return {
    ok: true,
    expired_notes: expired,
    kept_notes: kept.slice(0, 20),
    oversized,
  };
}

async function getStatus() {
  await ensureWorkspaceInitialized();
  const session = activeSessionRow();
  const dirty = await exists(dirtyFile);
  const branch = await gitBranch();
  const porcelain = await gitStatusPorcelain();
  const noteGc = await memoryGc({ delete_expired: false });
  const latestPlanNames = (await fs.readdir(plansRoot).catch(() => [])).filter((name) => name.endsWith('.md')).sort();
  const latestReportNames = (await fs.readdir(reportsRoot).catch(() => [])).filter((name) => name.endsWith('.md')).sort();
  return {
    workspace: workspacePath,
    branch,
    git_clean: !porcelain.trim(),
    current: normalizeWhitespace(await readText(currentFile)).slice(0, 1400),
    session: session ? {
      ...session,
      files_touched: sessionFilesTouched(session.session_id),
      agents_used: sessionAgentsUsed(session.session_id),
    } : defaultRenderedSession(),
    storage: {
      state_db: rel(stateDbFile),
      current_view: rel(currentFile),
      session_view: rel(sessionFile),
      hook_settings: rel(projectGeminiSettingsFile),
    },
    memory: {
      index_root: rel(indexRoot),
      index_dirty: dirty,
      oversized: noteGc.oversized,
      expired_notes: noteGc.expired_notes,
    },
    latest_plans: latestPlanNames.slice(-5),
    latest_reports: latestReportNames.slice(-5),
    next_step: session?.next_step || '',
  };
}

function markdownChunks(content) {
  const rawLines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const chunks = [];
  const stack = [];
  let body = [];

  const flush = () => {
    const text = normalizeWhitespace(body.join('\n'));
    if (!text) {
      body = [];
      return;
    }
    const headingPath = stack.map((item) => item.text).join(' > ') || 'Document';
    chunks.push({ heading_path: headingPath, text });
    body = [];
  };

  for (const line of rawLines) {
    const match = line.match(/^(#{1,3})\s+(.*)$/);
    if (match) {
      flush();
      const level = match[1].length;
      const text = match[2].trim();
      while (stack.length >= level) stack.pop();
      stack.push({ level, text });
      continue;
    }
    body.push(line);
  }
  flush();
  return chunks.length ? chunks : [{ heading_path: 'Document', text: normalizeWhitespace(content) }];
}

function createMiniSearch() {
  return new MiniSearch(searchOptions);
}

async function collectIndexableFiles() {
  const queue = [projectFile, decisionsFile, decisionsArchiveFile, currentFile, sessionFile, gatesFile];
  async function walk(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory()) await walk(full);
      if (entry.isFile() && (full.endsWith('.md') || full.endsWith('.json'))) queue.push(full);
    }
  }
  await walk(notesRoot);
  await walk(plansRoot);
  await walk(reportsRoot);
  await walk(historyRoot);
  return uniq(queue);
}

async function buildIndex() {
  await ensureWorkspaceInitialized();
  const files = await collectIndexableFiles();
  const chunks = [];
  const mini = createMiniSearch();
  const active = activeSessionRow();

  for (const filePath of files) {
    const stat = await fs.stat(filePath).catch(() => null);
    const content = filePath.endsWith('.json')
      ? JSON.stringify(await readJson(filePath, {}), null, 2)
      : await readText(filePath);
    if (!normalizeWhitespace(content)) continue;
    const type = filePath.startsWith(notesRoot)
      ? 'note'
      : filePath.startsWith(plansRoot)
        ? 'plan'
        : filePath.startsWith(reportsRoot)
          ? 'report'
          : filePath === projectFile
            ? 'project'
            : filePath === decisionsFile || filePath === decisionsArchiveFile
              ? 'decision'
              : filePath === currentFile || filePath === sessionFile
                ? 'session'
                : 'memory';
    for (const chunk of markdownChunks(content)) {
      const record = {
        id: sha1(`${rel(filePath)}:${chunk.heading_path}:${chunk.text}`).slice(0, 8),
        path: rel(filePath),
        heading_path: chunk.heading_path,
        text: chunk.text,
        tokens: tokenize(chunk.text).length,
        updated: stat?.mtime?.toISOString() || isoNow(),
        type,
        session_id: active?.session_id || '',
        task_id: active?.task_id || '',
      };
      chunks.push(record);
    }
  }

  mini.addAll(chunks);
  await writeTextAtomic(chunksFile, `${chunks.map((chunk) => JSON.stringify(chunk)).join('\n')}${chunks.length ? '\n' : ''}`);
  await writeJsonAtomic(miniSearchFile, mini.toJSON());
  await writeJsonAtomic(indexMetaFile, {
    built_at: isoNow(),
    schema_version: 1,
    chunks: chunks.length,
  });
  await removeIfExists(dirtyFile);
  return {
    ok: true,
    backend: 'bm25',
    files: files.length,
    chunks: chunks.length,
    root: rel(indexRoot),
  };
}

async function loadIndex() {
  const missing = !(await exists(chunksFile)) || !(await exists(miniSearchFile));
  const dirty = await exists(dirtyFile);
  if (missing || dirty) await buildIndex();
  const chunks = await readJsonl(chunksFile);
  const miniJson = await readJson(miniSearchFile, null);
  const mini = miniJson ? MiniSearch.loadJSON(miniJson, searchOptions) : createMiniSearch();
  const chunkMap = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  return { mini, chunkMap, dirty };
}

async function searchIndex({ query, top_k = 5 }) {
  const { mini, chunkMap } = await loadIndex();
  return {
    query,
    backend: 'bm25',
    results: mini.search(query, searchOptions.searchOptions).slice(0, top_k).map((result) => {
      const chunk = chunkMap.get(result.id);
      return {
        id: result.id,
        path: chunk?.path || result.path,
        heading_path: chunk?.heading_path || result.heading_path || 'Document',
        type: chunk?.type || result.type || 'memory',
        score: Number(result.score.toFixed(4)),
        snippet: String(chunk?.text || '').slice(0, 220),
        updated: chunk?.updated || result.updated || null,
      };
    }),
  };
}

async function readChunk(id) {
  const { chunkMap } = await loadIndex();
  return chunkMap.get(id) || null;
}

async function importLegacySessionJson() {
  const legacy = await readJson(sessionFile, null);
  if (!legacy || !legacy.task) return null;
  const current = activeSessionRow();
  if (current) return current;
  const started = await sessionStart({ task: legacy.task, force_new: true, agent: legacy.active_agent || 'main' });
  if (legacy.phase && phaseOrder.includes(legacy.phase) && legacy.phase !== 'init') {
    await sessionTransition({
      to_phase: legacy.phase,
      next_step: legacy.next_step || '',
      blocker: legacy.blockers || legacy.blocker || 'none',
    });
  }
  await updateSessionCompat({
    next_step: legacy.next_step || '',
    blockers: legacy.blockers || legacy.blocker || 'none',
    files_touched: legacy.files_touched || [],
    agents_used: legacy.agents_used || [],
    active_agent: legacy.active_agent || '',
  });
  return started.session;
}

async function migrate({ apply = false } = {}) {
  await ensureStaticFiles();
  const actions = [
    { action: 'create_state_db', to: rel(stateDbFile) },
    { action: 'install_hook_settings', to: rel(projectGeminiSettingsFile) },
    { action: 'render_current_and_session', to: `${rel(currentFile)}, ${rel(sessionFile)}` },
    { action: 'retain_existing_plans_reports_notes', to: '.kavion/plans, .kavion/reports, .kavion/notes' },
  ];
  if (!apply) {
    return { ok: true, mode: 'dry-run', actions };
  }
  await ensureWorkspaceInitialized();
  await installGeminiHookSettings();
  await importLegacySessionJson();
  await renderSessionViews();
  await touchDirtyIndex();
  await buildIndex();
  return { ok: true, mode: 'applied', actions };
}

function extractUserText(input) {
  if (typeof input?.prompt === 'string') return input.prompt;
  if (typeof input?.user_prompt === 'string') return input.user_prompt;
  if (Array.isArray(input?.llm_request?.messages)) {
    const lastUser = [...input.llm_request.messages].reverse().find((message) => message?.role === 'user');
    const content = lastUser?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map((part) => part?.text || '').join('\n');
  }
  return '';
}

function buildHotContext() {
  const session = activeSessionRow();
  if (!session) {
    return 'Kavion: no active session. Start one with kavion_session_start for non-trivial work.';
  }
  const events = recentEvents(session.session_id, 5);
  return [
    '## Kavion Session',
    `- Task: ${session.task}`,
    `- Class: ${session.task_class}`,
    `- Phase: ${session.phase}`,
    `- Status: ${session.status}`,
    `- Next step: ${session.next_step || ''}`,
    `- Blocker: ${session.blocker || 'none'}`,
    events.length ? `- Recent events: ${events.map((event) => event.kind).join(', ')}` : '- Recent events: none',
  ].join('\n');
}

async function handleSessionStartHook() {
  try {
    await ensureWorkspaceInitialized();
    await renderSessionViews();
    return {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: buildHotContext(),
      },
    };
  } catch (error) {
    await logWorker('session-start hook failed', { error: String(error?.message || error) });
    return fallbackHookError('session start unavailable');
  }
}

async function handleBeforeAgentHook(input) {
  try {
    await ensureWorkspaceInitialized();
    const prompt = extractUserText(input);
    const session = activeSessionRow();
    const planRequired = session && session.task_class === 'medium' && session.phase === 'code' && !(await hasPlanArtifact(session.session_id));
    if (planRequired) {
      return {
        decision: 'deny',
        reason: 'Kavion policy: code phase requires a plan artifact for medium tasks.',
        systemMessage: 'Create a plan with kavion_plan_create, then retry.',
      };
    }
    const additionalContext = buildHotContext();
    if (!session && prompt && classifyTask(prompt) !== 'trivial') {
      return {
        hookSpecificOutput: {
          hookEventName: 'BeforeAgent',
          additionalContext: `${additionalContext}\n\nKavion policy: start a session with kavion_session_start before substantial work.`,
        },
      };
    }
    return {
      hookSpecificOutput: {
        hookEventName: 'BeforeAgent',
        additionalContext,
      },
    };
  } catch (error) {
    await logWorker('before-agent hook failed', { error: String(error?.message || error) });
    return fallbackHookError('before-agent unavailable');
  }
}

function toolTouchedPath(toolInput = {}) {
  const candidates = [
    toolInput.path,
    toolInput.file_path,
    toolInput.filePath,
    toolInput.target_file,
    toolInput.absolute_path,
    toolInput.old_file_path,
    toolInput.new_file_path,
  ]
    .filter(Boolean)
    .map((value) => String(value));
  const match = candidates.find(Boolean);
  if (!match) return null;
  if (path.isAbsolute(match)) return rel(match);
  return match.replace(/\\/g, '/');
}

async function handleAfterToolHook(input) {
  try {
    await ensureWorkspaceInitialized();
    const session = activeSessionRow();
    if (!session) return {};
    const toolName = input?.tool_name || input?.toolName || 'unknown_tool';
    const payload = {
      tool_name: toolName,
      tool_input: input?.tool_input || {},
      tool_output_summary: typeof input?.tool_output === 'string' ? input.tool_output.slice(0, 400) : '',
    };
    tx(() => {
      appendEvent(session.session_id, 'tool_call', payload, { source: 'hook', agent: 'main' });
      const touched = toolTouchedPath(input?.tool_input || {});
      if (touched && !touched.startsWith('.kavion/index/')) {
        appendEvent(session.session_id, 'file_touched', { path: touched }, { source: 'hook', agent: 'main' });
      }
    });
    await renderSessionViews();
    await touchDirtyIndex();
    return {};
  } catch (error) {
    await logWorker('after-tool hook failed', { error: String(error?.message || error) });
    await recordFallbackEvent('after_tool_failure', { error: String(error?.message || error) });
    return {};
  }
}

async function runHook(eventName) {
  const stdin = await new Promise((resolve) => {
    const chunks = [];
    process.stdin.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
  const input = parseJson(stdin || '{}', {});

  if (eventName === 'session-start') return handleSessionStartHook(input);
  if (eventName === 'before-agent') return handleBeforeAgentHook(input);
  if (eventName === 'after-tool') return handleAfterToolHook(input);

  return {};
}

async function startMcpServer() {
  await ensureWorkspaceInitialized();
  const server = new McpServer({
    name: 'kavion-worker',
    version: serverVersion,
  });

  server.registerTool(
    'kavion_initialize_workspace',
    {
      description: 'Create the Kavion workspace state, rendered views, and Gemini hook settings.',
      inputSchema: z.object({}).shape,
    },
    async () => text(await initializeWorkspace()),
  );

  server.registerTool(
    'kavion_session_start',
    {
      description: 'Start or resume a Kavion session backed by SQLite state.',
      inputSchema: z.object({
        task: z.string().default(''),
        agent: z.string().default('main'),
        force_new: z.boolean().default(false),
      }).shape,
    },
    async (payload) => text(await sessionStart(payload)),
  );

  server.registerTool(
    'kavion_session_transition',
    {
      description: 'Transition the active Kavion session to a new phase.',
      inputSchema: z.object({
        to_phase: z.enum(['init', 'plan', 'code', 'test', 'review', 'ship', 'closed']),
        next_step: z.string().default(''),
        blocker: z.string().default(''),
      }).shape,
    },
    async (payload) => text(await sessionTransition(payload)),
  );

  server.registerTool(
    'kavion_plan_create',
    {
      description: 'Create a plan artifact for the active session and persist it in SQLite + markdown.',
      inputSchema: z.object({
        slug: z.string().optional(),
        title: z.string().default(''),
        goal: z.string().default(''),
        acceptance_criteria: z.array(z.string()).default([]),
        steps: z.array(z.string()).default([]),
        files: z.array(z.string()).default([]),
        risks: z.array(z.string()).default([]),
      }).shape,
    },
    async (payload) => text(await planCreate(payload)),
  );

  server.registerTool(
    'kavion_report_create',
    {
      description: 'Create a report artifact for the active session and persist it in SQLite + markdown.',
      inputSchema: z.object({
        kind: z.enum(['report:qa', 'report:review', 'report:security']),
        title: z.string().default(''),
        result: z.string().default(''),
        summary: z.string().default(''),
        evidence: z.array(z.string()).default([]),
        files: z.array(z.string()).default([]),
        commands: z.array(z.string()).default([]),
        issues: z.array(z.string()).default([]),
        verified: z.array(z.string()).default([]),
      }).shape,
    },
    async (payload) => text(await reportCreate(payload)),
  );

  server.registerTool(
    'kavion_status',
    {
      description: 'Return the current Kavion worker-backed session, git, and memory status.',
      inputSchema: z.object({}).shape,
    },
    async () => text(await getStatus()),
  );

  server.registerTool(
    'kavion_gate',
    {
      description: 'Run a Kavion gate using worker-managed state and real commands.',
      inputSchema: z.object({
        name: z.enum(['status', 'plan', 'test', 'review', 'security', 'ship']),
      }).shape,
    },
    async ({ name }) => text(await runGate(name)),
  );

  server.registerTool(
    'kavion_search',
    {
      description: 'Search Kavion memory using the local BM25 index.',
      inputSchema: z.object({
        query: z.string(),
        top_k: z.number().int().min(1).max(10).default(5),
      }).shape,
    },
    async ({ query, top_k }) => text(await searchIndex({ query, top_k })),
  );

  server.registerTool(
    'kavion_read_chunk',
    {
      description: 'Read a specific indexed memory chunk by chunk id.',
      inputSchema: z.object({ id: z.string() }).shape,
    },
    async ({ id }) => text(await readChunk(id)),
  );

  server.registerTool(
    'kavion_migrate',
    {
      description: 'Preview or apply migration from file-first Kavion state into worker-backed SQLite state.',
      inputSchema: z.object({ apply: z.boolean().default(false) }).shape,
    },
    async ({ apply }) => text(await migrate({ apply })),
  );

  server.registerTool(
    'kavion_write_note',
    {
      description: 'Write a research/debug note under .kavion/notes and register it as an artifact when a session exists.',
      inputSchema: z.object({
        slug: z.string().optional(),
        content: z.string(),
        persistent: z.boolean().default(false),
      }).shape,
    },
    async (payload) => text(await writeNote(payload)),
  );

  server.registerTool(
    'kavion_build_index',
    {
      description: 'Rebuild the local BM25 search index.',
      inputSchema: z.object({}).shape,
    },
    async () => text(await buildIndex()),
  );

  server.registerTool(
    'kavion_memory_gc',
    {
      description: 'Prune expired notes and report oversized authored memory files.',
      inputSchema: z.object({ delete_expired: z.boolean().default(true) }).shape,
    },
    async ({ delete_expired }) => text(await memoryGc({ delete_expired })),
  );

  server.registerTool(
    'kavion_archive_session',
    {
      description: 'Close the active session and render a history view.',
      inputSchema: z.object({ reason: z.string().default('completed') }).shape,
    },
    async ({ reason }) => text(await closeActiveSession(reason)),
  );

  server.registerTool(
    'kavion_update_session',
    {
      description: 'Compatibility wrapper around the worker-backed session API.',
      inputSchema: z.object({
        task: z.string().optional(),
        phase: z.string().optional(),
        status: z.string().optional(),
        active_agent: z.string().optional(),
        blockers: z.string().optional(),
        blocker: z.string().optional(),
        next_step: z.string().optional(),
        files_touched: z.array(z.string()).default([]),
        agents_used: z.array(z.string()).default([]),
      }).shape,
    },
    async (payload) => text(await updateSessionCompat(payload)),
  );

  server.registerTool(
    'kavion_update_current',
    {
      description: 'Compatibility wrapper that updates session metadata and re-renders CURRENT.md.',
      inputSchema: z.object({
        active_task: z.string().default(''),
        status: z.string().default(''),
        next_step: z.string().default(''),
        blockers: z.string().default('none'),
        summary: z.string().default(''),
      }).shape,
    },
    async ({ active_task, status, next_step, blockers }) => {
      const session = activeSessionRow();
      if (!session && active_task) {
        await sessionStart({ task: active_task });
      }
      const result = await updateSessionCompat({
        task: active_task || undefined,
        status: status || undefined,
        next_step: next_step || undefined,
        blockers: blockers || undefined,
      });
      return text(result);
    },
  );

  server.registerTool(
    'kavion_write_plan',
    {
      description: 'Compatibility wrapper around kavion_plan_create.',
      inputSchema: z.object({
        slug: z.string().optional(),
        title: z.string().default(''),
        goal: z.string().default(''),
        acceptance_criteria: z.array(z.string()).default([]),
        steps: z.array(z.string()).default([]),
        files: z.array(z.string()).default([]),
        risks: z.array(z.string()).default([]),
      }).shape,
    },
    async (payload) => text(await planCreate(payload)),
  );

  server.registerTool(
    'kavion_write_report',
    {
      description: 'Compatibility wrapper around kavion_report_create.',
      inputSchema: z.object({
        slug: z.string().optional(),
        kind: z.string(),
        title: z.string().default(''),
        result: z.string().default(''),
        summary: z.string().default(''),
        evidence: z.array(z.string()).default([]),
        files: z.array(z.string()).default([]),
        commands: z.array(z.string()).default([]),
        issues: z.array(z.string()).default([]),
        verified: z.array(z.string()).default([]),
      }).shape,
    },
    async ({ kind, ...rest }) => {
      const mappedKind = kind === 'qa' ? 'report:qa' : kind === 'review' ? 'report:review' : kind === 'security' ? 'report:security' : kind;
      return text(await reportCreate({ kind: mappedKind, ...rest }));
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const mode = process.argv[2] || 'mcp';

if (mode === 'hook') {
  const eventName = process.argv[3] || '';
  try {
    const response = await runHook(eventName);
    process.stdout.write(`${JSON.stringify(response || {})}\n`);
    process.exit(0);
  } catch (error) {
    await logWorker('hook dispatcher failed', { event: eventName, error: String(error?.message || error) });
    process.stdout.write(`${JSON.stringify(fallbackHookError('hook dispatcher failure'))}\n`);
    process.exit(0);
  }
} else {
  await startMcpServer();
}
