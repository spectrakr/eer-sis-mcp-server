import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerInquireTicketWorkflow } from "./inquire-ticket-workflow.js";

export function registerAllWorkflows(server: McpServer): void {
    registerInquireTicketWorkflow(server);
}
