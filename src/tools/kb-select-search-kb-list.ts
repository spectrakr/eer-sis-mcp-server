import {z} from "zod/v3";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {callCommand} from "../spring-client.js";
import {successContent, errorContent} from "../types.js";

interface KbItem {
    kbId?: string;
    title?: string;
    approvalStatus?: string;
    hitCount?: number;
    attachCount?: number;
    createdBy?: string;
    createdName?: string;
    createdDate?: string;
    updatedBy?: string;
    updatedName?: string;
    updatedDate?: string;
    nodeId?: string;
    nodeName?: string;
    nodePath?: string;
    publicFlag?: string;
    webviewFlag?: string;

    [key: string]: unknown;
}

interface KbListResponse {
    ajaxCallResult: string;
    ajaxCallErrorCode?: string;
    ajaxCallMessage?: string;
    processResult?: string;
    dataCount?: number;
    dataList?: KbItem[];
    allKbIds?: string;
    uniqueCount?: number;
    dataPage?: number;
    pageNo?: number;
}

export function registerKbSelectSearchKbList(server: McpServer): void {
    server.registerTool(
        "kb_select_search_kb_list",
        {
            description:
                "지식(Knowledge Base) 목록을 검색합니다. (command: kbUIService.selectSearchKbList)\n" +
                "특정 날짜 범위, 노드, 키워드 등으로 지식을 검색할 수 있습니다.",
            inputSchema: {
                startDate: z
                    .string()
                    .regex(/^\d{14}$/, "YYYYMMDDHHMMSS 형식")
                    .describe("조회 시작일시 (YYYYMMDDHHMMSS)"),
                endDate: z
                    .string()
                    .regex(/^\d{14}$/, "YYYYMMDDHHMMSS 형식")
                    .describe("조회 종료일시 (YYYYMMDDHHMMSS)"),
                alias: z
                    .string()
                    .describe("고객 ID (티켓의 customerId 값, 예: 263)"),
                nodeId: z
                    .string()
                    .describe("노드 ID (티켓의 domainId 값, 예: NODE0000000456)"),
                kbId: z
                    .string()
                    .optional()
                    .describe("지식 ID로 검색 (예: KNOW0000005091)"),
                searchId: z
                    .string()
                    .optional()
                    .describe("검색 키워드"),
                page: z
                    .number()
                    .int()
                    .min(1)
                    .optional()
                    .describe("페이지 번호 (기본값: 1)"),
                rows: z
                    .number()
                    .int()
                    .min(1)
                    .max(100)
                    .optional()
                    .describe("페이지당 행 수 (기본값: 10)"),
            },
        },
        async (args) => {
            const response = await callCommand<KbListResponse>(
                "kbUIService.selectSearchKbList",
                {
                    rows: args.rows ?? 10,
                    page: args.page ?? 1,
                    startDate: args.startDate,
                    endDate: args.endDate,
                    alias: args.alias ?? "",
                    nodeId: args.nodeId ?? "",
                    kbId: args.kbId ?? "",
                    searchId: args.searchId ?? "",
                    whereBy: "created_by",
                    whereByType: "id",
                    whereHitCount: "",
                    hitCount: "",
                    incSubNodeFlag: "Y",
                    isFavorite: "Y",
                    webviewFlag: "Y",
                    nodeWebviewFlag: "Y",
                    publicFlag: "ALL",
                    approvalStatus: "APNOT",
                    dateType: "valide_date",
                    uniqueFlag: "Y",
                }
            );

            if (response.ajaxCallResult !== "S") {
                return errorContent(
                    response.ajaxCallMessage ?? response.ajaxCallErrorCode ?? "알 수 없는 오류"
                );
            }

            if (!response.dataList || !Array.isArray(response.dataList)) {
                return errorContent("지식 목록을 찾을 수 없습니다.");
            }

            const summary = {
                totalCount: response.dataCount ?? 0,
                returnedCount: response.dataList.length,
                pageNo: response.pageNo ?? 1,
                kbList: response.dataList.map((kb) => ({
                    kbId: kb.kbId,
                    title: kb.title,
                    nodeId: kb.nodeId,
                    nodePath: kb.nodePath,
                    creator: {
                        name: kb.createdName,
                        id: kb.createdBy,
                        date: kb.createdDate,
                    },
                    updater: {
                        name: kb.updatedName,
                        id: kb.updatedBy,
                        date: kb.updatedDate,
                    },
                    approvalStatus: kb.approvalStatus,
                    hitCount: kb.hitCount,
                    attachCount: kb.attachCount,
                    publicFlag: kb.publicFlag,
                    webviewFlag: kb.webviewFlag,
                })),
            };

            return successContent(summary);
        }
    );
}
