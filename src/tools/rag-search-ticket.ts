import { z } from "zod/v3";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorContent, successContent } from "../types.js";

const RAG_SERVER_URL = "http://localhost:8001";

interface SearchResult {
    ticket_id: string;
    question_title: string;
    contents: string;
    similarity: number;
    keyword_score: number;
    final_score: number;
}

export function registerRagSearchTicket(server: McpServer): void {
    server.registerTool(
        "rag_search_ticket",
        {
            description:
                "자연어 의미 기반 티켓 검색. (VectorDB RAG 하이브리드 검색)\n" +
                "키워드 매칭이 아닌 유사도 기반 — '로그인 안됨', '결제 오류' 같은 자연어 질의에 적합.\n" +
                "날짜/상태/고객 조건 검색은 ticket_select_list 사용.\n" +
                "⚠️ 반환된 ticket_id는 참고용 식별자일 뿐입니다. 이 결과만으로 절대 답변하지 마세요.\n" +
                "반드시 relevance=high/medium 결과의 ticket_id로 qna_select_qna_form을 호출해 전체 내용을 확인한 후 실제 관련성을 판단하세요.",
            annotations: { readOnlyHint: true, idempotentHint: true },
            inputSchema: {
                query: z.string().describe("검색할 자연어 질의 (예: '로그인이 안돼요', '결제 오류')"),
                top_k: z
                    .number()
                    .int()
                    .min(1)
                    .max(20)
                    .optional()
                    .default(5)
                    .describe("반환할 최대 결과 수 (기본값: 5)"),
                threshold: z
                    .number()
                    .min(0)
                    .max(1)
                    .optional()
                    .default(0.5)
                    .describe("벡터 유사도 최솟값 (기본값: 0.5, 범위: 0~1). 낮출수록 관련성이 낮은 결과 포함."),
            },
        },
        async (args) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                let response: Response;
                try {
                    response = await fetch(`${RAG_SERVER_URL}/search`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            query: args.query,
                            top_k: args.top_k,
                            threshold: args.threshold,
                        }),
                        signal: controller.signal,
                    });
                } finally {
                    clearTimeout(timeoutId);
                }

                if (!response.ok) {
                    return errorContent(`RAG 검색 서버 오류 (HTTP ${response.status}): ${await response.text()}`);
                }

                const results = (await response.json()) as SearchResult[];

                if (results.length === 0) {
                    return successContent({
                        message: "검색 결과가 없습니다. 다른 검색어를 시도해보세요.",
                        results: [],
                    });
                }

                const HIGH_THRESHOLD = 0.7;
                const MEDIUM_THRESHOLD = 0.5;

                const mapped = results.map((r) => ({
                    ticket_id: r.ticket_id,
                    question_title: r.question_title,
                    final_score: r.final_score,
                    similarity: r.similarity,
                    keyword_score: r.keyword_score,
                    relevance: r.final_score >= HIGH_THRESHOLD ? "high" : r.final_score >= MEDIUM_THRESHOLD ? "medium" : "low",
                    // contents_preview 제거: 미리보기만으로 답변 생성하는 것을 방지.
                    // 반드시 qna_select_qna_form으로 전체 내용을 조회 후 사용할 것.
                }));

                const highCount = mapped.filter((r) => r.relevance === "high").length;
                const mediumCount = mapped.filter((r) => r.relevance === "medium").length;
                const lowCount = mapped.filter((r) => r.relevance === "low").length;
                const hasUsable = highCount > 0 || mediumCount > 0;

                // Filter: if usable results exist, remove low-relevance to prevent contamination
                const filtered = hasUsable
                    ? mapped
                        .filter((r) => r.relevance !== "low")
                        .map((r) => ({
                            ticket_id: r.ticket_id,
                            relevance: r.relevance,
                            final_score: r.final_score,
                            question_title: r.question_title,
                        }))
                    : mapped.map((r) => ({
                        ticket_id: r.ticket_id,
                        final_score: r.final_score,
                        relevance: r.relevance,
                        // question_title 제거: low-only 결과에서 hallucination 방지
                    }));

                const warning = !hasUsable
                    ? "⚠️ 모든 결과의 관련성이 낮습니다(low). question_title을 참조하지 마세요. 검색어를 구체적으로 바꾸거나 ticket_select_list를 사용하세요."
                    : undefined;

                return successContent({
                    message: `${results.length}건 검색 → 사용가능 ${filtered.length}건 반환 (high:${highCount}, medium:${mediumCount}, low:${lowCount} 중 low 제외)`,
                    warning,
                    REQUIRED_NEXT_STEP:
                        "반드시 위 ticket_id로 qna_select_qna_form을 호출하여 실제 내용을 확인하세요. ticket_id 외의 정보(제목 등)만으로 답변을 생성하지 마세요.",
                    results: filtered,
                });
            } catch (error) {
                if (error instanceof Error && error.name === "AbortError") {
                    return errorContent(`RAG 검색 타임아웃 (30초). 서버 상태를 확인하세요.`);
                }
                if (error instanceof TypeError && error.message.includes("fetch")) {
                    return errorContent(
                        `RAG 검색 서버(${RAG_SERVER_URL})에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.`,
                    );
                }
                return errorContent(`RAG 검색 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
            }
        },
    );
}
