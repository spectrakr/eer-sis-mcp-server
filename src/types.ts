// ajaxHandler.ex 공통 응답 구조 (jqGrid 페이지네이션 포함)
export interface AjaxListResponse<T = unknown> {
  total: number;       // 전체 건수
  page: number;        // 현재 페이지
  records: number;     // 전체 레코드 수
  rows: T[];           // 데이터 목록
}

// 단건 응답 구조 (result/data 패턴)
export interface AjaxSingleResponse<T = unknown> {
  result: "success" | "failure";
  message?: string;
  data?: T;
}

// MCP Tool 공통 오류 응답 생성 헬퍼
export function errorContent(message: string) {
  return {
    content: [{ type: "text" as const, text: `오류: ${message}` }],
    isError: true as const,
  };
}

// MCP Tool 공통 성공 응답 생성 헬퍼
export function successContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}
