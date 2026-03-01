import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";

/**
 * 일일 티켓 리포트 프롬프트
 *
 * 오늘의 티켓 처리 현황을 요약한 일일 리포트를 생성합니다.
 */
export function registerDailyReportPrompt(server: McpServer): void {
    server.registerPrompt(
        "daily_ticket_report",
        {
            description: "오늘의 티켓 처리 현황을 요약한 일일 리포트를 생성합니다.",
            argsSchema: {
                date: z.string().optional().describe("리포트 날짜 (기본값: 오늘, 형식: YYYYMMDD)"),
            },
        },
        async ({ date }) => {
            const targetDate = date ?? formatDate(new Date());

            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `${targetDate} 날짜의 일일 티켓 리포트를 작성해주세요.

ticket_select_list tool을 사용하여 ${targetDate}000000 ~ ${targetDate}235959 기간의 티켓을 조회하고,
다음 내용을 포함한 리포트를 작성해주세요:

# 일일 티켓 리포트 (${formatDateReadable(targetDate)})

## 📊 전체 현황
- 총 접수 티켓 수
- 상태별 분포 (미완료/처리중/완료)
- 전일 대비 증감 (가능한 경우)

## 👥 고객 현황
- 신규 고객 수 (처음 문의한 고객)
- 재문의 고객 (이전에도 문의한 고객)
- VIP 고객 문의 (있는 경우)

## 🎯 주요 이슈
- 가장 많이 발생한 문의 유형 (상위 3개)
- 긴급 처리 필요 티켓
- 미답변 티켓

## 👨‍💼 담당자별 현황
- 담당자별 처리 건수
- 평균 응답 시간 (데이터 있는 경우)

## 💡 특이사항 및 제안
- 눈에 띄는 패턴이나 이상 징후
- 개선 제안

리포트는 간결하고 읽기 쉽게 작성해주세요.`,
                        },
                    },
                ],
            };
        },
    );
}

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
}

function formatDateReadable(dateStr: string): string {
    // YYYYMMDD -> YYYY년 MM월 DD일
    if (dateStr.length !== 8) return dateStr;
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    return `${year}년 ${month}월 ${day}일`;
}
