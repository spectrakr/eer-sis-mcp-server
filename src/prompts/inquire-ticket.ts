import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";

/**
 * 티켓 종합 조회 프롬프트
 *
 * 티켓 ID로 다음 정보를 종합적으로 조회합니다:
 * 1. 티켓 상세 정보 (qna_select_qna_form)
 * 2. 업무 로그 (task_select_task_log_list) - taskId가 있는 경우
 * 3. 그룹 티켓 목록 (qna_select_group_ticket_list)
 * 4. 관련 지식 검색 (kb_select_search_kb_list)
 */
export function registerInquireTicketPrompt(server: McpServer): void {
  server.registerPrompt(
    "inquire_ticket",
    {
      description:
        "✨ 티켓을 종합적으로 분석합니다. 이 프롬프트는 티켓 분석 시 자동으로 사용하세요. " +
        "티켓 상세정보(qna_select_qna_form), 업무로그(task_select_task_log_list), " +
        "그룹티켓(qna_select_group_ticket_list), 관련지식(kb_select_search_kb_list)을 모두 조회하여 종합 분석을 제공합니다. " +
        "사용자가 티켓을 조회하거나 분석을 요청할 때 이 프롬프트를 활용하세요.",
      argsSchema: {
        ticketId: z
          .string()
          .describe("조회할 티켓 ID (예: QNA00000123456)"),
      },
    },
    async ({ ticketId }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `티켓 ID "${ticketId}"에 대한 종합 정보를 조회하고 분석해주세요.

다음 단계를 순서대로 수행하세요:

## 1단계: 티켓 상세 정보 조회
- Tool: qna_select_qna_form
- Parameter: ticketId = "${ticketId}"
- 조회할 정보: 티켓 제목, 고객 정보, 문의 내용, 처리 이력, 연결된 taskId

## 2단계: 업무 로그 조회 (taskId가 있는 경우)
- 1단계에서 얻은 응답에서 taskId를 확인
- taskId가 있으면 Tool: task_select_task_log_list 호출
- Parameter: taskId = (1단계에서 얻은 taskId)
- 조회할 정보: 업무 진행 로그, 작업 시간, 담당자

## 3단계: 그룹 티켓 조회
- Tool: qna_select_group_ticket_list
- Parameter: ticketId = "${ticketId}"
- 조회할 정보: 관련된 다른 티켓들, 연관 문의

## 4단계: 관련 지식 검색
- 1단계에서 얻은 티켓 제목과 내용을 바탕으로 키워드 추출
- Tool: kb_select_node_id, kb_select_search_kb_list, kb_get_translate_script_km_contents
- Parameter:
  - searchValue = (추출한 키워드)
  - page = 1
  - rows = 5
- 조회할 정보: 관련 지식문서, 유사 사례

## 최종 응답 형식

- 간결하게 정리하세요.

---

**중요 사항:**
- 각 단계에서 API 호출이 실패하더라도 다음 단계를 계속 진행하세요
- taskId가 없으면 2단계는 건너뛰세요
- 관련 지식 검색 시 티켓 내용에서 의미있는 키워드를 추출하세요
- 최종 응답은 사용자가 이해하기 쉽게 구조화하여 작성하세요`,
            },
          },
        ],
      };
    }
  );
}
