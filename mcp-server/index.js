import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const workspacePath = process.env.FORGEKIT_WORKSPACE_PATH || process.cwd();
const root = path.join(workspacePath, '.gemini', 'forgekit');
const geminiRoot = path.join(workspacePath, '.gemini');
const memoryRoot = path.join(root, 'memory');
const vectorSize = 128;
const serverVersion = '0.4.0';
const defaultVectorBackend = ['auto', 'jsonl', 'lancedb'].includes(process.env.FORGEKIT_VECTOR_BACKEND)
  ? process.env.FORGEKIT_VECTOR_BACKEND
  : 'auto';
const hotMemoryFiles = [
  '.gemini/context/project-brief.md',
  '.gemini/context/architecture.md',
  '.gemini/context/commands.md',
  '.gemini/context/testing.md',
  '.gemini/context/current-work.md',
  '.gemini/context/decisions.md',
  '.gemini/context/github.md',
];

async function ensureDirs() {
  await fs.mkdir(path.join(root, 'sessions', 'active'), { recursive: true });
  await fs.mkdir(path.join(root, 'sessions', 'archive'), { recursive: true });
  await fs.mkdir(path.join(root, 'plans'), { recursive: true });
  await fs.mkdir(path.join(root, 'reports'), { recursive: true });
  await fs.mkdir(memoryRoot, { recursive: true });
  await fs.mkdir(path.join(geminiRoot, 'notes'), { recursive: true });
  await fs.mkdir(path.join(geminiRoot, 'archive'), { recursive: true });
}

function isSafeMemoryFile(file) {
  const name = path.basename(file);
  if (name.startsWith('.env')) return false;
  if (name === '.DS_Store') return false;
  if (!file.endsWith('.md') && !file.endsWith('.txt')) return false;
  return !file.includes('node_modules');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function tokenize(value) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_/-]+/g)
    .filter((token) => token.length > 2)
    .slice(0, 500);
}

function embed(value) {
  const vector = new Array(vectorSize).fill(0);
  for (const token of tokenize(value)) {
    const hash = crypto.createHash('sha256').update(token).digest();
    const index = hash[0] % vectorSize;
    vector[index] += 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0)) || 1;
  return vector.map((item) => Number((item / norm).toFixed(6)));
}

function cosine(a, b) {
  let score = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    score += a[index] * b[index];
  }
  return score;
}

function chunkText(content, maxChars) {
  const chunks = [];
  let current = '';
  for (const part of content.split(/\n\s*\n/g)) {
    const clean = part.trim();
    if (!clean) continue;
    if ((current + '\n\n' + clean).length > maxChars && current) {
      chunks.push(current);
      current = clean;
    } else {
      current = current ? `${current}\n\n${clean}` : clean;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function walk(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await walk(file)));
      } else if (entry.isFile() && isSafeMemoryFile(file)) {
        files.push(file);
      }
    }
    return files;
  } catch {
    return [];
  }
}

async function collectMemoryFiles() {
  const roots = [
    path.join(geminiRoot, 'context'),
    path.join(geminiRoot, 'notes'),
    path.join(root, 'sessions'),
    path.join(root, 'plans'),
    path.join(root, 'reports'),
    path.join(geminiRoot, 'archive'),
  ];
  const files = [];
  for (const dir of roots) {
    files.push(...(await walk(dir)));
  }
  return [...new Set(files)].sort();
}

function inferChunkType(relativePath) {
  if (relativePath.includes('/context/decisions')) return 'decision';
  if (relativePath.includes('/context/architecture')) return 'architecture';
  if (relativePath.includes('/context/current-work')) return 'current-work';
  if (relativePath.includes('/sessions/')) return 'session';
  if (relativePath.includes('/plans/')) return 'plan';
  if (relativePath.includes('/reports/')) return 'report';
  if (relativePath.includes('/notes/')) return 'note';
  return 'memory';
}

async function readJsonl(file) {
  try {
    const content = await fs.readFile(file, 'utf8');
    return content
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function normalizeBackend(value) {
  if (['auto', 'jsonl', 'lancedb'].includes(value)) return value;
  return 'auto';
}

async function tryLoadLanceDb() {
  try {
    return await import('@lancedb/lancedb');
  } catch (error) {
    return { error };
  }
}

async function writeLanceDbIndex(chunks, vectors) {
  if (!chunks.length) {
    return {
      enabled: false,
      backend: 'lancedb',
      reason: 'No memory chunks to index.',
    };
  }

  const lancedb = await tryLoadLanceDb();
  if (lancedb.error) {
    return {
      enabled: false,
      backend: 'lancedb',
      reason: '@lancedb/lancedb is not installed. Run npm install in mcp-server or use FORGEKIT_VECTOR_BACKEND=jsonl.',
    };
  }

  const lanceRoot = path.join(memoryRoot, 'lancedb');
  const tableName = 'memory_chunks';
  const vectorMap = new Map(vectors.map((item) => [item.id, item.vector]));
  const rows = chunks.map((record) => ({
    id: record.id,
    vector: vectorMap.get(record.id) || embed(`${record.source_path}\n${record.content}`),
    source_path: record.source_path,
    chunk_index: record.chunk_index,
    chunk_type: record.chunk_type,
    source_hash: record.source_hash,
    updated_at: record.updated_at,
    tags_json: JSON.stringify(record.tags || []),
    content: record.content,
  }));

  try {
    await fs.mkdir(lanceRoot, { recursive: true });
    const db = await lancedb.connect(lanceRoot);
    let table;
    try {
      table = await db.createTable(tableName, rows, { mode: 'overwrite' });
    } catch (error) {
      if (typeof db.dropTable === 'function') {
        try {
          await db.dropTable(tableName);
        } catch {
          // The table may not exist. Creation below will report any real failure.
        }
      }
      table = await db.createTable(tableName, rows);
    }
    return {
      enabled: true,
      backend: 'lancedb',
      path: lanceRoot,
      table: tableName,
      rows: rows.length,
      api: typeof table.vectorSearch === 'function' ? 'vectorSearch' : 'search',
    };
  } catch (error) {
    return {
      enabled: false,
      backend: 'lancedb',
      reason: error.message,
    };
  }
}

async function buildMemoryIndex({ max_chunk_chars = 1200, vector_backend = defaultVectorBackend } = {}) {
  await ensureDirs();
  const files = await collectMemoryFiles();
  const chunks = [];
  const vectors = [];
  const now = new Date().toISOString();
  const requestedBackend = normalizeBackend(vector_backend);

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const relativePath = path.relative(workspacePath, file);
    const sourceHash = sha256(content);
    const parts = chunkText(content, max_chunk_chars);
    parts.forEach((part, index) => {
      const id = sha256(`${relativePath}:${sourceHash}:${index}`).slice(0, 24);
      const record = {
        id,
        source_path: relativePath,
        chunk_index: index,
        chunk_type: inferChunkType(relativePath),
        source_hash: sourceHash,
        updated_at: now,
        tags: tokenize(`${relativePath} ${part}`).slice(0, 12),
        content: part.slice(0, max_chunk_chars),
      };
      chunks.push(record);
      vectors.push({ id, vector: embed(`${relativePath}\n${part}`) });
    });
  }

  await fs.writeFile(
    path.join(memoryRoot, 'memory.jsonl'),
    chunks.map((record) => JSON.stringify(record)).join('\n') + (chunks.length ? '\n' : ''),
    'utf8',
  );
  await fs.writeFile(
    path.join(memoryRoot, 'vectors.jsonl'),
    vectors.map((record) => JSON.stringify(record)).join('\n') + (vectors.length ? '\n' : ''),
    'utf8',
  );

  const lanceResult =
    requestedBackend === 'lancedb' || requestedBackend === 'auto'
      ? await writeLanceDbIndex(chunks, vectors)
      : { enabled: false, backend: 'lancedb', reason: 'LanceDB disabled by backend setting.' };
  const activeBackend = lanceResult.enabled ? 'lancedb' : 'local-jsonl-hash-vector';

  await fs.writeFile(
    path.join(memoryRoot, 'manifest.json'),
    JSON.stringify(
      {
        version: 2,
        backend: activeBackend,
        requested_backend: requestedBackend,
        fallback_backend: 'local-jsonl-hash-vector',
        vector_backend: lanceResult,
        workspace: workspacePath,
        indexed_at: now,
        files: files.length,
        chunks: chunks.length,
        max_chunk_chars,
        note: 'Markdown files remain the source of truth. This index is a local searchable cache.',
      },
      null,
      2,
    ),
    'utf8',
  );

  return {
    files: files.length,
    chunks: chunks.length,
    root: memoryRoot,
    backend: activeBackend,
    requested_backend: requestedBackend,
    vector_backend: lanceResult,
  };
}

function formatSearchRecord(record, score, usedChars, maxTotalChars) {
  const remaining = Math.max(0, maxTotalChars - usedChars.value);
  const excerpt = String(record.content || '').slice(0, Math.min(remaining, 800));
  usedChars.value += excerpt.length;
  return {
    id: record.id,
    source_path: record.source_path,
    chunk_type: record.chunk_type,
    score,
    exact_score: record.exact,
    semantic_score: record.semantic,
    excerpt,
  };
}

async function searchLanceMemory({ query, top_k, max_total_chars }) {
  const manifest = await readJson(path.join(memoryRoot, 'manifest.json'));
  if (manifest?.backend !== 'lancedb') return null;

  const lancedb = await tryLoadLanceDb();
  if (lancedb.error) return null;

  try {
    const db = await lancedb.connect(path.join(memoryRoot, 'lancedb'));
    const table = await db.openTable('memory_chunks');
    const search = typeof table.vectorSearch === 'function' ? table.vectorSearch.bind(table) : table.search.bind(table);
    const rows = await search(embed(query)).limit(top_k).toArray();
    const usedChars = { value: 0 };
    return rows.map((row) => {
      const score = typeof row._distance === 'number' ? Number((1 / (1 + row._distance)).toFixed(4)) : 1;
      return formatSearchRecord(
        {
          id: row.id,
          source_path: row.source_path,
          chunk_type: row.chunk_type,
          content: row.content,
          exact: 0,
          semantic: score,
        },
        score,
        usedChars,
        max_total_chars,
      );
    });
  } catch {
    return null;
  }
}

async function searchJsonlMemory({ query, top_k = 5, max_total_chars = 5000 }) {
  await ensureDirs();
  const memoryFile = path.join(memoryRoot, 'memory.jsonl');
  const vectorFile = path.join(memoryRoot, 'vectors.jsonl');
  let records = await readJsonl(memoryFile);
  let vectors = await readJsonl(vectorFile);
  if (!records.length) {
    await buildMemoryIndex();
    records = await readJsonl(memoryFile);
    vectors = await readJsonl(vectorFile);
  }

  const vectorMap = new Map(vectors.map((item) => [item.id, item.vector]));
  const queryTokens = tokenize(query);
  const queryVector = embed(query);
  const usedChars = { value: 0 };

  return records
    .map((record) => {
      const textValue = `${record.source_path} ${record.content}`.toLowerCase();
      const exact = queryTokens.reduce((score, token) => score + (textValue.includes(token) ? 1 : 0), 0);
      const semantic = cosine(queryVector, vectorMap.get(record.id) || []);
      return { ...record, score: Number((exact + semantic).toFixed(4)), exact, semantic: Number(semantic.toFixed(4)) };
    })
    .filter((record) => record.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, top_k)
    .map((record) => formatSearchRecord(record, record.score, usedChars, max_total_chars));
}

async function searchMemory({ query, top_k = 5, max_total_chars = 5000 }) {
  await ensureDirs();
  const lanceResults = await searchLanceMemory({ query, top_k, max_total_chars });
  if (lanceResults?.length) {
    return { backend: 'lancedb', results: lanceResults };
  }
  return { backend: 'local-jsonl-hash-vector', results: await searchJsonlMemory({ query, top_k, max_total_chars }) };
}

async function auditMemory() {
  await ensureDirs();
  const required = hotMemoryFiles;
  const missing = [];
  const oversized = [];
  for (const relativePath of required) {
    const file = path.join(workspacePath, relativePath);
    try {
      const stat = await fs.stat(file);
      if (stat.size > 12000) oversized.push({ file: relativePath, bytes: stat.size });
    } catch {
      missing.push(relativePath);
    }
  }
  const manifest = await readJson(path.join(memoryRoot, 'manifest.json'));
  const manifestExists = Boolean(manifest);
  const staleIndex = manifest?.indexed_at
    ? filesChangedAfter(new Date(manifest.indexed_at))
    : Promise.resolve([]);
  const changedAfterIndex = await staleIndex;
  return {
    decision: missing.length ? 'block' : oversized.length || !manifestExists || changedAfterIndex.length ? 'pass-with-risk' : 'pass',
    missing,
    oversized,
    index_present: manifestExists,
    index_backend: manifest?.backend || null,
    index_stale_sources: changedAfterIndex.slice(0, 20),
    recommendations: [
      ...(missing.length ? ['Run /team:init-project to create missing hot memory files.'] : []),
      ...(oversized.length ? ['Run /team:memory-compact to keep hot memory small.'] : []),
      ...(!manifestExists ? ['Run /team:memory-index to create the local memory index.'] : []),
      ...(changedAfterIndex.length ? ['Run /team:memory-index to refresh stale memory recall cache.'] : []),
    ],
  };
}

async function filesChangedAfter(date) {
  const files = await collectMemoryFiles();
  const changed = [];
  for (const file of files) {
    const stat = await fs.stat(file);
    if (stat.mtime > date) changed.push(path.relative(workspacePath, file));
  }
  return changed;
}

async function readActiveSessions() {
  await ensureDirs();
  const dir = path.join(root, 'sessions', 'active');
  const names = await fs.readdir(dir).catch(() => []);
  const sessions = [];
  for (const name of names.filter((file) => file.endsWith('.md')).sort()) {
    const file = path.join(dir, name);
    const content = await fs.readFile(file, 'utf8');
    const get = (label) => content.match(new RegExp(`^${label}:\\s*(.*)$`, 'im'))?.[1]?.trim() || '';
    sessions.push({
      session_id: name.replace(/\.md$/, ''),
      file: path.relative(workspacePath, file),
      task: get('Task'),
      workflow: get('Workflow'),
      status: get('Status') || 'unknown',
      phase: get('Current phase') || 'unknown',
      next_step: get('Next step'),
      last_updated: get('Last updated'),
      content,
    });
  }
  return sessions;
}

async function findSession(sessionId) {
  const sessions = await readActiveSessions();
  if (sessionId) {
    return sessions.find((session) => session.session_id === sessionId) || null;
  }
  return sessions.sort((a, b) => String(b.last_updated).localeCompare(String(a.last_updated)))[0] || null;
}

function fieldValue(content, label) {
  return content.match(new RegExp(`^${label}:\\s*(.*)$`, 'im'))?.[1]?.trim() || '';
}

function hasMeaningfulValue(value) {
  return Boolean(value && !/^(none|n\/a|na|pending|todo|tbd|unknown|-)?$/i.test(value.trim()));
}

function isClearBlockerValue(value) {
  return !hasMeaningfulValue(value) || /^(none|no blockers?|resolved|clear)\.?$/i.test(value.trim());
}

function includesAny(value, words) {
  const haystack = String(value || '').toLowerCase();
  return words.some((word) => haystack.includes(word));
}

function gate(id, label, status, evidence = '', next = '') {
  return { id, label, status, evidence, next };
}

function decisionFromGates(gates) {
  if (gates.some((item) => item.status === 'block')) return 'block';
  if (gates.some((item) => item.status === 'risk')) return 'pass-with-risk';
  return 'pass';
}

async function readReportEvidence() {
  const reportDir = path.join(root, 'reports');
  const names = await fs.readdir(reportDir).catch(() => []);
  const reports = [];
  for (const name of names.filter((item) => item.endsWith('.md')).sort()) {
    const file = path.join(reportDir, name);
    const content = await fs.readFile(file, 'utf8').catch(() => '');
    reports.push({
      file: path.relative(workspacePath, file),
      name,
      content,
    });
  }
  return reports;
}

async function readPlanEvidence() {
  const planDir = path.join(root, 'plans');
  const names = await fs.readdir(planDir).catch(() => []);
  const plans = [];
  for (const name of names.filter((item) => item.endsWith('.md')).sort()) {
    const file = path.join(planDir, name);
    const content = await fs.readFile(file, 'utf8').catch(() => '');
    plans.push({
      file: path.relative(workspacePath, file),
      name,
      content,
    });
  }
  return plans;
}

function reportMentions(reports, words) {
  return reports.some((report) => includesAny(`${report.name}\n${report.content}`, words));
}

function planMentions(plans, words) {
  return plans.some((plan) => includesAny(`${plan.name}\n${plan.content}`, words));
}

async function checkWorkflow({
  session_id,
  require_tests = true,
  require_review = true,
  require_memory_index = true,
  require_security_when_sensitive = true,
  require_plan = true,
  require_reports = true,
  release_mode = false,
} = {}) {
  await ensureDirs();
  const session = await findSession(session_id);
  const audit = await auditMemory();
  const plans = await readPlanEvidence();
  const reports = await readReportEvidence();
  const gates = [];

  gates.push(
    gate(
      'memory.initialized',
      'Project memory initialized',
      audit.missing.length ? 'block' : 'pass',
      audit.missing.length ? `Missing: ${audit.missing.join(', ')}` : 'All hot memory files exist.',
      audit.missing.length ? 'Run /team:init-project.' : '',
    ),
  );

  gates.push(
    gate(
      'session.active',
      'Active session exists',
      session ? 'pass' : 'block',
      session ? `Using ${session.file}.` : 'No active session found.',
      session ? '' : 'Run /team:session-update or restart with /team:feature.',
    ),
  );

  if (!session) {
    gates.push(
      gate(
        'memory.index',
        'Memory index current',
        audit.index_present && !audit.index_stale_sources.length ? 'pass' : 'risk',
        audit.index_present ? `Backend: ${audit.index_backend || 'unknown'}.` : 'Index missing.',
        audit.index_present && !audit.index_stale_sources.length ? '' : 'Run /team:memory-index.',
      ),
    );
    return {
      decision: decisionFromGates(gates),
      session: null,
      gates,
      recommendations: gates.filter((item) => item.next).map((item) => item.next),
    };
  }

  const verification = fieldValue(session.content, 'Verification');
  const blockers = fieldValue(session.content, 'Blockers');
  const agents = fieldValue(session.content, 'Agents used');
  const phase = fieldValue(session.content, 'Current phase');
  const status = fieldValue(session.content, 'Status');
  const workflow = fieldValue(session.content, 'Workflow') || session.workflow;
  const sessionText = session.content;
  const qaDeferred = includesAny(`${verification}\n${sessionText}`, ['qa deferred', 'verification deferred', 'tests deferred']);
  const testsPassed = includesAny(`${verification}\n${sessionText}\n${reports.map((report) => report.content).join('\n')}`, [
    'test passed',
    'tests passed',
    'npm test passed',
    'all tests pass',
    'e2e passed',
    'verified',
  ]);
  const hasReview = includesAny(`${agents}\n${sessionText}`, ['code-reviewer', 'code review', 'review complete']) ||
    reportMentions(reports, ['code review', 'reviewer', 'blocking issues']);
  const sensitive = includesAny(`${session.task}\n${sessionText}`, [
    'auth',
    'jwt',
    'password',
    'payment',
    'stripe',
    'razorpay',
    'permission',
    'security',
    'secret',
    'token',
    'user data',
  ]);
  const hasSecurity = includesAny(`${agents}\n${sessionText}`, ['security-engineer', 'security review']) ||
    reportMentions(reports, ['security review', 'security-engineer']);
  const standardWork = /^standard$/i.test(workflow) || sensitive || includesAny(`${session.task}\n${agents}`, [
    'backend-engineer',
    'frontend-engineer',
    'database-engineer',
    'qa-test-engineer',
    'security-engineer',
    'multi',
    'complex',
  ]);
  const hasPlan = plans.length > 0 && (planMentions(plans, tokenize(session.task).slice(0, 8)) || plans.length === 1);
  const hasQaReport = reportMentions(reports, ['qa', 'test', 'verification']);
  const hasReviewReport = reportMentions(reports, ['code review', 'reviewer', 'review']);
  const hasSecurityReport = reportMentions(reports, ['security review', 'security']);

  gates.push(
    gate(
      'session.updated',
      'Session state updated',
      hasMeaningfulValue(session.last_updated) ? 'pass' : 'risk',
      hasMeaningfulValue(session.last_updated) ? `Last updated: ${session.last_updated}.` : 'Last updated is missing.',
      hasMeaningfulValue(session.last_updated) ? '' : 'Run /team:session-update.',
    ),
  );

  if (require_plan && standardWork) {
    gates.push(
      gate(
        'planning.file',
        'Implementation plan file exists',
        hasPlan ? 'pass' : 'block',
        hasPlan ? `Plan files: ${plans.map((plan) => plan.file).join(', ')}.` : 'No matching plan file found in .gemini/forgekit/plans/.',
        hasPlan ? '' : 'Create a plan under .gemini/forgekit/plans/ before continuing.',
      ),
    );
  }
  gates.push(
    gate(
      'workflow.phase',
      'Workflow phase is explicit',
      hasMeaningfulValue(phase) && hasMeaningfulValue(status) ? 'pass' : 'risk',
      `Phase: ${phase || 'missing'}, status: ${status || 'missing'}.`,
      hasMeaningfulValue(phase) && hasMeaningfulValue(status) ? '' : 'Update active session phase/status.',
    ),
  );
  gates.push(
    gate(
      'blockers.clear',
      'No unresolved blockers',
      isClearBlockerValue(blockers) ? 'pass' : 'block',
      hasMeaningfulValue(blockers) ? `Blockers: ${blockers}.` : 'No blockers recorded.',
      isClearBlockerValue(blockers) ? '' : 'Resolve or explicitly defer the blocker.',
    ),
  );

  if (require_tests) {
    let testStatus = 'block';
    let evidence = 'No completed verification evidence found.';
    let next = 'Run /team:debug for failing tests or /team:quality-gate after tests pass.';
    if (testsPassed) {
      testStatus = 'pass';
      evidence = 'Verification evidence indicates tests/checks passed.';
      next = '';
    } else if (qaDeferred) {
      testStatus = release_mode ? 'block' : 'risk';
      evidence = 'QA or verification is explicitly deferred.';
      next = 'Do not mark release-ready. Run /team:debug to fix deferred QA.';
    }
    gates.push(gate('verification.tests', 'Tests or verification completed', testStatus, evidence, next));
    if (require_reports && standardWork) {
      gates.push(
        gate(
          'reports.qa',
          'QA/test report written',
          hasQaReport ? 'pass' : 'block',
          hasQaReport ? 'QA/test report evidence found.' : 'No QA/test report found in .gemini/forgekit/reports/.',
          hasQaReport ? '' : 'Write a QA/test report under .gemini/forgekit/reports/.',
        ),
      );
    }
  }

  if (require_review) {
    gates.push(
      gate(
        'review.code',
        'Code review completed',
        hasReview ? 'pass' : 'block',
        hasReview ? 'Review evidence found.' : 'No code review evidence found.',
        hasReview ? '' : 'Run /team:review or include code-reviewer before handoff.',
      ),
    );
    if (require_reports && standardWork) {
      gates.push(
        gate(
          'reports.review',
          'Code review report written',
          hasReviewReport ? 'pass' : 'block',
          hasReviewReport ? 'Code review report evidence found.' : 'No code review report found in .gemini/forgekit/reports/.',
          hasReviewReport ? '' : 'Write a code review report under .gemini/forgekit/reports/.',
        ),
      );
    }
  }

  if (require_security_when_sensitive && sensitive) {
    gates.push(
      gate(
        'review.security',
        'Security review completed for sensitive work',
        hasSecurity ? 'pass' : 'block',
        hasSecurity ? 'Security evidence found.' : 'Sensitive work detected without security review evidence.',
        hasSecurity ? '' : 'Run /team:security-audit or use security-engineer.',
      ),
    );
    if (require_reports && standardWork) {
      gates.push(
        gate(
          'reports.security',
          'Security report written',
          hasSecurityReport ? 'pass' : 'block',
          hasSecurityReport ? 'Security report evidence found.' : 'No security report found in .gemini/forgekit/reports/.',
          hasSecurityReport ? '' : 'Write a security report under .gemini/forgekit/reports/.',
        ),
      );
    }
  }

  if (require_memory_index) {
    gates.push(
      gate(
        'memory.index',
        'Memory index current',
        audit.index_present && !audit.index_stale_sources.length ? 'pass' : 'risk',
        audit.index_present
          ? `Backend: ${audit.index_backend || 'unknown'}; stale sources: ${audit.index_stale_sources.length}.`
          : 'Index missing.',
        audit.index_present && !audit.index_stale_sources.length ? '' : 'Run /team:memory-index.',
      ),
    );
  }

  const recommendations = [...new Set(gates.filter((item) => item.next).map((item) => item.next))];
  return {
    decision: decisionFromGates(gates),
    session: {
      session_id: session.session_id,
      file: session.file,
      task: session.task,
      phase,
      status,
      next_step: session.next_step,
    },
    gates,
    recommendations,
  };
}

async function writeWorkflowReport(kind, result) {
  await ensureDirs();
  const safeKind = kind.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(root, 'reports', `${safeKind}-${stamp}.md`);
  const body = `# ForgeKit ${kind}

Decision: ${result.decision}
Session: ${result.session?.session_id || 'none'}
Task: ${result.session?.task || 'none'}

## Gates

${result.gates.map((item) => `- ${item.status.toUpperCase()} ${item.label}: ${item.evidence}`).join('\n')}

## Recommendations

${result.recommendations.length ? result.recommendations.map((item) => `- ${item}`).join('\n') : '- None'}
`;
  await fs.writeFile(file, body, 'utf8');
  return path.relative(workspacePath, file);
}

async function handoffReport({ session_id, write_report = false } = {}) {
  const result = await checkWorkflow({ session_id, release_mode: true });
  const report = {
    ...result,
    handoff_status: result.decision === 'pass' ? 'ready' : 'blocked',
    rule: 'Do not call work complete or ready for use while blocking gates remain.',
  };
  if (write_report) report.report_file = await writeWorkflowReport('handoff-report', report);
  return report;
}

async function releaseReadiness({ session_id, write_report = false } = {}) {
  const result = await checkWorkflow({ session_id, release_mode: true });
  const report = {
    ...result,
    release_status: result.decision === 'pass' ? 'ready' : 'not-ready',
    rule: 'QA deferred, missing review, unresolved blockers, or stale memory index prevents release readiness.',
  };
  if (write_report) report.report_file = await writeWorkflowReport('release-readiness', report);
  return report;
}

async function compactMemory({ dry_run = true, max_hot_bytes = 12000, archive_completed_sessions = true } = {}) {
  await ensureDirs();
  const actions = [];
  const recommendations = [];
  const oversized_hot_memory = [];

  for (const relativePath of hotMemoryFiles) {
    try {
      const stat = await fs.stat(path.join(workspacePath, relativePath));
      if (stat.size > max_hot_bytes) {
        oversized_hot_memory.push({ file: relativePath, bytes: stat.size });
      }
    } catch {
      // Missing files are handled by auditMemory.
    }
  }

  const sessions = await readActiveSessions();
  const completed = sessions.filter((session) => /^(complete|completed|done)$/i.test(session.status));
  if (archive_completed_sessions && completed.length) {
    for (const session of completed) {
      const src = path.join(workspacePath, session.file);
      let dest = path.join(root, 'sessions', 'archive', path.basename(session.file));
      try {
        await fs.stat(dest);
        dest = path.join(root, 'sessions', 'archive', `${session.session_id}-${Date.now()}.md`);
      } catch {
        // Destination is free.
      }
      actions.push({
        action: dry_run ? 'would_archive_completed_session' : 'archived_completed_session',
        session_id: session.session_id,
        from: session.file,
        to: path.relative(workspacePath, dest),
      });
      if (!dry_run) await fs.rename(src, dest);
    }
  }

  if (oversized_hot_memory.length) {
    recommendations.push('Move detailed history from oversized hot memory into .gemini/notes/ or .gemini/archive/.');
  }
  if (!actions.length && !oversized_hot_memory.length) {
    recommendations.push('No pruning action needed.');
  }

  let refreshed_index = null;
  if (!dry_run && actions.length) {
    refreshed_index = await buildMemoryIndex();
  }

  return {
    dry_run,
    actions,
    oversized_hot_memory,
    refreshed_index,
    recommendations,
  };
}

async function latestFiles(dir, limit = 5) {
  const names = await fs.readdir(dir).catch(() => []);
  const files = [];
  for (const name of names.filter((item) => item.endsWith('.md'))) {
    const file = path.join(dir, name);
    const stat = await fs.stat(file);
    files.push({ file: path.relative(workspacePath, file), updated_at: stat.mtime.toISOString(), bytes: stat.size });
  }
  return files.sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, limit);
}

async function dashboard() {
  await ensureDirs();
  const manifest = await readJson(path.join(memoryRoot, 'manifest.json'));
  const audit = await auditMemory();
  const activeSessions = (await readActiveSessions()).map(({ content, ...session }) => session);
  const currentWorkPath = path.join(geminiRoot, 'context', 'current-work.md');
  const currentWork = await fs.readFile(currentWorkPath, 'utf8').catch(() => '');

  return {
    workspace: workspacePath,
    memory: {
      decision: audit.decision,
      index_present: audit.index_present,
      index_backend: audit.index_backend,
      indexed_at: manifest?.indexed_at || null,
      chunks: manifest?.chunks || 0,
      stale_sources: audit.index_stale_sources,
      oversized_hot_memory: audit.oversized,
      missing_hot_memory: audit.missing,
    },
    current_work_excerpt: currentWork.slice(0, 1200),
    active_sessions: activeSessions,
    latest_reports: await latestFiles(path.join(root, 'reports')),
    latest_plans: await latestFiles(path.join(root, 'plans')),
    recommended_actions: audit.recommendations,
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
    description: 'Create ForgeKit session, plan, and report directories in the current workspace.',
    inputSchema: z.object({}).shape,
  },
  async () => {
    await ensureDirs();
    return text({ ok: true, root });
  },
);

server.registerTool(
  'forgekit_create_session',
  {
    description: 'Create or replace a ForgeKit active session markdown file.',
    inputSchema: z
      .object({
        session_id: z.string(),
        task: z.string(),
        workflow: z.enum(['express', 'standard']),
      })
      .shape,
  },
  async ({ session_id, task, workflow }) => {
    await ensureDirs();
    const file = path.join(root, 'sessions', 'active', `${session_id}.md`);
    const now = new Date().toISOString();
    const body = `# ForgeKit Session ${session_id}

Task: ${task}
Workflow: ${workflow}
Current phase: intake
Status: active
Agents used:
Files touched:
Verification:
Blockers:
Next step:
Last updated: ${now}
`;
    await fs.writeFile(file, body, 'utf8');
    return text({ ok: true, session_id, file });
  },
);

server.registerTool(
  'forgekit_get_status',
  {
    description: 'Read active ForgeKit session files for the current workspace.',
    inputSchema: z.object({}).shape,
  },
  async () => {
    await ensureDirs();
    const dir = path.join(root, 'sessions', 'active');
    const files = await fs.readdir(dir);
    const sessions = [];
    for (const name of files.filter((f) => f.endsWith('.md'))) {
      const file = path.join(dir, name);
      sessions.push({ file, content: await fs.readFile(file, 'utf8') });
    }
    return text({ root, active_sessions: sessions });
  },
);

server.registerTool(
  'forgekit_archive_session',
  {
    description: 'Move a ForgeKit active session to the archive directory.',
    inputSchema: z.object({ session_id: z.string() }).shape,
  },
  async ({ session_id }) => {
    await ensureDirs();
    const src = path.join(root, 'sessions', 'active', `${session_id}.md`);
    const dest = path.join(root, 'sessions', 'archive', `${session_id}.md`);
    await fs.rename(src, dest);
    return text({ ok: true, session_id, archived_to: dest });
  },
);

server.registerTool(
  'forgekit_index_memory',
  {
    description: 'Build or refresh the local ForgeKit memory index from project memory, notes, sessions, plans, reports, and archive files.',
    inputSchema: z
      .object({
        max_chunk_chars: z.number().int().min(300).max(2400).default(1200),
        vector_backend: z.enum(['auto', 'jsonl', 'lancedb']).default(defaultVectorBackend),
      })
      .shape,
  },
  async ({ max_chunk_chars, vector_backend }) => text(await buildMemoryIndex({ max_chunk_chars, vector_backend })),
);

server.registerTool(
  'forgekit_search_memory',
  {
    description: 'Search the local ForgeKit memory index with token-safe recall limits.',
    inputSchema: z
      .object({
        query: z.string(),
        top_k: z.number().int().min(1).max(10).default(5),
        max_total_chars: z.number().int().min(500).max(10000).default(5000),
      })
      .shape,
  },
  async ({ query, top_k, max_total_chars }) => {
    const recall = await searchMemory({ query, top_k, max_total_chars });
    return text({
      query,
      backend: recall.backend,
      results: recall.results,
      rule: 'Read original source files before relying on recalled memory.',
    });
  },
);

server.registerTool(
  'forgekit_audit_memory',
  {
    description: 'Audit ForgeKit project memory for missing hot memory files, oversized files, and missing index state.',
    inputSchema: z.object({}).shape,
  },
  async () => text(await auditMemory()),
);

server.registerTool(
  'forgekit_compact_memory',
  {
    description: 'Prune ForgeKit memory safely by archiving completed sessions and reporting oversized hot memory files.',
    inputSchema: z
      .object({
        dry_run: z.boolean().default(true),
        max_hot_bytes: z.number().int().min(4000).max(40000).default(12000),
        archive_completed_sessions: z.boolean().default(true),
      })
      .shape,
  },
  async ({ dry_run, max_hot_bytes, archive_completed_sessions }) =>
    text(await compactMemory({ dry_run, max_hot_bytes, archive_completed_sessions })),
);

server.registerTool(
  'forgekit_dashboard',
  {
    description: 'Return a compact ForgeKit project dashboard with memory, session, plan, report, and recommended action status.',
    inputSchema: z.object({}).shape,
  },
  async () => text(await dashboard()),
);

server.registerTool(
  'forgekit_check_workflow',
  {
    description: 'Evaluate ForgeKit workflow gates for the active session and return pass, pass-with-risk, or block.',
    inputSchema: z
      .object({
        session_id: z.string().optional(),
        require_tests: z.boolean().default(true),
        require_review: z.boolean().default(true),
        require_memory_index: z.boolean().default(true),
        require_security_when_sensitive: z.boolean().default(true),
        require_plan: z.boolean().default(true),
        require_reports: z.boolean().default(true),
        release_mode: z.boolean().default(false),
        write_report: z.boolean().default(false),
      })
      .shape,
  },
  async ({
    session_id,
    require_tests,
    require_review,
    require_memory_index,
    require_security_when_sensitive,
    require_plan,
    require_reports,
    release_mode,
    write_report,
  }) => {
    const result = await checkWorkflow({
      session_id,
      require_tests,
      require_review,
      require_memory_index,
      require_security_when_sensitive,
      require_plan,
      require_reports,
      release_mode,
    });
    if (write_report) result.report_file = await writeWorkflowReport('workflow-checkpoint', result);
    return text(result);
  },
);

server.registerTool(
  'forgekit_record_checkpoint',
  {
    description: 'Write a workflow checkpoint report for the active ForgeKit session.',
    inputSchema: z
      .object({
        session_id: z.string().optional(),
        checkpoint: z.string(),
        status: z.enum(['pass', 'pass-with-risk', 'block']),
        evidence: z.string().default(''),
        next_step: z.string().default(''),
      })
      .shape,
  },
  async ({ session_id, checkpoint, status, evidence, next_step }) => {
    const result = {
      decision: status,
      session: session_id ? { session_id } : (await checkWorkflow({ session_id })).session,
      gates: [gate('manual.checkpoint', checkpoint, status === 'pass-with-risk' ? 'risk' : status, evidence, next_step)],
      recommendations: next_step ? [next_step] : [],
    };
    result.report_file = await writeWorkflowReport('manual-checkpoint', result);
    return text(result);
  },
);

server.registerTool(
  'forgekit_handoff_report',
  {
    description: 'Create a handoff decision from workflow gates. Blocks handoff when required gates are missing.',
    inputSchema: z
      .object({
        session_id: z.string().optional(),
        write_report: z.boolean().default(false),
      })
      .shape,
  },
  async ({ session_id, write_report }) => text(await handoffReport({ session_id, write_report })),
);

server.registerTool(
  'forgekit_release_readiness',
  {
    description: 'Evaluate whether the active ForgeKit session is ready for release, PR, or archive.',
    inputSchema: z
      .object({
        session_id: z.string().optional(),
        write_report: z.boolean().default(false),
      })
      .shape,
  },
  async ({ session_id, write_report }) => text(await releaseReadiness({ session_id, write_report })),
);

const transport = new StdioServerTransport();
await server.connect(transport);
