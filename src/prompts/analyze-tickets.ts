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

## 분석 단계:

### 1단계: 티켓 목록 조회
- ticket_select_list tool을 사용하여 해당 기간의 모든 티켓 조회
- 기본 통계 정보 수집:
  - 총 티켓 수 및 상태별 분포 (OPEN, CLOSED, ANSWER_ING 등)
  - 주요 문의 유형 (questionTitle 패턴 분석)
  - 고객별 문의 빈도
  - 담당자별 처리 현황
  - 채널별 분포

### 2단계: 개별 티켓 상세 분석 (중요 티켓)
조회된 티켓 중 다음 기준에 해당하는 **중요 티켓들**에 대해 종합 분석을 수행하세요:
- 미완료(OPEN) 상태 티켓
- 처리 시간이 오래 걸린 티켓
- 반복 문의 고객의 티켓
- 분석 초점과 관련된 티켓

**각 중요 티켓마다 다음 API를 모두 활용하여 종합 분석:**

1. **티켓 상세 조회**
   - Tool: qna_select_qna_form
   - Parameter: ticketId

2. **업무 로그 조회** (taskId가 있는 경우)
   - Tool: task_select_task_log_list
   - Parameter: taskId (티켓에서 확인)
   - 분석: 업무 진행 과정, 소요 시간, 담당자 활동

3. **그룹 티켓 조회**
   - Tool: qna_select_group_ticket_list
   - Parameter: ticketId
   - 분석: 연관 티켓, 반복 문의 여부

4. **관련 지식 검색**
   - Tool: kb_select_search_kb_list
   - Parameter: searchValue (티켓 내용에서 키워드 추출)
   - 분석: 해결 방법, 유사 사례, 활용 가능한 KB

### 3단계: 종합 리포트 작성

다음 형식으로 구조화된 분석 리포트를 작성하세요:

#### 📊 전체 현황
- 기간: ${period}
- 총 티켓 수:
- 상태별 분포:
- 주요 통계:

#### 🔍 중요 티켓 상세 분석
각 중요 티켓에 대해:
- 티켓 ID 및 제목
- 현재 상태 및 진행 과정
- 업무 로그 요약 (있는 경우)
- 관련 티켓 및 반복 문의 여부
- 활용 가능한 KB 문서
- 권장 조치사항

---
**중요**: 각 중요 티켓에 대해 반드시 4가지 API를 모두 활용하여 종합적인 분석을 제공하세요.`,
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
