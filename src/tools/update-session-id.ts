import { z } from "zod/v3";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

export function registerUpdateSessionId(server: McpServer): void {
    server.registerTool(
        "update_session_id",
        {
            description:
                "시스템 도구. 세션 만료 에러 발생 시에만 사용.\n" +
                "새 JSESSIONID를 입력하면 프로세스 환경변수 및 .env 파일을 즉시 업데이트합니다.",
            annotations: { readOnlyHint: false, idempotentHint: true },
            inputSchema: {
                sessionId: z
                    .string()
                    .min(1, "세션 ID는 필수입니다")
                    .describe("새로운 JSESSIONID 값 (예: 1kymf8yzu71xdb0cbxpzuffxb)"),
                saveToFile: z.boolean().optional().default(true).describe(".env 파일에 저장할지 여부 (기본값: true)"),
            },
        },
        async (args) => {
            return handleUpdateSessionId(args as { sessionId: string; saveToFile?: boolean });
        },
    );
}

async function handleUpdateSessionId(args: {
    sessionId: string;
    saveToFile?: boolean;
}): Promise<{ content: Array<{ type: "text"; text: string }> }> {
    try {
        const { sessionId, saveToFile = true } = args;

        if (!sessionId || sessionId.trim().length === 0) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: "❌ 오류: 유효한 세션 ID를 입력해주세요.",
                    },
                ],
            };
        }

        const trimmedSessionId = sessionId.trim();

        // 1. 현재 프로세스의 환경 변수 업데이트
        process.env.SESSION_ID = trimmedSessionId;
        console.error(`[update-session-id] 세션 ID 업데이트: ${trimmedSessionId.substring(0, 10)}...`);

        let result = `✅ 세션 ID가 업데이트되었습니다.\n\n`;
        result += `- 새 세션 ID: ${trimmedSessionId}\n`;
        result += `- 즉시 적용: 완료 (다음 API 호출부터 새 세션 ID 사용)\n`;

        // 2. .env 파일에 저장 (옵션)
        if (saveToFile) {
            try {
                const envPath = join(process.cwd(), ".env");
                let envContent = "";

                // 기존 .env 파일 읽기
                try {
                    envContent = readFileSync(envPath, "utf-8");
                } catch {
                    // .env 파일이 없으면 새로 생성
                    console.error("[update-session-id] .env 파일이 없어 새로 생성합니다.");
                }

                // SESSION_ID 업데이트 또는 추가
                const lines = envContent.split("\n");
                let sessionIdUpdated = false;

                const updatedLines = lines.map((line) => {
                    if (line.trim().startsWith("SESSION_ID=")) {
                        sessionIdUpdated = true;
                        return `SESSION_ID=${trimmedSessionId}`;
                    }
                    return line;
                });

                // SESSION_ID 항목이 없었다면 추가
                if (!sessionIdUpdated) {
                    updatedLines.push(`SESSION_ID=${trimmedSessionId}`);
                }

                // .env 파일에 쓰기
                writeFileSync(envPath, updatedLines.join("\n"), "utf-8");

                result += `- .env 파일 저장: 완료 (재시작 시에도 유지됨)\n`;
                console.error(`[update-session-id] .env 파일 업데이트 완료: ${envPath}`);
            } catch (error) {
                result += `- .env 파일 저장: 실패 (${error instanceof Error ? error.message : "알 수 없는 오류"})\n`;
                console.error(`[update-session-id] .env 파일 저장 실패:`, error);
            }
        } else {
            result += `- .env 파일 저장: 건너뜀 (재시작 시 이전 세션 ID로 복구됨)\n`;
        }

        result += `\n💡 팁: 이제 티켓 조회, KB 검색 등의 도구를 사용할 수 있습니다.`;

        return {
            content: [
                {
                    type: "text" as const,
                    text: result,
                },
            ],
        };
    } catch (error) {
        console.error("[update-session-id] 오류:", error);
        return {
            content: [
                {
                    type: "text" as const,
                    text: `❌ 세션 ID 업데이트 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
                },
            ],
        };
    }
}
