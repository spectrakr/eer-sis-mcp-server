import {z} from "zod/v3";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {callCommand} from "../spring-client.js";
import {successContent, errorContent} from "../types.js";

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
                "고객 사이트와 연결된 링크 목록을 조회합니다. (command: qnaUIService.selectSiteConnLinkList)\n" +
                "시나리오, 문서, GIT 저장소, 산출물 등의 링크를 가져옵니다.\n" +
                "링크들 중 대부분은 구글 드라이브 내 문서이므로 구글 드라이브 커넥터를 이용합니다.\n" +
                "siteId는 티켓의 customerId 값입니다.",
            inputSchema: {
                siteId: z
                    .string()
                    .describe("고객 사이트 ID (티켓의 customerId 값)"),
            },
        },
        async (args) => {
            const response = await callCommand<SiteConnLinkListResponse>(
                "qnaUIService.selectSiteConnLinkList",
                {
                    siteId: args.siteId,
                }
            );

            if (response.ajaxCallResult !== "S") {
                return errorContent(
                    response.ajaxCallMessage ?? response.ajaxCallErrorCode ?? "알 수 없는 오류"
                );
            }

            if (!response.linkList || !Array.isArray(response.linkList)) {
                return errorContent("링크 목록을 찾을 수 없습니다.");
            }

            // link_type 설명 매핑
            const linkTypeMap: Record<string, string> = {
                SI: "시나리오",
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

            return successContent(summary);
        }
    );
}
