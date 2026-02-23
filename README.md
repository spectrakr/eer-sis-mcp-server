# EER-MCP: MCP Adapter for Spring Framework App

Spring Framework 기반 애플리케이션(Command Pattern)을 위한 MCP(Model Context Protocol) 어댑터 서버입니다.

## 주요 기능

- **Spring App 연동**: `/enomix/common/ajaxHandler.ex` 엔드포인트와 통합
- **자동 세션 관리**: 로그인, 세션 초기화, 만료 시 자동 재로그인
- **MCP Tools**: Spring command를 MCP tool로 노출

## 세션 관리 정책

### 🔑 SESSION_ID 방식
- **.env 파일에서 SESSION_ID 설정**: 브라우저에서 로그인 후 JSESSIONID 값을 복사하여 .env 파일에 설정
- **수동 세션 관리**: 자동 로그인 없음. 세션 만료 시 에러 반환
- **세션 갱신**: 세션 만료 시 새로운 JSESSIONID를 .env 파일에 업데이트

### ⚠️ 세션 만료 처리
세션 만료 감지 시 에러 발생:
- `ajaxCallErrorCode: "NO_SESSION"`
- `ajaxCallResult: "N_SESSION"`
- `ajaxCallMessage: "Login session is invalid."`

에러 발생 시 조치:
1. 브라우저에서 Spring App에 로그인
2. 개발자 도구 → Application → Cookies → JSESSIONID 값 복사
3. .env 파일의 SESSION_ID 업데이트
4. MCP 서버 재시작 (Claude Desktop 재시작)

## 환경 설정

`.env` 파일 생성:

```env
SPRING_BASE_URL=http://172.16.100.226:19090
SPRING_AJAX_PATH=/enomix/common/ajaxHandler.ex
SESSION_ID=your_jsessionid_value
SPRING_DOMAIN_ID=NODE0000000001
PORT=3000
```

### SESSION_ID 확인 방법

1. 브라우저에서 Spring App에 로그인
2. 개발자 도구 열기 (F12 또는 Cmd+Option+I)
3. Application 탭 → Cookies → 해당 도메인 선택
4. JSESSIONID 값을 복사
5. .env 파일의 SESSION_ID에 붙여넣기

## 실행 방법

### 개발 모드
```bash
npm install
npm run dev
```

### 프로덕션
```bash
npm run build
npm start
```

### MCP 서버 엔드포인트
- **SSE**: `http://localhost:3000/sse`
- **메시지**: `http://localhost:3000/message`
- **헬스체크**: `http://localhost:3000/health`

## 사용 가능한 Tools

### `ticket_select_list`
티켓 목록을 조회합니다.

**필수 파라미터:**
- `startDate`: 조회 시작일시 (YYYYMMDDHHMMSS)
- `endDate`: 조회 종료일시 (YYYYMMDDHHMMSS)

**선택 파라미터:**
- `page`: 페이지 번호 (기본값: 1)
- `rows`: 페이지당 행 수 (기본값: 20)
- `dateType`: 날짜 기준 컬럼 (connect_date, end_date, create_date)
- `ticketStatus`: 티켓 상태 (ALL, OPEN, CLOSED, PENDING, RESOLVED, ANSWER_ING)
- `customerName`, `customerId`, `customerEmail`, `customerTel`
- `questionTitle`, `searchTicketId`, `searchContents`
- `accountId`, `nodeId`

**응답 예시:**
```json
{
  "totalCount": 12,
  "totalPage": 1,
  "returnedCount": 5,
  "tickets": [
    {
      "ticketId": "TCKT0000000012",
      "status": "ANSWER_ING",
      "title": "123123",
      "customerName": "SELECT * FROM T_TICKET",
      "customerEmail": "asd@naver.com",
      "accountName": "manager",
      "nodePath": "spec > 운동많이될꺼야",
      "connectDate": "20260219101957"
    }
  ]
}
```

## 사용 가능한 Prompts

MCP 프롬프트는 사용자가 자연어로 복잡한 작업을 수행할 수 있도록 돕는 템플릿입니다.

### `search_tickets`
자연어로 티켓을 검색합니다.

**인자:**
- `query` (필수): 검색 조건을 자연어로 입력
  - 예: "오늘 접수된 미완료 티켓"
  - 예: "지난 주 홍길동 고객의 티켓"
  - 예: "어제 ANSWER_ING 상태인 티켓"

**사용 예시:**
```
query: "최근 3일간 asd@naver.com 고객의 모든 티켓"
```

프롬프트가 자동으로 날짜를 계산하고 적절한 `ticket_select_list` tool 호출로 변환합니다.

---

### `analyze_tickets`
특정 기간의 티켓 데이터를 분석하고 인사이트를 제공합니다.

**인자:**
- `period` (필수): 분석할 기간
  - 예: "오늘", "이번 주", "지난 달", "최근 7일"
- `focus` (선택): 분석 초점
  - 예: "응답 시간", "고객 만족도", "처리 현황", "담당자별 현황"

**사용 예시:**
```
period: "이번 주"
focus: "담당자별 현황"
```

티켓 데이터를 조회하고 다음을 분석합니다:
- 상태별 분포
- 주요 문의 유형
- 고객별/담당자별 현황
- 채널별 분포
- 패턴 및 인사이트

---

### `daily_ticket_report`
일일 티켓 리포트를 생성합니다.

**인자:**
- `date` (선택): 리포트 날짜 (YYYYMMDD, 기본값: 오늘)

**사용 예시:**
```
date: "20260219"
```

다음 내용이 포함된 구조화된 리포트를 생성합니다:
- 📊 전체 현황 (총 건수, 상태별 분포)
- 👥 고객 현황 (신규/재문의)
- 🎯 주요 이슈 (문의 유형, 긴급 티켓)
- 👨‍💼 담당자별 현황
- 💡 특이사항 및 개선 제안

## 프로젝트 구조

```
eer-mcp/
├── src/
│   ├── index.ts              # Express + SSE 엔드포인트
│   ├── mcp-server.ts         # MCP 서버 + Tool/Prompt 등록
│   ├── spring-client.ts      # Spring API 클라이언트 (세션 관리)
│   ├── types.ts              # 공유 타입 정의
│   ├── tools/                # MCP Tools
│   │   ├── index.ts          # Tool 일괄 등록
│   │   └── ticket-select-list.ts  # 티켓 조회 Tool
│   └── prompts/              # MCP Prompts
│       ├── index.ts          # Prompt 일괄 등록
│       ├── search-tickets.ts # 티켓 검색 프롬프트
│       ├── analyze-tickets.ts # 티켓 분석 프롬프트
│       └── daily-report.ts   # 일일 리포트 프롬프트
├── dist/                     # 빌드 결과물
├── package.json
├── tsconfig.json
├── README.md
└── .env                      # 환경 변수 (git ignore)
```

## 로그 예시

```
[spring-client] 요청: ticketUIService.selectList
[spring-client] 요청: ticketUIService.selectList
[spring-client] 요청: ticketUIService.selectList
```

세션 만료 시:
```
Error: 세션이 만료되었습니다. .env 파일의 SESSION_ID를 새로운 JSESSIONID로 업데이트하세요.
```

## 기술 스택

- **Runtime**: Node.js + TypeScript
- **MCP SDK**: `@modelcontextprotocol/sdk` (SSE transport)
- **HTTP Client**: axios
- **Validation**: Zod
- **Server**: Express.js

## 개발 가이드

### 새 Tool 추가하기

1. `src/tools/` 디렉토리에 새 파일 생성 (예: `my-command.ts`)
2. Tool 정의:

```typescript
import { z } from "zod/v3";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callCommand } from "../spring-client.js";
import { successContent, errorContent } from "../types.js";

export function registerMyCommand(server: McpServer): void {
  server.registerTool(
    "my_command",
    {
      description: "설명",
      inputSchema: {
        param1: z.string().describe("파라미터 설명"),
      },
    },
    async ({ param1 }) => {
      const response = await callCommand("myService.myMethod", {
        param1,
        // 필요한 다른 파라미터들...
      });

      if (response.ajaxCallResult !== "S") {
        return errorContent(response.ajaxCallMessage ?? "오류");
      }

      return successContent(response.data);
    }
  );
}
```

3. `src/tools/index.ts`에 등록:

```typescript
import { registerMyCommand } from "./my-command.js";

export function registerAllTools(server: McpServer): void {
  registerTicketSelectList(server);
  registerMyCommand(server);  // 추가
}
```

4. 빌드 및 테스트:

```bash
npm run build
npm start
```

## 주의사항

- `SESSION_ID` 필수: .env 파일에 유효한 JSESSIONID 설정 필요
- `domainId` 필수: 모든 요청에 도메인 ID 포함
- `isNewSearch=false`, `isDetailSearch=false`: 검색 플래그 정확히 설정
- 세션 만료 시 수동으로 .env 파일 업데이트 및 서버 재시작 필요

## 라이선스

MIT
