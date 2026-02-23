import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";

/**
 * 티켓 검색 프롬프트
 *
 * 사용자가 자연어로 티켓을 검색할 수 있도록 돕는 프롬프트입니다.
 */
export function registerSearchTicketsPrompt(server: McpServer): void {
  server.registerPrompt(
    "search_tickets",
    {
      description: "자연어로 티켓을 검색합니다. 검색 조건을 자연어로 입력하면 적절한 tool 호출로 변환합니다.",
      argsSchema: {
        query: z.string().describe("검색 조건 (예: '오늘 접수된 미완료 티켓', '지난 주 홍길동 고객의 티켓')"),
      },
    },
    async ({ query }) => {
      const today = new Date();
      const todayStr = formatDate(today);
      const yesterdayStr = formatDate(new Date(today.getTime() - 24 * 60 * 60 * 1000));
      const weekAgoStr = formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `사용자가 다음과 같이 티켓을 검색하고 싶어합니다:

"${query}"

현재 날짜: ${todayStr}
어제: ${yesterdayStr}
일주일 전: ${weekAgoStr}

ticket_select_list tool을 사용하여 이 검색 조건에 맞는 티켓을 찾아주세요.

참고:
- 날짜 형식: YYYYMMDDHHMMSS (예: 20260219000000)
- "오늘"은 ${todayStr}000000 ~ ${todayStr}235959
- "어제"는 ${yesterdayStr}000000 ~ ${yesterdayStr}235959
- "지난 주"는 ${weekAgoStr}000000 ~ ${todayStr}235959
- ticketStatus: ALL (전체), OPEN (미완료), CLOSED (완료), ANSWER_ING (답변중)
- 고객 이름, 이메일, 전화번호 등으로 필터링 가능

검색 결과를 사용자가 이해하기 쉽게 요약해서 보여주세요.`,
            },
          },
        ],
      };
    }
  );
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
