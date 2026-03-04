import { z } from "zod/v3";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebClient } from "@slack/web-api";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { successContent, errorContent } from "../types.js";

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

export function registerSlackShareContent(server: McpServer): void {
    server.registerTool(
        "slack_share_content",
        {
            description:
                "외부 전송 도구. 분석 결과를 Slack 채널에 공유.\n" +
                "Markdown 콘텐츠를 ./share에 저장하고 Slack 채널로 전송. 쓰기/비멱등 작업.",
            annotations: { readOnlyHint: false, idempotentHint: false },
            inputSchema: {
                content: z.string().describe("공유할 Markdown 형식의 내용"),
                title: z.string().optional().describe("메시지 제목 (선택사항)"),
                channelId: z.string().optional().describe("Slack 채널 ID (기본값: 환경변수)"),
            },
        },
        async (args) => {
            try {
                // 1. 타임스탬프 생성 (YYYYMMDDHHMMSS)
                const timestamp = formatTimestamp(new Date());

                // 2. ./share 디렉토리 확인 및 생성
                const shareDir = join(process.cwd(), "share");
                if (!existsSync(shareDir)) {
                    mkdirSync(shareDir, { recursive: true });
                }

                // 3. Markdown 파일 저장
                const filename = `${timestamp}.md`;
                const filepath = join(shareDir, filename);
                writeFileSync(filepath, args.content, "utf-8");

                // 4. Slack 메시지 구성
                const channel = args.channelId || process.env.SLACK_CHANNEL_ID;

                if (!channel) {
                    return errorContent("Slack 채널 ID가 설정되지 않았습니다. SLACK_CHANNEL_ID 환경변수를 확인하세요.");
                }

                const message = {
                    channel,
                    text: args.title || "공유된 콘텐츠",
                    blocks: [
                        {
                            type: "header",
                            text: {
                                type: "plain_text",
                                text: args.title || "📄 공유된 콘텐츠",
                            },
                        },
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: args.content,
                            },
                        },
                        {
                            type: "context",
                            elements: [
                                {
                                    type: "mrkdwn",
                                    text: `💾 저장됨: \`${filename}\``,
                                },
                            ],
                        },
                    ],
                };

                // 5. Slack에 전송
                await slackClient.chat.postMessage(message);

                // 6. 성공 응답
                return successContent({
                    success: true,
                    savedFile: filename,
                    filepath: filepath,
                    sharedTo: channel,
                });
            } catch (error) {
                console.error("[slack-share-content] 오류:", error);
                return errorContent(`Slack 공유 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
            }
        },
    );
}

// 헬퍼 함수: YYYYMMDDHHMMSS 형식 타임스탬프
function formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}
