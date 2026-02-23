import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";

/**
 * 티켓 분석 프롬프트
 *
 * 특정 기간의 티켓 데이터를 분석하고 인사이트를 제공합니다.
 */
export function registerAnalyzeTicketsPrompt(server: McpServer): void {
  server.registerPrompt(
    "analyze_tickets",
    {
      description: "특정 기간의 티켓 데이터를 분석하고 패턴, 트렌드, 문제점을 파악합니다.",
      argsSchema: {
        period: z.string().describe("분석 기간 (예: '오늘', '이번 주', '지난 달', '최근 7일')"),
        focus: z.string().optional().describe("분석 초점 (예: '응답 시간', '고객 만족도', '처리 현황', '담당자별 현황')"),
      },
    },
    async ({ period, focus }) => {
      const today = new Date();
      const todayStr = formatDate(today);
      const weekAgoStr = formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
      const monthAgoStr = formatDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));

      const focusText = focus ? `\n특히 "${focus}"에 중점을 두고 분석해주세요.` : "";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `"${period}" 기간의 티켓 데이터를 분석해주세요.${focusText}

현재 날짜: ${todayStr}
일주일 전: ${weekAgoStr}
한 달 전: ${monthAgoStr}

분석 단계:
1. ticket_select_list tool을 사용하여 해당 기간의 모든 티켓 조회
2. 다음 항목들을 분석:
   - 총 티켓 수 및 상태별 분포 (OPEN, CLOSED, ANSWER_ING 등)
   - 주요 문의 유형 (questionTitle 패턴 분석)
   - 고객별 문의 빈도 (상위 고객 파악)
   - 담당자별 처리 현황 (accountName 분석)
   - 채널별 분포 (inChannelName, outChannelName)
3. 발견된 패턴과 인사이트 제시
4. 개선이 필요한 부분 제안

결과를 구조화된 리포트 형식으로 작성해주세요.`,
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
