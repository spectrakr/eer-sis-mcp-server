import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllWorkflows } from "./workflow/index.js";

export function createMcpServer(): McpServer {
    const server = new McpServer({
        name: "eer-mcp",
        version: "1.0.0",
    });

    // Tools 등록
    registerAllTools(server);

    // Workflow Tools 등록
    registerAllWorkflows(server);

    return server;
}
