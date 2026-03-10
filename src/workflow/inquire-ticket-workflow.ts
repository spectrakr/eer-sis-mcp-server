import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import { callCommand } from "../spring-client.js";
import { successContent, errorContent } from "../types.js";

// ── 내부 타입 ──────────────────────────────────────────────

interface QnaForm {
    refQnaId?: string;
    qnaId?: string;
    ticketStatus?: string;
    questionTitle?: string;
    answerTitle?: string;
    customerId?: string;
    customerEmail?: string;
    customerName?: string;
    customerNo?: string;
    customerTel?: string;
    accountId?: string;
    accountName?: string;
    nodePath?: string;
    connectDate?: string;
    startDate?: string;
    endDate?: string;
    qnaProcessHistoryFormList?: ProcessHistory[];
    inAttachList?: unknown[];
    outAttachList?: unknown[];
    taskId?: string;
    [key: string]: unknown;
}

interface ProcessHistory {
    processSeq?: number;
    processType?: string;
    status?: string;
    title?: string;
    accountName?: string;
    createdDate?: string;
    attachCount?: number;
    [key: string]: unknown;
}

interface QnaFormResponse {
    ajaxCallResult: string;
    ajaxCallErrorCode?: string;
    ajaxCallMessage?: string;
    dataMap?: { qnaForm?: QnaForm };
}

interface GroupTicketItem {
    ticketId?: string;
    [key: string]: unknown;
}

interface GroupTicketListResponse {
    ajaxCallResult: string;
    ajaxCallErrorCode?: string;
    ajaxCallMessage?: string;
    totalCount?: number;
    historyList?: GroupTicketItem[];
}

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
    siteId?: string;
    linkList?: LinkItem[];
}

interface TaskLog {
    logId?: string;
    taskId?: string;
    logStatus?: string;
    logTime?: number;
    taskLogContents?: string;
    attachList?: unknown[];
    createdName?: string;
    createdBy?: string;
    createdDate?: string;
    updatedName?: string;
    updatedBy?: string;
    updatedDate?: string;
    [key: string]: unknown;
}

interface TaskLogListResponse {
    ajaxCallResult: string;
    ajaxCallErrorCode?: string;
    ajaxCallMessage?: string;
    processResult?: string;
    taskLogList?: TaskLog[];
}

// ── 정제 헬퍼 ─────────────────────────────────────────────

function sanitizeContents(contents: string | undefined): string {
    if (!contents) return "";
    let s = contents;
    s = s.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, "");
    s = s.replace(/<img[^>]+src="([^"]+)"[^>]*>/gi, (_, url) => {
        const filename = url.split("/").pop()?.split("?")[0] || "image";
        return `[IMAGE: ${filename}] `;
    });
    s = s.replace(/fileInfo=[A-Za-z0-9+/%=]+/g, "");
    s = s.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");
    s = s.replace(/<[^>]+>/g, " ");
    s = s
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
    s = s.replace(/\s+/g, " ").trim();
    return s;
}

function buildTicketSummary(qna: QnaForm) {
    return {
        ticketId: qna.refQnaId ?? qna.qnaId,
        taskId: qna.taskId,
        status: qna.ticketStatus,
        questionTitle: qna.questionTitle,
        answerTitle: qna.answerTitle,
        customer: {
            id: qna.customerId,
            name: qna.customerName,
            email: qna.customerEmail,
            tel: qna.customerTel,
            companyNo: qna.customerNo,
        },
        assignee: {
            accountId: qna.accountId,
            accountName: qna.accountName,
        },
        nodePath: qna.nodePath,
        dates: {
            connected: qna.connectDate,
            started: qna.startDate,
            ended: qna.endDate,
        },
        processHistory: (qna.qnaProcessHistoryFormList ?? []).map((h) => ({
            processSeq: h.processSeq,
            processType: h.processType,
            status: h.status,
            title: h.title,
            accountName: h.accountName,
            createdDate: h.createdDate,
            attachCount: h.attachCount,
        })),
        attachments: {
            inCount: qna.inAttachList?.length ?? 0,
            outCount: qna.outAttachList?.length ?? 0,
        },
    };
}

// ── 내부 fetch 함수 ───────────────────────────────────────

async function fetchTicketDetail(ticketId: string) {
    try {
        const response = await callCommand<QnaFormResponse>("qnaUIService.selectQnaForm", { ticketId });
        if (response.ajaxCallResult !== "S" || !response.dataMap?.qnaForm) return null;
        return buildTicketSummary(response.dataMap.qnaForm);
    } catch {
        return null;
    }
}

async function fetchTaskLog(taskId: string) {
    try {
        const response = await callCommand<TaskLogListResponse>("taskUIService.selectTaskLogList", { taskId });
        if (response.ajaxCallResult !== "S" && response.processResult !== "S") return null;
        if (!response.taskLogList?.length) return null;
        return {
            taskId,
            totalLogs: response.taskLogList.length,
            logs: response.taskLogList.map((log) => ({
                logId: log.logId,
                taskId: log.taskId,
                logStatus: log.logStatus,
                logTime: log.logTime,
                contents: sanitizeContents(log.taskLogContents),
                createdBy: log.createdName ?? log.createdBy,
                createdDate: log.createdDate,
                updatedBy: log.updatedName ?? log.updatedBy,
                updatedDate: log.updatedDate,
                attachmentCount: log.attachList?.length ?? 0,
            })),
        };
    } catch {
        return null;
    }
}

async function fetchSiteLinks(siteId: string) {
    try {
        const response = await callCommand<SiteConnLinkListResponse>("qnaUIService.selectSiteConnLinkList", { siteId });
        if (response.ajaxCallResult !== "S" || !Array.isArray(response.linkList)) return null;
        const linkTypeMap: Record<string, string> = {
            SI: "사이트 접속 정보",
            AM: "AM 문서",
            CI: "CI 문서",
            RD: "참고 문서",
            PR: "프로젝트(GIT)",
            SD: "산출물",
        };
        return {
            siteId: response.siteId,
            totalCount: response.linkList.length,
            links: response.linkList.map((item) => ({
                name: item.link_name,
                type: item.link_type,
                typeDescription: linkTypeMap[item.link_type ?? ""] ?? item.link_type,
                url: item.link_url,
            })),
        };
    } catch {
        return null;
    }
}

async function fetchGroupTicketList(ticketId: string) {
    try {
        const response = await callCommand<GroupTicketListResponse>("qnaUIService.selectGroupTicketList", {
            ticketId,
            servicetype: "SVQNA",
            page: 1,
            rows: 100,
        });
        if (response.ajaxCallResult !== "S" || !Array.isArray(response.historyList)) return null;
        return {
            totalCount: response.totalCount ?? 0,
            tickets: response.historyList.filter((t) => t.ticketId) as { ticketId: string }[],
        };
    } catch {
        return null;
    }
}

// ── Tool 등록 ─────────────────────────────────────────────

export function registerInquireTicketWorkflow(server: McpServer): void {
    server.registerTool(
        "workflow_inquire_ticket",
        {
            description:
                "티켓 종합 조회 워크플로우. 티켓 상세·업무 로그·그룹 티켓·사이트 링크를 " +
                "순서대로 수집하여 한 번에 반환합니다. " +
                "개별 tool을 반복 호출하는 대신 이 tool을 사용하세요.",
            annotations: { readOnlyHint: true },
            inputSchema: {
                ticketId: z
                    .string()
                    .regex(/^TCKT\d{10}$/, "티켓 ID 형식: TCKT + 10자리 숫자")
                    .describe("티켓 ID (예: TCKT0000177000)"),
                maxGroupTickets: z.number().int().min(1).max(20).optional().default(5).describe("그룹 티켓 상세 조회 상한 (기본 5)"),
                includeSiteLinks: z.boolean().optional().default(true).describe("사이트 링크 조회 여부 (기본 true)"),
            },
        },
        async ({ ticketId, maxGroupTickets, includeSiteLinks }) => {
            // 1. 티켓 상세
            const ticket = await fetchTicketDetail(ticketId);
            if (!ticket) return errorContent(`티켓 조회 실패: ${ticketId}`);

            // 2. 업무 로그
            const taskLog = ticket.taskId ? await fetchTaskLog(ticket.taskId) : null;

            // 3. 사이트 링크
            const siteLinks =
                includeSiteLinks && ticket.customer?.id ? await fetchSiteLinks(ticket.customer.id) : null;

            // 4. 그룹 티켓 목록
            const groupList = await fetchGroupTicketList(ticketId);
            const targets = (groupList?.tickets ?? []).slice(0, maxGroupTickets ?? 5);

            // 5. 그룹 티켓 상세 (루프, 상한 보장)
            const groupItems = [];
            for (const g of targets) {
                const gTicket = await fetchTicketDetail(g.ticketId);
                const gLog = gTicket?.taskId ? await fetchTaskLog(gTicket.taskId) : null;
                groupItems.push({ ticketId: g.ticketId, ticket: gTicket, taskLog: gLog });
            }

            return successContent({
                ticketId,
                ticket,
                taskLog,
                siteLinks,
                groupTickets: {
                    totalCount: groupList?.totalCount ?? 0,
                    fetchedCount: groupItems.length,
                    items: groupItems,
                },
            });
        },
    );
}
