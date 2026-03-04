import { z } from "zod/v3";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callCommand } from "../spring-client.js";
import { successContent, errorContent } from "../types.js";

// siteId 기반 10분 TTL 인메모리 캐시
const CACHE_TTL_MS = 10 * 60 * 1000;
const linkCache = new Map<string, { data: unknown; expireAt: number }>();

// 링크 항목 타입
interface LinkItem {
    link_name?: string;
    link_type?: string;
    link_url?: string;

    [key: string]: unknown;
}

interface SiteConnLinkListResponse {
    ajaxCallResult: string;
    ajaxCallErrorCode?: string;
    ajaxCallMessage?: string;
    processResult?: string;
    siteId?: string;
    linkList?: LinkItem[];
}

export function registerQnaSelectSiteConnLinkList(server: McpServer): void {
    server.registerTool(
        "qna_select_site_conn_link_list",
        {
            description:
                "고객 사이트 연결 링크 목록 조회. (command: qnaUIService.selectSiteConnLinkList)\n" +
                "siteId = 티켓의 customerId. 시나리오·문서·GIT·산출물 링크 반환 (대부분 구글 드라이브).",
            annotations: { readOnlyHint: true, idempotentHint: true },
            inputSchema: {
                siteId: z.string().describe("고객 사이트 ID (티켓의 customerId 값)"),
            },
        },
        async (args) => {
            const cached = linkCache.get(args.siteId);
            if (cached && cached.expireAt > Date.now()) {
                return successContent(cached.data);
            }

            const response = await callCommand<SiteConnLinkListResponse>("qnaUIService.selectSiteConnLinkList", {
                siteId: args.siteId,
            });

            if (response.ajaxCallResult !== "S") {
                return errorContent(response.ajaxCallMessage ?? response.ajaxCallErrorCode ?? "알 수 없는 오류");
            }

            if (!response.linkList || !Array.isArray(response.linkList)) {
                return errorContent("링크 목록을 찾을 수 없습니다.");
            }

            // link_type 설명 매핑
            const linkTypeMap: Record<string, string> = {
                SI: "사이트 접속 정보",
                AM: "AM 문서",
                CI: "CI 문서",
                RD: "참고 문서",
                PR: "프로젝트(GIT)",
                SD: "산출물",
            };

            const summary = {
                siteId: response.siteId,
                totalCount: response.linkList.length,
                links: response.linkList.map((item) => ({
                    name: item.link_name,
                    type: item.link_type,
                    typeDescription: linkTypeMap[item.link_type ?? ""] ?? item.link_type,
                    url: item.link_url,
                })),
            };

            linkCache.set(args.siteId, { data: summary, expireAt: Date.now() + CACHE_TTL_MS });

            return successContent(summary);
        },
    );
}
