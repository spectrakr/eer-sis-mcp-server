import { z } from "zod/v3";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callCommand } from "../spring-client.js";
import { successContent, errorContent } from "../types.js";

// 그룹 티켓 항목 타입
interface GroupTicketItem {
  no?: number;
  ticketId?: string;
  domainId?: string;
  serviceType?: string;
  accountId?: string;
  accountName?: string;
  questionTitle?: string;
  customerPriority?: number;
  inAttachCount?: number;
  outAttachCount?: number;
  returnCount?: number;
  backCount?: number;
  ticketStatus?: string;
  ticketFlag?: number;
  approvalStatus?: string;
  connectDate?: string;
  endDate?: string;
  afterFlag?: string;
  feedback?: number;
  processSeq?: number;
  [key: string]: unknown;
}

interface GroupTicketListResponse {
  ajaxCallResult: string;
  ajaxCallErrorCode?: string;
  ajaxCallMessage?: string;
  totalCount?: number;
  processResult?: string;
  historyList?: GroupTicketItem[];
}

export function registerQnaSelectGroupTicketList(server: McpServer): void {
  server.registerTool(
    "qna_select_group_ticket_list",
    {
      description:
        "특정 티켓과 관련된 그룹 티켓 목록을 조회합니다. (command: qnaUIService.selectGroupTicketList)\n" +
        "같은 주제로 묶인 티켓들의 이력을 확인할 수 있습니다.",
      inputSchema: {
        ticketId: z
          .string()
          .regex(/^TCKT\d{10}$/, "티켓 ID 형식: TCKT + 10자리 숫자")
          .describe("티켓 ID (예: TCKT0000176991)"),
        serviceType: z
          .string()
          .optional()
          .describe("서비스 타입 (기본값: SVQNA)"),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("페이지 번호 (기본값: 1)"),
        rows: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("페이지당 행 수 (기본값: 10)"),
      },
    },
    async (args) => {
      const response = await callCommand<GroupTicketListResponse>(
        "qnaUIService.selectGroupTicketList",
        {
          ticketId: args.ticketId,
          servicetype: args.serviceType ?? "SVQNA",
          page: args.page ?? 1,
          rows: args.rows ?? 10,
        }
      );

      if (response.ajaxCallResult !== "S") {
        return errorContent(
          response.ajaxCallMessage ?? response.ajaxCallErrorCode ?? "알 수 없는 오류"
        );
      }

      if (!response.historyList || !Array.isArray(response.historyList)) {
        return errorContent("그룹 티켓 목록을 찾을 수 없습니다.");
      }

      const summary = {
        totalCount: response.totalCount ?? 0,
        returnedCount: response.historyList.length,
        tickets: response.historyList.map((item) => ({
          no: item.no,
          ticketId: item.ticketId,
          status: item.ticketStatus,
          title: item.questionTitle,
          accountName: item.accountName,
          connectDate: item.connectDate,
          endDate: item.endDate,
          attachments: {
            inCount: item.inAttachCount ?? 0,
            outCount: item.outAttachCount ?? 0,
          },
          feedback: item.feedback,
        })),
      };

      return successContent(summary);
    }
  );
}
