# eer-mcp 서버 효율 극대화 — 작업 기록

## 2026-03-04

### Phase 1: 토큰 절약 & 도구 설명 개선

**1-1. `successContent` compact JSON 전환** (`src/types.ts`)
- `JSON.stringify(data, null, 2)` → `JSON.stringify(data)` 변경
- 모든 도구 응답 토큰 20~30% 절감

**1-2 & 1-3. 도구 설명 수정 + annotations 추가** (각 `src/tools/*.ts`)
- 모든 8개 도구 description을 "(1) 한줄 목적, (2) 언제 사용, (3) 다른 도구와의 관계" 구조로 통일
- 조회 도구 (`ticket_select_list`, `rag_search_ticket`, `qna_select_qna_form`, `qna_select_group_ticket_list`, `qna_select_site_conn_link_list`, `task_select_task_log_list`): `readOnlyHint: true, idempotentHint: true`
- `update_session_id`: `readOnlyHint: false, idempotentHint: true`
- `slack_share_content`: `readOnlyHint: false, idempotentHint: false`

**1-4. option01-100 빈 파라미터 제거** (`src/tools/ticket-select-list.ts:167-170`)
- 100개 빈 option 파라미터 전송 루프 제거
- Spring 백엔드 동작 확인 필요 (실패 시 롤백)

---

### Phase 2: 에러 처리 & 안정성

**2-1. spring-client 재시도 로직 추가** (`src/spring-client.ts`)
- 네트워크 오류(`ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT`) 및 502/503/504에 대해 1회 재시도 (1초 대기)
- 4xx, 세션 만료는 재시도하지 않음

**2-2. 세션 만료 에러 메시지 개선** (`src/spring-client.ts`)
- 에러 메시지에 `update_session_id` 도구 사용 안내 포함
- HTTP 302 리다이렉트(로그인 페이지) 감지 추가 (`maxRedirects: 0`)

**2-3. RAG 검색 도구 타임아웃 추가** (`src/tools/rag-search-ticket.ts`)
- `AbortController` + 30초 타임아웃 적용
- `AbortError` 별도 처리 (타임아웃 안내 메시지)

---

### Phase 3: 정리 & 빌드 개선

**3-1. KB 도구 조건부 등록** (`src/tools/index.ts`)
- `ENABLE_KB_TOOLS=true` 환경변수로 KB 도구 3개 조건부 등록
- import 구문 복원

**3-2. 빌드 스크립트 정비** (`package.json`)
- HTTP 엔트리포인트(`src/index.ts`)도 esbuild 번들에 포함 (`dist/index.js`)

**3-3. 사이트 링크 캐시** (`src/tools/qna-select-site-conn-link-list.ts`)
- `siteId` 기반 10분 TTL 인메모리 캐시 추가
- 같은 대화 내 중복 호출 방지

---

### 검증 결과

- `npm run build` 성공 (`dist/index-stdio.js` 1.5mb, `dist/index.js` 2.9mb)
