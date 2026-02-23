import "dotenv/config";
import express from "express";
import cors from "cors";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createMcpServer } from "./mcp-server.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const app = express();

// CORS 설정 추가
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

// 세션별 SSE transport 관리
const transports: Record<string, SSEServerTransport> = {};

// SSE 연결 엔드포인트 - MCP 클라이언트가 이 URL로 연결
app.get("/sse", async (_req, res) => {
  const server = createMcpServer();
  const transport = new SSEServerTransport("/message", res);

  transports[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports[transport.sessionId];
    console.error(`[SSE] 세션 종료: ${transport.sessionId}`);
  });

  console.error(`[SSE] 새 세션 시작: ${transport.sessionId}`);
  await server.connect(transport);
});

// MCP 메시지 수신 엔드포인트 - MCP 클라이언트가 tool call 등을 여기로 전송
app.post("/message", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];

  if (!transport) {
    res.status(404).json({ error: `세션을 찾을 수 없음: ${sessionId}` });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// 헬스체크
app.get("/health", (_req, res) => {
  res.json({ status: "ok", sessions: Object.keys(transports).length });
});

app.listen(PORT, () => {
  console.error(`[eer-mcp] MCP 어댑터 서버 시작 (포트: ${PORT})`);
  console.error(`  SSE 엔드포인트:  http://localhost:${PORT}/sse`);
  console.error(`  메시지 엔드포인트: http://localhost:${PORT}/message`);
  console.error(`  헬스체크:       http://localhost:${PORT}/health`);
  console.error(`  Spring 서버:    ${process.env.SPRING_BASE_URL ?? "http://localhost:8080"}`);
});
