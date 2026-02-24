import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchTicketsPrompt } from "./search-tickets.js";
import { registerAnalyzeTicketsPrompt } from "./analyze-tickets.js";
import { registerDailyReportPrompt } from "./daily-report.js";
import { registerInquireTicketPrompt } from "./inquire-ticket.js";
import { registerTicketWorkflowPrompt } from "./ticket-workflow.js";

export function registerAllPrompts(server: McpServer): void {
  registerSearchTicketsPrompt(server);
  registerAnalyzeTicketsPrompt(server);
  registerDailyReportPrompt(server);
  registerInquireTicketPrompt(server);
  registerTicketWorkflowPrompt(server);
}
