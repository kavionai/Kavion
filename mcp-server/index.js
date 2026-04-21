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

async function buildMemoryIndex({ max_chunk_chars = 1200 } = {}) {
  await ensureDirs();
  const files = await collectMemoryFiles();
  const chunks = [];
  const vectors = [];
  const now = new Date().toISOString();

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
  await fs.writeFile(
    path.join(memoryRoot, 'manifest.json'),
    JSON.stringify(
      {
        version: 1,
        backend: 'local-jsonl-hash-vector',
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

  return { files: files.length, chunks: chunks.length, root: memoryRoot };
}

async function searchMemory({ query, top_k = 5, max_total_chars = 5000 }) {
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
  let usedChars = 0;

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
    .map((record) => {
      const remaining = Math.max(0, max_total_chars - usedChars);
      const excerpt = record.content.slice(0, Math.min(remaining, 800));
      usedChars += excerpt.length;
      return {
        id: record.id,
        source_path: record.source_path,
        chunk_type: record.chunk_type,
        score: record.score,
        exact_score: record.exact,
        semantic_score: record.semantic,
        excerpt,
      };
    });
}

async function auditMemory() {
  await ensureDirs();
  const required = [
    '.gemini/context/project-brief.md',
    '.gemini/context/architecture.md',
    '.gemini/context/commands.md',
    '.gemini/context/testing.md',
    '.gemini/context/current-work.md',
    '.gemini/context/decisions.md',
    '.gemini/context/github.md',
  ];
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
  let manifestExists = true;
  try {
    await fs.stat(path.join(memoryRoot, 'manifest.json'));
  } catch {
    manifestExists = false;
  }
  return {
    decision: missing.length ? 'block' : oversized.length || !manifestExists ? 'pass-with-risk' : 'pass',
    missing,
    oversized,
    index_present: manifestExists,
    recommendations: [
      ...(missing.length ? ['Run /team:init-project to create missing hot memory files.'] : []),
      ...(oversized.length ? ['Run /team:memory-compact to keep hot memory small.'] : []),
      ...(!manifestExists ? ['Run /team:memory-index to create the local memory index.'] : []),
    ],
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
  version: '0.2.0',
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
      })
      .shape,
  },
  async ({ max_chunk_chars }) => text(await buildMemoryIndex({ max_chunk_chars })),
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
  async ({ query, top_k, max_total_chars }) => text({
    query,
    results: await searchMemory({ query, top_k, max_total_chars }),
    rule: 'Read original source files before relying on recalled memory.',
  }),
);

server.registerTool(
  'forgekit_audit_memory',
  {
    description: 'Audit ForgeKit project memory for missing hot memory files, oversized files, and missing index state.',
    inputSchema: z.object({}).shape,
  },
  async () => text(await auditMemory()),
);

const transport = new StdioServerTransport();
await server.connect(transport);
