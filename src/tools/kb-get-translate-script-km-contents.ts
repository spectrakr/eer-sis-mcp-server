import { z } from "zod/v3";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callCommand } from "../spring-client.js";
import { successContent, errorContent } from "../types.js";

interface KbDetailResponse {
  ajaxCallResult: string;
  ajaxCallErrorCode?: string;
  ajaxCallMessage?: string;
  processResult?: string;
  dataMap?: {
    kbForm?: {
      kbId?: string;
      title?: string;
      contents?: string;
      transScriptContents?: string;
      createdBy?: string;
      createdName?: string;
      createdDate?: string;
      updatedBy?: string;
      updatedName?: string;
      updatedDate?: string;
      nodeId?: string;
      approvalStatus?: string;
      hitCount?: number;
      nodeKbRelMain?: {
        nodeName?: string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

/**
 * HTML contents를 정리하여 텍스트만 추출
 */
function sanitizeKbContents(contents: string | undefined): string {
  if (!contents) return "";

  let sanitized = contents;

  // 1. HTML 태그 제거
  sanitized = sanitized.replace(/<[^>]+>/g, " ");

  // 2. HTML 엔티티 디코딩
  sanitized = sanitized
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  // 3. 연속된 공백을 하나로
  sanitized = sanitized.replace(/\s+/g, " ");

  // 4. 앞뒤 공백 제거
  sanitized = sanitized.trim();

  return sanitized;
}

export function registerKbGetTranslateScriptKmContents(server: McpServer): void {
  server.registerTool(
    "kb_get_translate_script_km_contents",
    {
      description:
        "특정 지식(Knowledge Base)의 상세 내용을 조회합니다. (command: kbUIService.getTranslateScriptKmContents)\n" +
        "지식 ID로 전체 내용과 메타데이터를 가져옵니다.",
      inputSchema: {
        kbId: z
          .string()
          .regex(/^KNOW\d{10}$/, "지식 ID 형식: KNOW + 10자리 숫자")
          .describe("지식 ID (예: KNOW0000005091)"),
        nodeId: z
          .string()
          .optional()
          .describe("노드 ID (예: NODE0000000456)"),
        serviceType: z
          .string()
          .optional()
          .describe("서비스 타입 (기본값: SVKNW)"),
        includeContents: z
          .boolean()
          .optional()
          .describe("지식 내용(contents) 포함 여부 (기본값: true)"),
      },
    },
    async (args) => {
      const response = await callCommand<KbDetailResponse>(
        "kbUIService.getTranslateScriptKmContents",
        {
          kbId: args.kbId,
          nodeId: args.nodeId ?? "",
          serviceType: args.serviceType ?? "SVKNW",
          isLog: "false",
        }
      );

      if (response.ajaxCallResult !== "S") {
        return errorContent(
          response.ajaxCallMessage ?? response.ajaxCallErrorCode ?? "알 수 없는 오류"
        );
      }

      if (!response.dataMap?.kbForm) {
        return errorContent("지식 정보를 찾을 수 없습니다.");
      }

      const kb = response.dataMap.kbForm;

      const summary: Record<string, unknown> = {
        kbId: kb.kbId,
        title: kb.title,
        nodeId: kb.nodeId,
        nodePath: kb.nodeKbRelMain?.nodeName,
        creator: {
          name: kb.createdName,
          id: kb.createdBy,
          date: kb.createdDate,
        },
        updater: {
          name: kb.updatedName,
          id: kb.updatedBy,
          date: kb.updatedDate,
        },
        approvalStatus: kb.approvalStatus,
        hitCount: kb.hitCount,
      };

      // includeContents 기본값은 true (상세 조회이므로)
      if (args.includeContents !== false) {
        summary.contents = sanitizeKbContents(
          kb.transScriptContents ?? kb.contents
        );
      }

      return successContent(summary);
    }
  );
}
