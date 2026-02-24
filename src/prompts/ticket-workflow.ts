import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod/v3";

/**
 * 티켓 워크플로우 프롬프트
 *
 * 워크플로우 타입에 따라 자동으로 적절한 API 호출 순서를 결정합니다.
 *
 * 워크플로우 타입:
 * - history: 이력 중심 분석 (유사 티켓 이력 심층 분석)
 * - technical: 기술 문제 분석 (KB 문서 중심)
 * - task: 업무 진행 분석 (Task 로그 중심)
 * - comprehensive: 종합 분석 (모든 정보)
 * - quick: 빠른 조회 (기본 정보만)
 */

// ============================================
// 재사용 가능한 도구 사용 프롬프트 블록
// ============================================

const TOOL_TICKET_DETAIL = (ticketId: string) => `### 티켓 상세 정보 조회 ✅
\`\`\`
Tool: qna_select_qna_form
Parameter: ticketId = "${ticketId}"
\`\`\`
**수집 정보:**
- 티켓 제목, 내용, 고객 정보
- 문의 유형 및 키워드
- 연결된 taskId (있는 경우)
- 처리 이력 (processHistory)`;

const TOOL_TASK_LOG = (taskId: string) => `### 업무 로그 조회 ✅
\`\`\`
Tool: task_select_task_log_list
Parameter: taskId = ${taskId}
\`\`\`
**분석 정보:**
- 업무 로그 (taskLogContents);
`

const TOOL_GROUP_TICKETS = (ticketId: string) => `### 그룹 티켓 조회 ✅
\`\`\`
Tool: qna_select_group_ticket_list
Parameter: ticketId = "${ticketId}"
\`\`\`
**수집 정보:**
- 같은 그룹의 연관 티켓들`;

const TOOL_SITE_LINKS = (ticketId: string) => `### 사이트 연결 링크 조회 ✅
\`\`\`
Tool: qna_select_site_conn_link_list
Parameter: ticketId = "${ticketId}"
\`\`\`
**목적:** 
- 고객 사이트 환경 정보 파악`;

const TOOL_SIMILAR_TICKETS = (params: {
    searchType: "keyword" | "customer";
    rows: number;
    period?: string;
}) => `### 유사 티켓 검색 ✅
\`\`\`
Tool: ticket_select_list
Parameter:
  ${params.searchType === "keyword" ? "- questionTitle = (추출한 핵심 키워드)" : ""}
  ${params.searchType === "customer" ? "- customerName = (고객명)" : ""}
  - ticketStatus = "ALL"
  - startDate = ${params.period || "최근 3개월"}
  - endDate = (현재)
  - rows = ${params.rows || 10}
\`\`\`
**목적:** 유사한 과거 티켓 이력 검색`;

const TOOL_SIMILAR_TICKET_DETAILS = (count: number) => `### 유사 티켓 상세 조회 ✅
\`\`\`
상위 ${count}개 유사 티켓에 대해:
Tool: qna_select_qna_form
Parameter: ticketId = (각 유사 티켓 ID)
\`\`\`
**분석 대상:** 해결 방법, 처리 과정, 결과`;

// ============================================
// 워크플로우별 리포트 템플릿
// ============================================

const REPORT_TICKET_SUMMARY = (ticketId: string) => `### 티켓 개요
- 티켓 ID: ${ticketId}
- 제목 및 주요 내용
- 고객 정보 및 상태
- 접수일시`;

const REPORT_HISTORY_ANALYSIS = (count: number) => `### 유사 이력 분석
- 총 ${count}건의 유사 티켓 발견
- **패턴 분석:**
  - 반복되는 문제: (공통점 파악)
  - 성공한 해결 방법: (효과적이었던 방법들)
  - 실패한 시도: (피해야 할 방법들)`;

const REPORT_RECOMMENDATIONS = `### 권장 조치
**권장사항:**
1. (최우선 추천 방법)
2. (대안 방법 1)
3. (대안 방법 2)

### 즉시 실행 가능한 액션
1. (우선순위 1)
2. (우선순위 2)
3. (우선순위 3)`;

const REPORT_TECHNICAL_SOLUTION = `### 기술 문제 요약
- 문제 유형 및 키워드
- 영향 범위

### 즉시 실행 가능한 단계별 가이드
1. [1단계] (구체적 실행 방법)
2. [2단계] (다음 조치)
3. [3단계] (검증 방법)`;

// ============================================
// 메인 프롬프트 등록
// ============================================

export function registerTicketWorkflowPrompt(server: McpServer): void {
    server.registerPrompt(
        "ticket_workflow",
        {
            description:
                "워크플로우 타입에 따라 티켓을 분석합니다. " +
                "워크플로우: history(이력분석), technical(기술분석), comprehensive(종합분석), quick(빠른조회)",
            argsSchema: {
                ticketId: z
                    .string()
                    .describe("조회할 티켓 ID (예: QNA00000123456)"),
                workflow: z
                    .enum(["history", "technical", "comprehensive", "quick"])
                    .default("comprehensive")
                    .describe(
                        "워크플로우 타입: history(이력), technical(기술), comprehensive(종합), quick(빠른)"
                    ),
                depth: z
                    .enum(["shallow", "normal", "deep"])
                    .default("normal")
                    .describe("분석 깊이: shallow(얕게), normal(보통), deep(깊게)"),
            },
        },
        async ({ticketId, workflow, depth}) => {
            // 워크플로우별 프롬프트 생성
            const workflows = {
                history: generateHistoryWorkflow(ticketId, depth),
                technical: generateTechnicalWorkflow(ticketId, depth),
                comprehensive: generateComprehensiveWorkflow(ticketId, depth),
                quick: generateQuickWorkflow(ticketId),
            };

            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: workflows[workflow || "comprehensive"],
                        },
                    },
                ],
            };
        }
    );
}

// 이력 중심 워크플로우
function generateHistoryWorkflow(ticketId: string, depth: string): string {
    const rows = depth === "deep" ? 20 : depth === "normal" ? 10 : 5;
    const detailCount = depth === "deep" ? 5 : depth === "normal" ? 5 : 3;

    const steps = [
        "## 1단계",
        TOOL_TICKET_DETAIL(ticketId),
        "## 2단계",
        TOOL_GROUP_TICKETS(ticketId),
        "## 3단계",
        TOOL_SIMILAR_TICKETS({searchType: "keyword", rows, period: "(최근 3개월)"}),
        "## 4단계",
        TOOL_SIMILAR_TICKET_DETAILS(detailCount),
        "## 5단계",
        TOOL_TASK_LOG("(각 티켓의 taskId)"),
        "**분석:** 과거 문제 해결 과정, 소요 시간, 성공/실패 패턴",
    ];

    steps.push(
        "\n## 6단계",
        TOOL_TASK_LOG("(1단계의 taskId)")
    );

    const report = [
        REPORT_TICKET_SUMMARY(ticketId),
        REPORT_HISTORY_ANALYSIS(rows),
        `### 🔍 상세 이력 케이스
각 케이스별:
- 티켓 ID 및 일시
- 문제 상황 및 해결 과정`,
        REPORT_RECOMMENDATIONS,
    ];

    return `티켓 ID "${ticketId}"에 대한 **이력 중심 분석**을 수행합니다.

## 워크플로우: HISTORY (이력 분석)

유사한 과거 이력을 찾아 심층 분석합니다.

${steps.join("\n")}

---

## 최종 분석 리포트

${report.join("\n")}

---
**워크플로우 완료:** 모든 단계 API 호출 완료 및 종합 분석 제공`;
}

// 기술 문제 워크플로우
function generateTechnicalWorkflow(ticketId: string, depth: string): string {
    const ticketRows = depth === "deep" ? 15 : 5;

    const steps = [
        "## 1단계",
        TOOL_TICKET_DETAIL(ticketId),
        "## 2단계",
        TOOL_GROUP_TICKETS(ticketId),
        "**키워드 추출:** 키워드, 에러 메시지, 제품명",
        "## 3단계",
        TOOL_SITE_LINKS(ticketId),
        "## 4단계",
        TOOL_SIMILAR_TICKETS({searchType: "keyword", rows: ticketRows, period: "(최근 6개월)"}),
        "## 5단계",
        "claude-code 의 경우 workspace 내 코드 분석"
    ];

    return `티켓 ID "${ticketId}"에 대한 **기술 문제 분석**을 수행합니다.

## 워크플로우: TECHNICAL (기술 분석)

KB 문서와 기술 솔루션 중심으로 분석합니다.

${steps.join("\n")}

---

## 최종 기술 분석 리포트

${REPORT_TICKET_SUMMARY(ticketId)}

${REPORT_TECHNICAL_SOLUTION}

### 유사 사례
- 과거 해결된 유사 기술 이슈
- 해결 방법 및 결과

---

**워크플로우 완료:** 기술 솔루션 제공`;
}

// 종합 워크플로우
function generateComprehensiveWorkflow(ticketId: string, depth: string): string {
    const ticketRows = depth === "deep" ? 15 : depth === "normal" ? 10 : 5;
    const detailCount = depth === "deep" ? 5 : 3;
    const kbRows = depth === "deep" ? 10 : 5;

    const phase1 = [
        "### Phase 1: 기본 정보 수집",
        "#### 1-1",
        TOOL_TICKET_DETAIL(ticketId),
        "#### 1-2",
        TOOL_GROUP_TICKETS(ticketId),
        "#### 1-3",
        TOOL_SITE_LINKS(ticketId),
    ];

    const phase2 = [
        "### Phase 2: 이력 분석",
        "#### 2-1",
        TOOL_SIMILAR_TICKETS({searchType: "keyword", rows: ticketRows}),
        "#### 2-2",
        TOOL_SIMILAR_TICKET_DETAILS(detailCount),
    ];

    const phase3 = [
        "### Phase 3: 업무 분석",
        "#### 3-1",
        TOOL_TASK_LOG("(1-1의 taskId, 있는 경우)"),
        "#### 3-2",
        TOOL_TASK_LOG("(2-2 티켓들의 taskId)"),
    ];

    return `티켓 ID "${ticketId}"에 대한 **종합 분석**을 수행합니다.

## 워크플로우: COMPREHENSIVE (종합 분석)

모든 측면을 균형있게 분석합니다.

${phase1.join("\n")}

${phase2.join("\n")}

${phase3.join("\n")}

---

## 최종 종합 리포트

### 📋 Executive Summary
- 티켓 개요 및 핵심 이슈
- 현재 상태
- 권장 조치 (3줄 요약)

### 🔍 상세 분석

#### A. 티켓 정보
${REPORT_TICKET_SUMMARY(ticketId)}

#### B. 이력 분석
${REPORT_HISTORY_ANALYSIS(ticketRows)}

#### C. 기술 솔루션
${REPORT_TECHNICAL_SOLUTION}

#### D. 연관 정보
- 그룹 티켓, 관련 사이트, 추가 참고사항

### 🎯 종합 권장사항

#### 즉시 실행
1. (최우선 조치)
2. (긴급 조치)

#### 단기 (1-3일)
1. (계획된 조치)

#### 중장기
1. (개선 및 예방 조치)

### 📊 리스크 평가
- 복잡도, 긴급도, 예상 난이도 평가

---
**워크플로우 완료:** 모든 Phase 완료 및 종합 분석 제공`;
}

// 빠른 조회 워크플로우
function generateQuickWorkflow(ticketId: string): string {
    const steps = [
        "## 1단계",
        TOOL_TICKET_DETAIL(ticketId),
        "## 2단계",
        TOOL_GROUP_TICKETS(ticketId),
        "## 3단계",
        TOOL_TASK_LOG("(1단계의 taskId, 있는 경우만)"),
    ];

    return `티켓 ID "${ticketId}"에 대한 **빠른 조회**를 수행합니다.

## 워크플로우: QUICK (빠른 조회)

필수 정보만 빠르게 확인합니다.

${steps.join("\n")}

---

## 간단 요약 리포트

### 📋 기본 정보
- 티켓 ID: ${ticketId}
- 제목 및 상태
- 고객 정보

### 📝 문의 내용
(핵심만 3줄 요약)

### 📊 현황
- 접수일 및 처리 상태
- 관련 티켓 건수

### 🎯 다음 조치
(한 줄 권장사항)

---
**워크플로우 완료:** 기본 정보 제공`;
}