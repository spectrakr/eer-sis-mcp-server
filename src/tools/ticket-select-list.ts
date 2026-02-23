import { z } from "zod/v3";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callCommand } from "../spring-client.js";
import { successContent, errorContent } from "../types.js";

// 티켓 행 타입 (Spring 응답의 dataList 항목)
interface TicketRow {
  ticketId?: string;
  ticketStatus?: string;
  questionTitle?: string;
  customerName?: string;
  customerId?: string;
  customerEmail?: string;
  customerTel?: string;
  customerNo?: string;
  accountId?: string;
  accountName?: string;
  conversationType?: string;
  connectDate?: string;
  nodePath?: string;
  [key: string]: unknown;
}

interface TicketListResponse {
  ajaxCallResult: string;
  ajaxCallErrorCode?: string;
  ajaxCallMessage?: string;
  totalCount?: number;
  totalPage?: number;
  dataList?: TicketRow[];
}

export function registerTicketSelectList(server: McpServer): void {
  server.registerTool(
    "ticket_select_list",
    {
      description:
        "티켓 목록을 조회합니다. (command: ticketUIService.selectList)\n" +
        "날짜 형식: YYYYMMDDHHMMSS (예: 20260219000000)",
      inputSchema: {
        // 날짜 범위 (필수)
        startDate: z
          .string()
          .regex(/^\d{14}$/, "YYYYMMDDHHMMSS 형식이어야 합니다")
          .describe("조회 시작일시 (YYYYMMDDHHMMSS)"),
        endDate: z
          .string()
          .regex(/^\d{14}$/, "YYYYMMDDHHMMSS 형식이어야 합니다")
          .describe("조회 종료일시 (YYYYMMDDHHMMSS)"),

        // 페이지네이션
        page: z.number().int().min(1).optional().describe("페이지 번호 (기본값: 1)"),
        rows: z.number().int().min(1).max(100).optional().describe("페이지당 행 수 (기본값: 20)"),

        // 날짜 기준
        dateType: z
          .enum(["connect_date", "end_date", "create_date"])
          .optional()
          .describe("날짜 기준 컬럼 (기본값: connect_date)"),

        // 티켓 상태
        ticketStatus: z
          .enum(["ALL", "OPEN", "CLOSED", "PENDING", "RESOLVED", "ANSWER_ING"])
          .optional()
          .describe("티켓 상태 (기본값: ALL)"),

        // 고객 검색
        customerName: z.string().optional().describe("고객 이름"),
        customerId: z.string().optional().describe("고객 ID"),
        customerEmail: z.string().optional().describe("고객 이메일"),
        customerTel: z.string().optional().describe("고객 전화번호"),
        customerNo: z.string().optional().describe("고객사 명"),

        // 티켓 검색
        questionTitle: z.string().optional().describe("티켓 제목"),
        searchTicketId: z.string().optional().describe("티켓 ID 검색"),
        searchContents: z.string().optional().describe("티켓 내용 검색"),

        // 채널
        accountId: z.string().optional().describe("계정 ID"),
        nodeId: z.string().optional().describe("노드 ID"),
      },
    },
    async (args) => {
      const params: Record<string, unknown> = {
        // 페이지네이션
        page: args.page ?? 1,
        rows: args.rows ?? 20,

        // 검색 플래그 (중요: false로 설정)
        isNewSearch: "false",
        isDetailSearch: "false",
        dbSearchFlag: "Y",

        // 날짜
        startDate: args.startDate,
        endDate: args.endDate,
        dateType: args.dateType ?? "connect_date",
        dateRange: "",

        // 티켓 상태
        ticketStatus: args.ticketStatus ?? "ALL",
        selectTicketStatus: args.ticketStatus ?? "ALL",
        selTicketStatus: args.ticketStatus ?? "ALL",
        selDetailTicketStatus: "ALL",

        // 대화 유형
        conversationType: "",
        selConversationType: "",
        selDetailConversationType: "",

        // 고객 정보
        customerId: args.customerId ?? "",
        customerName: args.customerName ?? "",
        customerEmail: args.customerEmail ?? "",
        customerTel: args.customerTel ?? "",
        customerNo: args.customerNo ?? "",
        customerNickname: "",
        selCustomerInfo: "",
        customerInfo: "",
        selDetailCustomerInfo: "",
        detailCustomerInfo: "",

        // 채널/계정
        accountId: args.accountId ?? "",
        accountGroupId: "",
        nodeId: args.nodeId ?? "",
        inChannelId: "",
        outChannelId: "",
        nodePath: "",
        accountName: "",
        whereAccountGroup: "",
        callMenu: "",

        // 티켓 검색
        questionTitle: args.questionTitle ?? "",
        searchTicketId: args.searchTicketId ?? "",
        searchContents: args.searchContents ?? "",
        searchSummary: "",
        searchString: "",

        // API 서비스
        apiServiceList: "",

        // 기타 파라미터
        selPerPage: "50",
        selectedCodeValue: "",
        targetField: "",
        answerType: "",
        whereFeedback: "ALL",
        feedback: "",
        whereAiScore: "ALL",
        aiScore: "",
        aiKeywordMatchType: "PARTIAL",
        aiKeyword: "",
        codesetId: "",
        codeValue: "",

        // jqGrid 파라미터
        _search: "false",
        nd: Date.now(),
        sidx: "",
        sord: "",
      };

      // option01 ~ option100 빈 값 추가
      for (let i = 1; i <= 100; i++) {
        params[`option${String(i).padStart(2, "0")}`] = "";
      }

      const response = await callCommand<TicketListResponse>(
        "ticketUIService.selectList",
        params
      );

      if (response.ajaxCallResult !== "S") {
        return errorContent(
          response.ajaxCallMessage ?? response.ajaxCallErrorCode ?? "알 수 없는 오류"
        );
      }

      if (!response.dataList || !Array.isArray(response.dataList)) {
        return errorContent("응답 데이터 형식이 올바르지 않습니다.");
      }

      const summary = {
        totalCount: response.totalCount ?? 0,
        totalPage: response.totalPage ?? 1,
        returnedCount: response.dataList.length,
        tickets: response.dataList.map((row) => ({
          ticketId: row.ticketId,
          status: row.ticketStatus,
          title: row.questionTitle,
          customerName: row.customerName,
          customerId: row.customerId,
          customerEmail: row.customerEmail,
          customerNo: row.customerNo,
          accountName: row.accountName,
          nodePath: row.nodePath,
          connectDate: row.connectDate,
        })),
      };

      return successContent(summary);
    }
  );
}
