import {z} from "zod/v3";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {callCommand} from "../spring-client.js";
import {successContent, errorContent} from "../types.js";

/**
 * HTML contents에서 이미지 데이터를 필터링하고 HTML 태그를 제거하여 토큰 사용량을 줄입니다.
 */
function sanitizeContents(contents: string | undefined): string {
    if (!contents) return "";
    let sanitizedContents = contents;

    sanitizedContents = sanitizeImageContent(sanitizedContents);
    sanitizedContents = sanitizeHtmlTag(sanitizedContents);

    return sanitizedContents;
}

function sanitizeImageContent(contents: string) {
    // 1. Base64 인코딩 이미지 제거 (가장 큰 용량)
    return contents.replace(
        /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g,
        ""
    );
}

function sanitizeHtmlTag(contents: string) {
    let sanitized = contents;

    // 2. 이미지 태그를 파일명으로 축약
    sanitized = sanitized.replace(
        /<img[^>]+src="([^"]+)"[^>]*>/gi,
        (_, url) => {
            const filename = url.split('/').pop()?.split('?')[0] || 'image';
            return `[IMAGE: ${filename}] `;
        }
    );

    // 3. fileInfo 같은 긴 인코딩 파라미터 제거
    sanitized = sanitized.replace(
        /fileInfo=[A-Za-z0-9+/%=]+/g,
        ""
    );

    // 4. script, style 태그와 내용 완전 제거
    sanitized = sanitized.replace(
        /<(script|style)[^>]*>[\s\S]*?<\/\1>/gi,
        ""
    );

    // 5. 모든 HTML 태그 제거
    sanitized = sanitized.replace(/<[^>]+>/g, " ");

    // 6. HTML 엔티티 디코딩
    sanitized = sanitized
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");

    // 7. 연속된 공백/줄바꿈을 하나의 공백으로
    sanitized = sanitized.replace(/\s+/g, " ");

    // 8. 앞뒤 공백 제거
    sanitized = sanitized.trim();

    return sanitized;
}

// 처리 이력 타입
interface ProcessHistory {
    qnaId?: string;
    processSeq?: number;
    processType?: string;
    status?: string;
    title?: string;
    contents?: string;
    accountId?: string;
    accountName?: string;
    createdDate?: string;
    updatedDate?: string;
    attachCount?: number;

    [key: string]: unknown;
}

// 티켓 상세 정보 타입
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

    [key: string]: unknown;
}

interface QnaFormResponse {
    ajaxCallResult: string;
    ajaxCallErrorCode?: string;
    ajaxCallMessage?: string;
    dataMap?: {
        qnaForm?: QnaForm;
    };
}

export function registerQnaSelectQnaForm(server: McpServer): void {
    server.registerTool(
        "qna_select_qna_form",
        {
            description:
                "특정 티켓의 상세 정보를 조회합니다. (command: qnaUIService.selectQnaForm)\n" +
                "티켓 ID로 티켓의 전체 내용, 처리 이력, 첨부파일 등을 가져옵니다.",
            inputSchema: {
                ticketId: z
                    .string()
                    .regex(/^TCKT\d{10}$/, "티켓 ID 형식: TCKT + 10자리 숫자")
                    .describe("티켓 ID (예: TCKT0000177000)"),
                includeContents: z
                    .boolean()
                    .optional()
                    .describe("처리 이력의 상세 내용(contents) 포함 여부 (기본값: false)"),
            },
        },
        async (args) => {
            const response = await callCommand<QnaFormResponse>(
                "qnaUIService.selectQnaForm",
                {
                    ticketId: args.ticketId,
                }
            );

            if (response.ajaxCallResult !== "S") {
                return errorContent(
                    response.ajaxCallMessage ?? response.ajaxCallErrorCode ?? "알 수 없는 오류"
                );
            }

            if (!response.dataMap?.qnaForm) {
                return errorContent("티켓 정보를 찾을 수 없습니다.");
            }

            const qna = response.dataMap.qnaForm;

            // 처리 이력을 간략하게 정리
            const processHistory = (qna.qnaProcessHistoryFormList ?? []).map((history) => {
                const historyItem: Record<string, unknown> = {
                    processSeq: history.processSeq,
                    processType: history.processType,
                    status: history.status,
                    title: history.title,
                    accountName: history.accountName,
                    createdDate: history.createdDate,
                    attachCount: history.attachCount,
                };

                // includeContents가 true일 때만 contents 포함 (이미지 데이터는 자동 필터링)
                if (args.includeContents) {
                    historyItem.contents = sanitizeContents(history.contents);
                }

                return historyItem;
            });

            const summary = {
                ticketId: qna.refQnaId ?? qna.qnaId,
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
                processHistory: processHistory,
                attachments: {
                    inCount: qna.inAttachList?.length ?? 0,
                    outCount: qna.outAttachList?.length ?? 0,
                },
            };

            return successContent(summary);
        }
    );
}
