import { z } from "zod/v3";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callCommand } from "../spring-client.js";
import { successContent, errorContent } from "../types.js";

interface SelectNodeIdResponse {
  ajaxCallResult: string;
  ajaxCallErrorCode?: string;
  ajaxCallMessage?: string;
  processResult?: string;
  nodeId?: string;
  moreFlag?: string;
}

export function registerKbSelectNodeId(server: McpServer): void {
  server.registerTool(
    "kb_select_node_id",
    {
      description:
        "고객 정보로 지식(KB) 노드 ID를 조회합니다. (command: kbUIService.selectNodeId)\n" +
        "customerId와 customerNo를 사용하여 해당 고객의 지식이 저장된 nodeId를 가져옵니다.\n" +
        "이 nodeId는 kb_select_search_kb_list에서 사용됩니다.",
      inputSchema: {
        alias: z
          .string()
          .describe("고객 ID (티켓의 customerId 값, 예: 49)"),
        customerNo: z
          .string()
          .describe("고객사 명 (티켓의 customerNo 값, 예: LGU+)"),
        moreFlag: z
          .boolean()
          .optional()
          .describe("추가 플래그 (기본값: false)"),
      },
    },
    async (args) => {
      const response = await callCommand<SelectNodeIdResponse>(
        "kbUIService.selectNodeId",
        {
          alias: args.alias,
          customerNo: args.customerNo,
          moreFlag: args.moreFlag ? "true" : "false",
        }
      );

      if (response.ajaxCallResult !== "S") {
        return errorContent(
          response.ajaxCallMessage ?? response.ajaxCallErrorCode ?? "알 수 없는 오류"
        );
      }

      if (!response.nodeId) {
        return errorContent("노드 ID를 찾을 수 없습니다.");
      }

      const summary = {
        nodeId: response.nodeId,
        customerId: args.alias,
        customerNo: args.customerNo,
      };

      return successContent(summary);
    }
  );
}
