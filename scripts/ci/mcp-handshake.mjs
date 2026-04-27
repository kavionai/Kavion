import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '../../vendor/mcp-runtime/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from '../../vendor/mcp-runtime/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const workspace = path.join(repoRoot, '.tmp', 'handshake-workspace');

await fs.mkdir(workspace, { recursive: true });

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(repoRoot, 'mcp-server', 'launch.js')],
  cwd: workspace,
  env: {
    ...process.env,
    KAVION_WORKSPACE_PATH: workspace,
  },
});

const client = new Client({ name: 'kavion-ci-probe', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);

const toolsResult = await client.listTools();
const statusResult = await client.callTool({ name: 'kavion_status', arguments: {} });
await client.close();

const statusText = statusResult.content?.[0]?.text ?? '';
const status = JSON.parse(statusText);

if (status.workspace !== workspace) {
  throw new Error(`expected workspace ${workspace}, got ${status.workspace}`);
}

if (!Array.isArray(toolsResult.tools) || toolsResult.tools.length < 10) {
  throw new Error(`expected MCP tools to be available, got ${toolsResult.tools?.length ?? 0}`);
}

console.log(JSON.stringify({
  ok: true,
  workspace: status.workspace,
  toolCount: toolsResult.tools.length,
}, null, 2));
