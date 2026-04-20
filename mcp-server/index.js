import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';

const workspacePath = process.env.FORGEKIT_WORKSPACE_PATH || process.cwd();
const root = path.join(workspacePath, '.gemini', 'forgekit');

async function ensureDirs() {
  await fs.mkdir(path.join(root, 'sessions', 'active'), { recursive: true });
  await fs.mkdir(path.join(root, 'sessions', 'archive'), { recursive: true });
  await fs.mkdir(path.join(root, 'plans'), { recursive: true });
  await fs.mkdir(path.join(root, 'reports'), { recursive: true });
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
  version: '0.1.0',
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

const transport = new StdioServerTransport();
await server.connect(transport);
