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
                "자연어 쿼리로 티켓을 의미 검색합니다. (VectorDB RAG 검색)\n" +
                "벡터 유사도와 키워드 점수를 결합한 하이브리드 검색을 수행합니다.\n" +
                "반환된 ticket_id로 qna_select_qna_form 툴을 호출하면 티켓 상세 정보를 조회할 수 있습니다.",
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
                    .default(0.3)
                    .describe("벡터 유사도 최솟값 (기본값: 0.3, 범위: 0~1)"),
            },
        },
        async (args) => {
            try {
                const response = await fetch(`${RAG_SERVER_URL}/search`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        query: args.query,
                        top_k: args.top_k,
                        threshold: args.threshold,
                    }),
                });

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

                return successContent({
                    message: `${results.length}건의 관련 티켓을 찾았습니다.`,
                    hint: "ticket_id를 사용하여 qna_select_qna_form 툴로 티켓 상세 정보를 조회할 수 있습니다.",
                    results: results.map((r) => ({
                        ticket_id: r.ticket_id,
                        question_title: r.question_title,
                        final_score: r.final_score,
                        similarity: r.similarity,
                        keyword_score: r.keyword_score,
                        contents_preview: r.contents.slice(0, 200) + (r.contents.length > 200 ? "..." : ""),
                    })),
                });
            } catch (error) {
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
