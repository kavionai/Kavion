import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import MiniSearch from 'minisearch';
import YAML from 'yaml';

const workspacePath = process.env.FORGEKIT_WORKSPACE_PATH || process.cwd();
const geminiRoot = path.join(workspacePath, '.gemini');
const forgeRoot = path.join(geminiRoot, 'forgekit');
const indexRoot = path.join(forgeRoot, 'index');
const notesRoot = path.join(forgeRoot, 'notes');
const plansRoot = path.join(forgeRoot, 'plans');
const reportsRoot = path.join(forgeRoot, 'reports');
const legacyContextRoot = path.join(geminiRoot, 'context');
const legacyArchiveRoot = path.join(geminiRoot, 'archive');
const legacySessionsRoot = path.join(forgeRoot, 'sessions');
const legacyMemoryRoot = path.join(forgeRoot, 'memory');

const projectFile = path.join(forgeRoot, 'PROJECT.md');
const decisionsFile = path.join(forgeRoot, 'DECISIONS.md');
const decisionsArchiveFile = path.join(forgeRoot, 'DECISIONS-archive.md');
const currentFile = path.join(forgeRoot, 'CURRENT.md');
const sessionFile = path.join(forgeRoot, 'session.json');
const historyFile = path.join(forgeRoot, 'history.jsonl');
const gatesFile = path.join(forgeRoot, 'gates.yaml');
const chunksFile = path.join(indexRoot, 'chunks.jsonl');
const miniSearchFile = path.join(indexRoot, 'bm25.json');
const dirtyFile = path.join(indexRoot, '.dirty');

const serverVersion = '0.5.0';
const maxProjectLines = 300;
const maxCurrentLines = 50;
const maxDecisionEntries = 200;
const maxNoteWords = 2000;
const minNoteWords = 100;
const noteTtlDays = 14;

const searchOptions = {
  fields: ['text', 'heading_path'],
  storeFields: ['path', 'heading_path', 'type', 'updated', 'tokens'],
  searchOptions: {
    boost: { heading_path: 2 },
    fuzzy: 0.2,
    prefix: true,
  },
};

const defaultGateConfig = {
  test: {
    command: null,
    coverage_file: null,
    coverage_threshold: 0,
  },
  review: {
    required_sections: ['Issues', 'Verified'],
  },
  security: {
    trigger_paths: ['src/auth/**', 'src/crypto/**', '**/Dockerfile', 'package.json'],
    command: null,
  },
  ship: {
    default_branch: 'main',
  },
};

function rel(filePath) {
  return path.relative(workspacePath, filePath).replace(/\\/g, '/');
}

function rootRel(filePath) {
  return path.relative(geminiRoot, filePath).replace(/\\/g, '/');
}

function isoNow() {
  return new Date().toISOString();
}

function sha1(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'task';
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function lines(value) {
  return normalizeWhitespace(value).split('\n').filter(Boolean);
}

function wordCount(value) {
  return normalizeWhitespace(value).split(/\s+/).filter(Boolean).length;
}

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9_./:-]+/g)
    .filter((token) => token.length > 1);
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function truthy(value) {
  return value === true || /^true$/i.test(String(value || '').trim());
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirs() {
  await fs.mkdir(forgeRoot, { recursive: true });
  await fs.mkdir(indexRoot, { recursive: true });
  await fs.mkdir(notesRoot, { recursive: true });
  await fs.mkdir(plansRoot, { recursive: true });
  await fs.mkdir(reportsRoot, { recursive: true });
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

async function appendJsonl(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}

async function removeIfExists(filePath) {
  try {
    await fs.rm(filePath, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function createMiniSearch() {
  return new MiniSearch(searchOptions);
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
- Commands live in the repo, not here.
- Keep this file short and update only when repo-wide truths change.
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

function defaultSession() {
  return {
    task: '',
    slug: '',
    workflow: 'standard',
    phase: 'idle',
    status: 'idle',
    active_agent: '',
    blockers: 'none',
    next_step: '',
    verification: '',
    files_touched: [],
    agents_used: [],
    gate_cache: {},
    started_at: isoNow(),
    last_update: isoNow(),
    updated_at: isoNow(),
  };
}

function defaultGatesConfig() {
  return structuredClone(defaultGateConfig);
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

async function ensureInitialFiles() {
  await ensureDirs();

  if (!(await exists(projectFile))) await writeTextAtomic(projectFile, defaultProjectContent());
  if (!(await exists(decisionsFile))) await writeTextAtomic(decisionsFile, defaultDecisionsContent());
  if (!(await exists(decisionsArchiveFile))) await writeTextAtomic(decisionsArchiveFile, '# Decisions Archive\n\n');
  if (!(await exists(currentFile))) await writeTextAtomic(currentFile, defaultCurrentContent());
  if (!(await exists(sessionFile))) await writeJsonAtomic(sessionFile, defaultSession());
  if (!(await exists(historyFile))) await writeTextAtomic(historyFile, '');

  if (!(await exists(gatesFile))) {
    const config = defaultGatesConfig();
    config.test.command = await detectTestCommand();
    config.security.command = await detectSecurityCommand();
    await writeTextAtomic(gatesFile, YAML.stringify(config));
  }
}

async function touchDirtyIndex() {
  await ensureDirs();
  await writeTextAtomic(dirtyFile, `${isoNow()}\n`);
}

function splitLongChunk(text, maxChars = 1500) {
  const paragraphs = normalizeWhitespace(text).split('\n\n').filter(Boolean);
  const result = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }
    if ((current.length + 2 + paragraph.length) <= maxChars) {
      current = `${current}\n\n${paragraph}`;
      continue;
    }
    result.push(current);
    current = paragraph;
  }

  if (current) result.push(current);
  return result.length ? result : [normalizeWhitespace(text)];
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
    for (const part of splitLongChunk(text)) {
      chunks.push({ heading_path: headingPath, text: part });
    }
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

function inferType(filePath) {
  const relative = rootRel(filePath);
  if (relative === 'forgekit/PROJECT.md') return 'project';
  if (relative === 'forgekit/DECISIONS.md' || relative === 'forgekit/DECISIONS-archive.md') return 'decisions';
  if (relative === 'forgekit/CURRENT.md') return 'current';
  if (relative === 'forgekit/session.json' || relative === 'forgekit/history.jsonl') return 'session';
  if (relative.startsWith('forgekit/plans/')) return 'plan';
  if (relative.startsWith('forgekit/reports/')) return 'report';
  if (relative.startsWith('forgekit/notes/')) return 'note';
  if (relative.startsWith('context/')) return 'legacy-context';
  if (relative.startsWith('archive/')) return 'legacy-archive';
  if (relative.includes('/sessions/')) return 'legacy-session';
  return 'memory';
}

function shouldIndex(filePath) {
  const relative = rootRel(filePath);
  if (relative.startsWith('forgekit/index/')) return false;
  if (relative.startsWith('forgekit/node_modules/')) return false;
  if (path.basename(filePath).startsWith('.env')) return false;
  return filePath.endsWith('.md') || filePath.endsWith('.json') || filePath.endsWith('.jsonl');
}

async function walk(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const child = path.join(dirPath, entry.name);
      if (entry.isDirectory()) files.push(...(await walk(child)));
      if (entry.isFile() && shouldIndex(child)) files.push(child);
    }
    return files;
  } catch {
    return [];
  }
}

async function collectMemoryFiles() {
  const files = [
    projectFile,
    decisionsFile,
    decisionsArchiveFile,
    currentFile,
    sessionFile,
    historyFile,
    gatesFile,
    ...(await walk(plansRoot)),
    ...(await walk(reportsRoot)),
    ...(await walk(notesRoot)),
  ];

  // Backward compatibility during migration.
  if (await exists(legacyContextRoot)) files.push(...(await walk(legacyContextRoot)));
  if (await exists(legacyArchiveRoot)) files.push(...(await walk(legacyArchiveRoot)));
  if (await exists(legacySessionsRoot)) files.push(...(await walk(legacySessionsRoot)));

  return uniq(files).sort();
}

async function readChunkableContent(filePath) {
  if (filePath.endsWith('.json')) {
    return JSON.stringify(await readJson(filePath, {}), null, 2);
  }
  if (filePath.endsWith('.jsonl')) {
    return (await readJsonl(filePath)).map((item) => JSON.stringify(item, null, 2)).join('\n\n');
  }
  return readText(filePath);
}

async function buildIndex() {
  await ensureInitialFiles();
  const files = await collectMemoryFiles();
  const index = createMiniSearch();
  const chunks = [];

  for (const filePath of files) {
    const content = await readChunkableContent(filePath);
    const stat = await fs.stat(filePath).catch(() => null);
    if (!normalizeWhitespace(content)) continue;

    for (const chunk of markdownChunks(content)) {
      if (!normalizeWhitespace(chunk.text)) continue;
      const record = {
        id: sha1(`${rel(filePath)}:${chunk.heading_path}:${chunk.text}`).slice(0, 8),
        path: rootRel(filePath),
        heading_path: chunk.heading_path,
        text: chunk.text,
        tokens: tokenize(chunk.text).length,
        updated: stat?.mtime?.toISOString() || isoNow(),
        type: inferType(filePath),
      };
      chunks.push(record);
    }
  }

  index.addAll(chunks);
  await writeTextAtomic(chunksFile, chunks.map((chunk) => JSON.stringify(chunk)).join('\n') + (chunks.length ? '\n' : ''));
  await writeJsonAtomic(miniSearchFile, index.toJSON());
  await removeIfExists(dirtyFile);

  return {
    ok: true,
    root: rel(indexRoot),
    files: files.length,
    chunks: chunks.length,
    backend: 'bm25',
    dirty: false,
  };
}

async function loadIndex() {
  const missing = !(await exists(chunksFile)) || !(await exists(miniSearchFile));
  const dirty = await exists(dirtyFile);
  if (missing || dirty) {
    await buildIndex();
  }

  const chunks = await readJsonl(chunksFile);
  const miniSearchJson = await readJson(miniSearchFile, null);
  const index = miniSearchJson ? MiniSearch.loadJSON(miniSearchJson, searchOptions) : createMiniSearch();
  const chunkMap = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  return { chunks, chunkMap, index, dirty: Boolean(dirty) };
}

async function searchIndex({ query, top_k = 5 }) {
  const { chunkMap, index } = await loadIndex();
  const results = index.search(query, searchOptions.searchOptions).slice(0, top_k).map((result) => {
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
  });

  return {
    query,
    backend: 'bm25',
    results,
  };
}

async function readChunk(id) {
  const { chunkMap } = await loadIndex();
  return chunkMap.get(id) || null;
}

async function getSession() {
  await ensureInitialFiles();
  const session = await readJson(sessionFile, null);
  return session && typeof session === 'object' ? { ...defaultSession(), ...session } : defaultSession();
}

async function writeSession(patch) {
  const current = await getSession();
  const next = {
    ...current,
    ...patch,
    files_touched: uniq([...(current.files_touched || []), ...((patch.files_touched || []).filter(Boolean))]),
    agents_used: uniq([...(current.agents_used || []), ...((patch.agents_used || []).filter(Boolean))]),
    gate_cache: { ...(current.gate_cache || {}), ...(patch.gate_cache || {}) },
    started_at: current.started_at || patch.started_at || isoNow(),
    last_update: isoNow(),
    updated_at: isoNow(),
  };
  await writeJsonAtomic(sessionFile, next);
  await touchDirtyIndex();
  return next;
}

async function writeCurrent({
  active_task = '',
  status = '',
  next_step = '',
  blockers = 'none',
  summary = '',
} = {}) {
  await ensureInitialFiles();

  const body = `# Current Work

- Active task: ${active_task || 'none'}
- Status: ${status || 'idle'}
- Next step: ${next_step || ''}
- Blockers: ${blockers || 'none'}
${summary ? `\n## Summary\n${normalizeWhitespace(summary)}\n` : ''}`;

  const trimmed = lines(body).slice(0, maxCurrentLines).join('\n');
  await writeTextAtomic(currentFile, `${trimmed}\n`);
  await touchDirtyIndex();
  return { ok: true, file: rel(currentFile) };
}

function bulletList(items) {
  return (items || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join('\n');
}

async function writePlan({
  slug,
  title = '',
  goal = '',
  acceptance_criteria = [],
  steps = [],
  files = [],
  risks = [],
} = {}) {
  await ensureDirs();
  const safeSlug = slugify(slug || title || goal);
  const filePath = path.join(plansRoot, `plan-${safeSlug}.md`);
  const body = `# Plan: ${title || safeSlug}

## Goal
${normalizeWhitespace(goal) || 'TBD'}

## Acceptance Criteria
${bulletList(acceptance_criteria) || '- TBD'}

## Steps
${steps.length ? steps.map((step, index) => `${index + 1}. ${String(step).trim()}`).join('\n') : '1. Inspect the relevant code.\n2. Implement the change.\n3. Verify the result.'}

## Files
${bulletList(files) || '- TBD'}

## Risks
${bulletList(risks) || '- none'}
`;
  await writeTextAtomic(filePath, `${body.trim()}\n`);
  await touchDirtyIndex();
  return { ok: true, file: rel(filePath), slug: safeSlug };
}

async function writeStructuredReport({
  slug,
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
  await ensureDirs();
  const safeSlug = slugify(slug || title || kind);
  const safeKind = slugify(kind || 'report');
  const filePath = path.join(reportsRoot, `${safeSlug}-${safeKind}.md`);
  const body = `# Report: ${title || `${safeSlug} - ${safeKind}`}

**Timestamp:** ${isoNow()}
**Result:** ${result || 'unknown'}

## Summary
${normalizeWhitespace(summary) || 'No summary provided.'}

## Evidence
${bulletList(evidence) || '- none'}

## Files
${bulletList(files) || '- none'}

## Commands
${bulletList(commands) || '- none'}

## Issues
${bulletList(issues) || '- none'}

## Verified
${bulletList(verified) || '- none'}
`;
  await writeTextAtomic(filePath, `${body.trim()}\n`);
  await touchDirtyIndex();
  return { ok: true, file: rel(filePath), slug: safeSlug, kind: safeKind };
}

async function archiveSession(reason = 'completed') {
  const session = await getSession();
  if (!session.task && !session.slug) {
    return { ok: false, reason: 'No active session to archive.' };
  }

  await appendJsonl(historyFile, {
    ...session,
    archived_at: isoNow(),
    archive_reason: reason,
  });
  await writeJsonAtomic(sessionFile, defaultSession());
  await touchDirtyIndex();

  return {
    ok: true,
    archived: {
      task: session.task,
      slug: session.slug,
      reason,
    },
    history_file: rel(historyFile),
  };
}

function parseLegacyField(content, label) {
  return content.match(new RegExp(`^${label}:\\s*(.*)$`, 'im'))?.[1]?.trim() || '';
}

async function parseLegacySessions(dirPath) {
  const names = await fs.readdir(dirPath).catch(() => []);
  const sessions = [];
  for (const name of names.filter((item) => item.endsWith('.md')).sort()) {
    const filePath = path.join(dirPath, name);
    const content = await readText(filePath);
    const stat = await fs.stat(filePath).catch(() => null);
    sessions.push({
      task: parseLegacyField(content, 'Task'),
      slug: name.replace(/\.md$/, ''),
      workflow: parseLegacyField(content, 'Workflow') || 'standard',
      phase: parseLegacyField(content, 'Current phase') || 'unknown',
      status: parseLegacyField(content, 'Status') || 'unknown',
      blockers: parseLegacyField(content, 'Blockers') || 'none',
      next_step: parseLegacyField(content, 'Next step'),
      verification: parseLegacyField(content, 'Verification'),
      agents_used: parseLegacyField(content, 'Agents used')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      files_touched: parseLegacyField(content, 'Files touched')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      updated_at: parseLegacyField(content, 'Last updated') || stat?.mtime?.toISOString() || isoNow(),
      legacy_file: rel(filePath),
    });
  }
  return sessions;
}

function mergeLegacySections(sections) {
  const seen = new Set();
  const output = [];
  for (const [title, content] of sections) {
    const normalized = normalizeWhitespace(content);
    if (!normalized) continue;

    const paragraphs = normalized.split('\n\n').filter(Boolean);
    const uniqueParagraphs = [];
    for (const paragraph of paragraphs) {
      const hash = sha256(paragraph.trim());
      if (seen.has(hash)) continue;
      seen.add(hash);
      uniqueParagraphs.push(paragraph.trim());
    }
    if (!uniqueParagraphs.length) continue;
    output.push(`## ${title}\n${uniqueParagraphs.join('\n\n')}`);
  }
  return output.join('\n\n').trim();
}

async function migrate({ apply = false } = {}) {
  await ensureInitialFiles();

  const actions = [];
  const legacyProjectBrief = await readText(path.join(legacyContextRoot, 'project-brief.md'));
  const legacyArchitecture = await readText(path.join(legacyContextRoot, 'architecture.md'));
  const legacyCommands = await readText(path.join(legacyContextRoot, 'commands.md'));
  const legacyTesting = await readText(path.join(legacyContextRoot, 'testing.md'));
  const legacyCurrent = await readText(path.join(legacyContextRoot, 'current-work.md'));
  const legacyDecisions = await readText(path.join(legacyContextRoot, 'decisions.md'));
  const legacyGithub = await readText(path.join(legacyContextRoot, 'github.md'));

  const mergedProject = `# Project\n\n${mergeLegacySections([
    ['Brief', legacyProjectBrief],
    ['Architecture', legacyArchitecture],
    ['Commands', legacyCommands],
    ['Testing', legacyTesting],
    ['GitHub', legacyGithub],
  ])}\n`;

  const currentLines = lines(legacyCurrent);
  const currentContent = currentLines.length ? `# Current Work\n\n${currentLines.map((line) => (line.startsWith('-') ? line : `- ${line}`)).join('\n')}\n` : defaultCurrentContent();

  const activeLegacy = await parseLegacySessions(path.join(legacySessionsRoot, 'active'));
  const archivedLegacy = await parseLegacySessions(path.join(legacySessionsRoot, 'archive'));
  const sortedActive = [...activeLegacy].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  const activeSession = sortedActive[0] || null;

  actions.push(
    { action: 'merge_project', from: '.gemini/context/*', to: rel(projectFile) },
    { action: 'convert_current', from: '.gemini/context/current-work.md', to: rel(currentFile) },
    { action: 'convert_decisions', from: '.gemini/context/decisions.md', to: rel(decisionsFile) },
    { action: 'convert_sessions', from: '.gemini/forgekit/sessions/', to: `${rel(sessionFile)} + ${rel(historyFile)}` },
    { action: 'replace_index', from: '.gemini/forgekit/memory/', to: rel(indexRoot) },
  );

  if (!apply) {
    return {
      ok: true,
      mode: 'dry-run',
      actions,
      active_session: activeSession,
    };
  }

  await writeTextAtomic(projectFile, `${lines(mergedProject).slice(0, maxProjectLines).join('\n')}\n`);
  if (normalizeWhitespace(legacyDecisions)) {
    await writeTextAtomic(decisionsFile, `# Decisions\n\n${normalizeWhitespace(legacyDecisions)}\n`);
  }
  await writeTextAtomic(currentFile, currentContent);

  if (activeSession) {
    await writeJsonAtomic(sessionFile, {
      ...defaultSession(),
      ...activeSession,
      gate_cache: {},
    });
  }
  for (const session of [...archivedLegacy, ...sortedActive.slice(1)]) {
    await appendJsonl(historyFile, { ...session, archived_at: isoNow(), archive_reason: 'migration' });
  }

  await removeIfExists(legacyArchiveRoot);
  await removeIfExists(legacyMemoryRoot);
  await removeIfExists(legacySessionsRoot);
  await buildIndex();

  return {
    ok: true,
    mode: 'applied',
    actions,
    active_session: activeSession,
  };
}

async function readGateConfig() {
  await ensureInitialFiles();
  const raw = await readText(gatesFile);
  try {
    const parsed = YAML.parse(raw) || {};
    return {
      ...defaultGatesConfig(),
      ...parsed,
      review: {
        ...defaultGateConfig.review,
        ...(parsed.review || {}),
      },
      test: {
        ...defaultGateConfig.test,
        ...(parsed.test || {}),
      },
      security: {
        ...defaultGateConfig.security,
        ...(parsed.security || {}),
      },
      ship: {
        ...defaultGateConfig.ship,
        ...(parsed.ship || {}),
      },
    };
  } catch {
    return defaultGatesConfig();
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

async function gitHead() {
  const result = await runShell('git rev-parse HEAD');
  return result.exit_code === 0 ? result.stdout.trim() : null;
}

async function gitBranch() {
  const result = await runShell('git branch --show-current');
  return result.exit_code === 0 ? result.stdout.trim() : null;
}

async function gitStatusPorcelain() {
  const result = await runShell('git status --porcelain');
  return result.exit_code === 0 ? result.stdout : '';
}

async function changedFiles() {
  const result = await runShell('git status --porcelain');
  if (result.exit_code !== 0 || !result.stdout) return [];
  return result.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

function globToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function matchesAnyPattern(filePath, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(filePath));
}

async function latestMtime(filePaths) {
  let latest = 0;
  for (const filePath of filePaths) {
    const absolutePath = path.join(workspacePath, filePath);
    const stat = await fs.stat(absolutePath).catch(() => null);
    if (stat?.mtimeMs && stat.mtimeMs > latest) latest = stat.mtimeMs;
  }
  return latest;
}

function coveragePercent(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.total?.lines?.pct != null) return Number(payload.total.lines.pct);

  const entries = Object.values(payload)
    .map((item) => item?.lines?.pct)
    .filter((value) => typeof value === 'number');
  if (!entries.length) return null;
  return Number((entries.reduce((sum, value) => sum + value, 0) / entries.length).toFixed(2));
}

async function readCoverage(filePath) {
  if (!filePath) return null;
  const payload = await readJson(path.join(workspacePath, filePath), null);
  return coveragePercent(payload);
}

async function findPlanFile(slug) {
  const preferred = path.join(plansRoot, `plan-${slug}.md`);
  if (await exists(preferred)) return preferred;
  const names = await fs.readdir(plansRoot).catch(() => []);
  if (names.length === 1) return path.join(plansRoot, names[0]);
  return null;
}

async function findReportFile(slug, gateName) {
  const preferred = path.join(reportsRoot, `${slug}-${gateName}.md`);
  if (await exists(preferred)) return preferred;
  return null;
}

function extractRepoPaths(content) {
  const matches = String(content || '').match(/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+/g) || [];
  return uniq(matches);
}

async function existingRepoPaths(pathsToCheck) {
  const found = [];
  for (const candidate of pathsToCheck) {
    const absolutePath = path.join(workspacePath, candidate);
    if (await exists(absolutePath)) found.push(candidate);
  }
  return found;
}

function reportFrontmatter(label, value) {
  return `**${label}:** ${value}`;
}

async function writeGateReport(slug, gateName, result) {
  await ensureDirs();
  const filePath = path.join(reportsRoot, `${slug}-${gateName}.md`);
  const commandBlock = result.command
    ? `${reportFrontmatter('Command', `\`${result.command.command}\``)}
${reportFrontmatter('Exit code', result.command.exit_code)}
${reportFrontmatter('Duration', `${result.command.duration_ms}ms`)}`
    : '';

  const outputExcerpt = result.command
    ? [result.command.stdout, result.command.stderr]
        .filter(Boolean)
        .join('\n')
        .slice(0, 2400)
    : (result.evidence || '').slice(0, 2400);

  const body = `# Report: ${slug} - ${gateName}

${reportFrontmatter('Timestamp', isoNow())}
${reportFrontmatter('Git HEAD', (await gitHead()) || 'unknown')}
${commandBlock ? `\n${commandBlock}` : ''}
${result.coverage != null ? `\n${reportFrontmatter('Coverage', `${result.coverage}%`)}` : ''}

## Result: ${String(result.result || result.status || 'unknown').toUpperCase()}

## Evidence
${result.evidence || 'No additional evidence.'}

## Output excerpt
\`\`\`
${outputExcerpt || '(none)'}
\`\`\`
`;

  await writeTextAtomic(filePath, body);
  await touchDirtyIndex();
  return rel(filePath);
}

async function gatePlan(session, config, { write_report = false } = {}) {
  const slug = session.slug || slugify(session.task);
  const filePath = await findPlanFile(slug);
  if (!filePath) {
    const result = {
      gate: 'plan',
      status: 'block',
      result: 'block',
      evidence: 'No plan file found for the active task.',
      next_step: `Create ${rel(path.join(plansRoot, `plan-${slug}.md`))}.`,
    };
    if (write_report) result.report_file = await writeGateReport(slug, 'plan', result);
    return result;
  }

  const content = await readText(filePath);
  const referenced = await existingRepoPaths(extractRepoPaths(content));
  const pass = referenced.length > 0;
  const result = {
    gate: 'plan',
    status: pass ? 'pass' : 'risk',
    result: pass ? 'pass' : 'risk',
    file: rel(filePath),
    evidence: pass
      ? `Plan references real files: ${referenced.slice(0, 8).join(', ')}`
      : 'Plan exists but does not reference real repo files.',
    next_step: pass ? '' : 'Update the plan to reference actual files or modules.',
  };
  if (write_report) result.report_file = await writeGateReport(slug, 'plan', result);
  return result;
}

async function gateTest(session, config, { write_report = false, use_cache = true } = {}) {
  const slug = session.slug || slugify(session.task);
  const command = config.test?.command;
  const head = await gitHead();
  const cached = session.gate_cache?.test;

  if (use_cache && cached?.git_head && cached.git_head === head) {
    return {
      gate: 'test',
      status: cached.result,
      result: cached.result,
      evidence: `Using cached test result from ${cached.timestamp}.`,
      coverage: cached.coverage ?? null,
      cached: true,
    };
  }

  if (!command) {
    const result = {
      gate: 'test',
      status: 'risk',
      result: 'risk',
      evidence: 'No test command configured in gates.yaml.',
      next_step: 'Set test.command in .gemini/forgekit/gates.yaml.',
    };
    if (write_report) result.report_file = await writeGateReport(slug, 'test', result);
    return result;
  }

  const commandResult = await runShell(command);
  const coverage = await readCoverage(config.test?.coverage_file);
  const threshold = Number(config.test?.coverage_threshold || 0);
  const pass = commandResult.exit_code === 0 && (coverage == null || coverage >= threshold);
  const status = pass ? 'pass' : 'block';
  const result = {
    gate: 'test',
    status,
    result: status,
    command: commandResult,
    coverage,
    evidence:
      commandResult.exit_code === 0
        ? coverage != null && coverage < threshold
          ? `Tests passed but coverage ${coverage}% is below threshold ${threshold}%.`
          : 'Configured test command exited 0.'
        : 'Configured test command failed.',
    next_step: pass ? '' : 'Fix the failing test or update gates.yaml if the command is wrong.',
  };

  const nextSession = await writeSession({
    verification: pass ? `test gate passed via ${command}` : `test gate failed via ${command}`,
    gate_cache: {
      test: {
        result: status,
        git_head: head,
        timestamp: isoNow(),
        coverage,
      },
    },
  });
  Object.assign(session, nextSession);

  if (write_report) result.report_file = await writeGateReport(slug, 'test', result);
  return result;
}

async function gateReview(session, config, { write_report = false } = {}) {
  const slug = session.slug || slugify(session.task);
  const filePath = await findReportFile(slug, 'review');
  if (!filePath) {
    return {
      gate: 'review',
      status: 'block',
      result: 'block',
      evidence: 'No review report found.',
      next_step: `Write ${rel(path.join(reportsRoot, `${slug}-review.md`))}.`,
    };
  }

  const content = await readText(filePath);
  const requiredSections = config.review?.required_sections || [];
  const missingSections = requiredSections.filter((section) => !new RegExp(`^##\\s+${section}\\b`, 'im').test(content));
  const changed = await changedFiles();
  const latestChanged = await latestMtime(changed);
  const stat = await fs.stat(filePath).catch(() => null);
  const fresh = !latestChanged || (stat?.mtimeMs || 0) >= latestChanged;

  const status = missingSections.length ? 'block' : fresh ? 'pass' : 'risk';
  const result = {
    gate: 'review',
    status,
    result: status,
    file: rel(filePath),
    evidence: missingSections.length
      ? `Missing review sections: ${missingSections.join(', ')}`
      : fresh
        ? 'Review report exists and is newer than current changed files.'
        : 'Review report is stale relative to current changes.',
    next_step: status === 'pass' ? '' : 'Refresh the review report after the latest code changes.',
  };
  if (write_report) result.report_file = await writeGateReport(slug, 'review-check', result);
  return result;
}

async function gateSecurity(session, config, { write_report = false } = {}) {
  const slug = session.slug || slugify(session.task);
  const changed = await changedFiles();
  const triggerPaths = config.security?.trigger_paths || [];
  const triggered = changed.some((filePath) => matchesAnyPattern(filePath, triggerPaths));
  if (!triggered) {
    return {
      gate: 'security',
      status: 'pass',
      result: 'pass',
      evidence: 'Security gate not triggered by current changed files.',
      skipped: true,
    };
  }

  const command = config.security?.command;
  if (!command) {
    const result = {
      gate: 'security',
      status: 'risk',
      result: 'risk',
      evidence: 'Security gate triggered, but no security command is configured.',
      next_step: 'Set security.command in .gemini/forgekit/gates.yaml.',
    };
    if (write_report) result.report_file = await writeGateReport(slug, 'security', result);
    return result;
  }

  const commandResult = await runShell(command);
  const status = commandResult.exit_code === 0 ? 'pass' : 'block';
  const result = {
    gate: 'security',
    status,
    result: status,
    command: commandResult,
    evidence: commandResult.exit_code === 0 ? 'Security command exited 0.' : 'Security command failed.',
    next_step: status === 'pass' ? '' : 'Address the security findings before shipping.',
  };
  if (write_report) result.report_file = await writeGateReport(slug, 'security', result);
  return result;
}

async function gateShip(session, config, options = {}) {
  const slug = session.slug || slugify(session.task);
  const plan = await gatePlan(session, config, { write_report: options.write_reports });
  const test = await gateTest(session, config, { write_report: options.write_reports, use_cache: true });
  const review = await gateReview(session, config, { write_report: false });
  const security = await gateSecurity(session, config, { write_report: options.write_reports });
  const branch = await gitBranch();
  const porcelain = await gitStatusPorcelain();
  const clean = !porcelain.trim();
  const defaultBranch = config.ship?.default_branch || 'main';

  let status = 'pass';
  const blockers = [];
  for (const gate of [plan, test, review, security]) {
    if (gate.result === 'block') blockers.push(`${gate.gate} blocked`);
    if (gate.result === 'risk' && status === 'pass') status = 'risk';
  }
  if (!clean) {
    blockers.push('git status not clean');
    status = 'block';
  }
  if (branch === defaultBranch) {
    blockers.push(`current branch is ${defaultBranch}`);
    status = 'block';
  }

  const result = {
    gate: 'ship',
    status,
    result: status,
    branch,
    clean,
    default_branch: defaultBranch,
    component_results: { plan, test, review, security },
    evidence: blockers.length ? blockers.join('; ') : 'All ship gates passed and git state is clean.',
    next_step: status === 'pass' ? 'Archive or open a PR.' : 'Resolve blocking ship gates.',
  };
  if (options.write_reports) result.report_file = await writeGateReport(slug, 'ship', result);
  return result;
}

async function runGate(name, options = {}) {
  const session = await getSession();
  const config = await readGateConfig();
  const normalized = String(name || 'status').toLowerCase();

  if (normalized === 'status') return getStatus();
  if (normalized === 'plan') return gatePlan(session, config, options);
  if (normalized === 'test') return gateTest(session, config, options);
  if (normalized === 'review') return gateReview(session, config, options);
  if (normalized === 'security') return gateSecurity(session, config, options);
  if (normalized === 'ship') return gateShip(session, config, options);

  return {
    gate: normalized,
    status: 'block',
    result: 'block',
    evidence: `Unknown gate: ${normalized}`,
    next_step: 'Use status, plan, test, review, security, or ship.',
  };
}

function legacyAuditDecision(statusResult) {
  if (statusResult.memory?.oversized?.length || statusResult.memory?.expired_notes?.length || statusResult.memory?.index_dirty) {
    return 'pass-with-risk';
  }
  return 'pass';
}

async function memoryGc({ delete_expired = true } = {}) {
  await ensureInitialFiles();
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
    if (ageDays > noteTtlDays && !truthy(parsed?.persistent)) {
      expired.push({ file: rel(filePath), age_days: Number(ageDays.toFixed(1)) });
      if (delete_expired) await fs.rm(filePath, { force: true });
    } else {
      kept.push({ file: rel(filePath), age_days: Number(ageDays.toFixed(1)) });
    }
  }

  const projectLineCount = lines(await readText(projectFile)).length;
  const currentLineCount = lines(await readText(currentFile)).length;
  const decisionsContent = await readText(decisionsFile);
  const decisionEntries = (decisionsContent.match(/^##\s+/gm) || []).length;

  const oversized = [];
  if (projectLineCount > maxProjectLines) oversized.push({ file: rel(projectFile), lines: projectLineCount, max: maxProjectLines });
  if (currentLineCount > maxCurrentLines) oversized.push({ file: rel(currentFile), lines: currentLineCount, max: maxCurrentLines });
  if (decisionEntries > maxDecisionEntries) oversized.push({ file: rel(decisionsFile), entries: decisionEntries, max: maxDecisionEntries });

  if (delete_expired && expired.length) {
    await touchDirtyIndex();
    await buildIndex();
  }

  return {
    ok: true,
    expired_notes: expired,
    kept_notes: kept.slice(0, 20),
    oversized,
    deleted: Boolean(delete_expired),
  };
}

async function getStatus() {
  await ensureInitialFiles();
  const session = await getSession();
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
    session,
    memory: {
      index_root: rel(indexRoot),
      chunks_file: rel(chunksFile),
      bm25_file: rel(miniSearchFile),
      index_dirty: dirty,
      oversized: noteGc.oversized,
      expired_notes: noteGc.expired_notes,
    },
    latest_plans: latestPlanNames.slice(-5),
    latest_reports: latestReportNames.slice(-5),
    decision: legacyAuditDecision({
      memory: {
        oversized: noteGc.oversized,
        expired_notes: noteGc.expired_notes,
        index_dirty: dirty,
      },
    }),
    next_step: dirty ? '/forge gate status or /team:memory-index' : session.next_step || '',
  };
}

async function initializeWorkspace() {
  await ensureInitialFiles();
  await touchDirtyIndex();
  const built = await buildIndex();
  return {
    ok: true,
    root: rel(forgeRoot),
    files: [
      rel(projectFile),
      rel(decisionsFile),
      rel(decisionsArchiveFile),
      rel(currentFile),
      rel(sessionFile),
      rel(historyFile),
      rel(gatesFile),
      rel(notesRoot),
      rel(plansRoot),
      rel(reportsRoot),
      rel(indexRoot),
    ],
    index: built,
  };
}

async function writeNote({ slug, content, persistent = false } = {}) {
  const words = wordCount(content);
  if (words < minNoteWords || words > maxNoteWords) {
    return {
      ok: false,
      reason: `Notes must be between ${minNoteWords} and ${maxNoteWords} words.`,
      words,
    };
  }

  const safeSlug = slugify(slug || content.slice(0, 40));
  const stamp = isoNow().slice(0, 10);
  const filePath = path.join(notesRoot, `note-${stamp}-${safeSlug}.md`);
  const body = `---
persistent: ${persistent ? 'true' : 'false'}
created: ${isoNow()}
---

${normalizeWhitespace(content)}
`;

  await writeTextAtomic(filePath, body);
  await touchDirtyIndex();

  return {
    ok: true,
    file: rel(filePath),
    persistent,
    words,
  };
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

const server = new McpServer({
  name: 'forgekit-workflow',
  version: serverVersion,
});

server.registerTool(
  'forgekit_initialize_workspace',
  {
    description: 'Create the ForgeKit 2 workspace memory structure and build the local BM25 index.',
    inputSchema: z.object({}).shape,
  },
  async () => text(await initializeWorkspace()),
);

server.registerTool(
  'forgekit_update_session',
  {
    description: 'Create or update the live ForgeKit session.json file.',
    inputSchema: z
      .object({
        task: z.string().optional(),
        slug: z.string().optional(),
        workflow: z.enum(['express', 'standard']).optional(),
        phase: z.string().optional(),
        status: z.string().optional(),
        active_agent: z.string().optional(),
        blockers: z.string().optional(),
        next_step: z.string().optional(),
        verification: z.string().optional(),
        files_touched: z.array(z.string()).default([]),
        agents_used: z.array(z.string()).default([]),
      })
      .shape,
  },
  async (payload) => text(await writeSession(payload)),
);

server.registerTool(
  'forgekit_update_current',
  {
    description: 'Update the live CURRENT.md file for the active task.',
    inputSchema: z
      .object({
        active_task: z.string().default(''),
        status: z.string().default(''),
        next_step: z.string().default(''),
        blockers: z.string().default('none'),
        summary: z.string().default(''),
      })
      .shape,
  },
  async (payload) => text(await writeCurrent(payload)),
);

server.registerTool(
  'forgekit_write_plan',
  {
    description: 'Write or replace a structured plan file under .gemini/forgekit/plans/.',
    inputSchema: z
      .object({
        slug: z.string().optional(),
        title: z.string().default(''),
        goal: z.string().default(''),
        acceptance_criteria: z.array(z.string()).default([]),
        steps: z.array(z.string()).default([]),
        files: z.array(z.string()).default([]),
        risks: z.array(z.string()).default([]),
      })
      .shape,
  },
  async (payload) => text(await writePlan(payload)),
);

server.registerTool(
  'forgekit_write_report',
  {
    description: 'Write or replace a structured report file under .gemini/forgekit/reports/.',
    inputSchema: z
      .object({
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
      })
      .shape,
  },
  async (payload) => text(await writeStructuredReport(payload)),
);

server.registerTool(
  'forgekit_archive_session',
  {
    description: 'Archive the live session into history.jsonl and reset session.json.',
    inputSchema: z.object({ reason: z.string().default('completed') }).shape,
  },
  async ({ reason }) => text(await archiveSession(reason)),
);

server.registerTool(
  'forgekit_build_index',
  {
    description: 'Build or refresh the ForgeKit 2 chunks.jsonl and bm25.json index files.',
    inputSchema: z.object({}).shape,
  },
  async () => text(await buildIndex()),
);

server.registerTool(
  'forgekit_search',
  {
    description: 'Search ForgeKit project memory using the local BM25 index.',
    inputSchema: z
      .object({
        query: z.string(),
        top_k: z.number().int().min(1).max(10).default(5),
      })
      .shape,
  },
  async ({ query, top_k }) => text(await searchIndex({ query, top_k })),
);

server.registerTool(
  'forgekit_read_chunk',
  {
    description: 'Read a specific indexed memory chunk by chunk id.',
    inputSchema: z.object({ id: z.string() }).shape,
  },
  async ({ id }) => text(await readChunk(id)),
);

server.registerTool(
  'forgekit_status',
  {
    description: 'Return the current ForgeKit 2 session, git, and memory status.',
    inputSchema: z.object({}).shape,
  },
  async () => text(await getStatus()),
);

server.registerTool(
  'forgekit_gate',
  {
    description: 'Run a ForgeKit 2 gate using real command output and filesystem state.',
    inputSchema: z
      .object({
        name: z.enum(['status', 'plan', 'test', 'review', 'security', 'ship']),
        write_reports: z.boolean().default(false),
      })
      .shape,
  },
  async ({ name, write_reports }) => text(await runGate(name, { write_reports })),
);

server.registerTool(
  'forgekit_write_note',
  {
    description: 'Write a structured research/debug note under .gemini/forgekit/notes with TTL enforcement.',
    inputSchema: z
      .object({
        slug: z.string().optional(),
        content: z.string(),
        persistent: z.boolean().default(false),
      })
      .shape,
  },
  async ({ slug, content, persistent }) => text(await writeNote({ slug, content, persistent })),
);

server.registerTool(
  'forgekit_memory_gc',
  {
    description: 'Prune expired notes and report oversized ForgeKit memory files.',
    inputSchema: z.object({ delete_expired: z.boolean().default(true) }).shape,
  },
  async ({ delete_expired }) => text(await memoryGc({ delete_expired })),
);

server.registerTool(
  'forgekit_migrate',
  {
    description: 'Preview or apply migration from the old ForgeKit memory layout to ForgeKit 2.',
    inputSchema: z.object({ apply: z.boolean().default(false) }).shape,
  },
  async ({ apply }) => text(await migrate({ apply })),
);

// Compatibility aliases for the existing ForgeKit 0.x command surface.
server.registerTool(
  'forgekit_create_session',
  {
    description: 'Compatibility alias for creating or updating ForgeKit session state.',
    inputSchema: z
      .object({
        session_id: z.string().optional(),
        task: z.string(),
        workflow: z.enum(['express', 'standard']).default('standard'),
      })
      .shape,
  },
  async ({ session_id, task, workflow }) =>
    text(
      await writeSession({
        task,
        slug: session_id || slugify(task),
        workflow,
        phase: 'intake',
        status: 'active',
        active_agent: 'main-agent',
      }),
    ),
);

server.registerTool(
  'forgekit_get_status',
  {
    description: 'Compatibility alias for ForgeKit status.',
    inputSchema: z.object({}).shape,
  },
  async () => text(await getStatus()),
);

server.registerTool(
  'forgekit_index_memory',
  {
    description: 'Compatibility alias for building the ForgeKit BM25 memory index.',
    inputSchema: z.object({}).shape,
  },
  async () => text(await buildIndex()),
);

server.registerTool(
  'forgekit_search_memory',
  {
    description: 'Compatibility alias for BM25 memory search.',
    inputSchema: z
      .object({
        query: z.string(),
        top_k: z.number().int().min(1).max(10).default(5),
        max_total_chars: z.number().int().optional(),
      })
      .shape,
  },
  async ({ query, top_k }) => text(await searchIndex({ query, top_k })),
);

server.registerTool(
  'forgekit_audit_memory',
  {
    description: 'Compatibility alias for ForgeKit memory hygiene status.',
    inputSchema: z.object({}).shape,
  },
  async () => text(await getStatus()),
);

server.registerTool(
  'forgekit_compact_memory',
  {
    description: 'Compatibility alias for ForgeKit memory garbage collection.',
    inputSchema: z.object({ dry_run: z.boolean().default(true) }).shape,
  },
  async ({ dry_run }) => text(await memoryGc({ delete_expired: !dry_run })),
);

server.registerTool(
  'forgekit_dashboard',
  {
    description: 'Compatibility alias for ForgeKit status/dashboard.',
    inputSchema: z.object({}).shape,
  },
  async () => text(await getStatus()),
);

server.registerTool(
  'forgekit_check_workflow',
  {
    description: 'Compatibility alias for ship gate evaluation.',
    inputSchema: z.object({ write_report: z.boolean().default(false) }).shape,
  },
  async ({ write_report }) => {
    const result = await runGate('ship', { write_reports: write_report });
    return text({
      decision: result.result === 'risk' ? 'pass-with-risk' : result.result,
      gates: result.component_results || {},
      evidence: result.evidence,
      report_file: result.report_file || null,
    });
  },
);

server.registerTool(
  'forgekit_record_checkpoint',
  {
    description: 'Compatibility alias that writes a manual checkpoint report into reports/.',
    inputSchema: z
      .object({
        checkpoint: z.string(),
        status: z.enum(['pass', 'pass-with-risk', 'block']),
        evidence: z.string().default(''),
        next_step: z.string().default(''),
      })
      .shape,
  },
  async ({ checkpoint, status, evidence, next_step }) => {
    const session = await getSession();
    const slug = session.slug || slugify(session.task || checkpoint);
    const report = await writeGateReport(slug, `checkpoint-${slugify(checkpoint)}`, {
      result: status,
      evidence: [checkpoint, evidence, next_step].filter(Boolean).join(' | '),
    });
    return text({ ok: true, report_file: report, decision: status });
  },
);

server.registerTool(
  'forgekit_handoff_report',
  {
    description: 'Compatibility alias for the ship gate.',
    inputSchema: z.object({ write_report: z.boolean().default(false) }).shape,
  },
  async ({ write_report }) => text(await runGate('ship', { write_reports: write_report })),
);

server.registerTool(
  'forgekit_release_readiness',
  {
    description: 'Compatibility alias for the ship gate.',
    inputSchema: z.object({ write_report: z.boolean().default(false) }).shape,
  },
  async ({ write_report }) => text(await runGate('ship', { write_reports: write_report })),
);

const transport = new StdioServerTransport();
await server.connect(transport);
