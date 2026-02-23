import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTicketSelectList } from "./ticket-select-list.js";
import { registerQnaSelectQnaForm } from "./qna-select-qna-form.js";
import { registerQnaSelectGroupTicketList } from "./qna-select-group-ticket-list.js";
import { registerQnaSelectSiteConnLinkList } from "./qna-select-site-conn-link-list.js";
import { registerKbSelectSearchKbList } from "./kb-select-search-kb-list.js";
import { registerKbGetTranslateScriptKmContents } from "./kb-get-translate-script-km-contents.js";
import { registerKbSelectNodeId } from "./kb-select-node-id.js";
import { registerUpdateSessionId } from "./update-session-id.js";
import { registerTaskSelectTaskLogList } from "./task-select-task-log-list.js";

export function registerAllTools(server: McpServer): void {
  // System tools
  registerUpdateSessionId(server);

  // ticketUIService
  registerTicketSelectList(server);

  // qnaUIService
  registerQnaSelectQnaForm(server);
  registerQnaSelectGroupTicketList(server);
  registerQnaSelectSiteConnLinkList(server);

  // kbUIService
  registerKbSelectNodeId(server);
  registerKbSelectSearchKbList(server);
  registerKbGetTranslateScriptKmContents(server);

  // taskUIService
  registerTaskSelectTaskLogList(server);

  // TODO: 추가 command는 여기에 등록
  // registerTicketCreate(server);
  // ...
}
