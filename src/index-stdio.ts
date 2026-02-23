#!/usr/bin/env node
/**
 * stdio 기반 MCP 서버 (Claude Desktop 전용)
 *
 * Claude Desktop이 이 서버를 자식 프로세스로 실행하고
 * stdin/stdout을 통해 통신합니다.
 */
import { config } from "dotenv";
import { join } from "path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./mcp-server.js";

// .env 파일 경로 명시적으로 지정 (cwd 기준)
const envPath = join(process.cwd(), ".env");
config({ path: envPath });

console.error(`[eer-mcp] 작업 디렉토리: ${process.cwd()}`);
console.error(`[eer-mcp] .env 파일 경로: ${envPath}`);
console.error(`[eer-mcp] SESSION_ID: ${process.env.SESSION_ID ? "설정됨" : "설정 안됨"}`);

async function main() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  console.error("[eer-mcp] stdio MCP 서버 시작");

  await server.connect(transport);

  console.error("[eer-mcp] Claude Desktop 연결 대기 중...");
}

main().catch((error) => {
  console.error("[eer-mcp] 오류:", error);
  process.exit(1);
});
