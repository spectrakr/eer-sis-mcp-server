import { z } from "zod/v3";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callCommand } from "../spring-client.js";
import { successContent, errorContent } from "../types.js";

// 업무 로그 항목 타입
interface TaskLog {
  logId?: string;
  taskId?: string;
  logStatus?: string;
  logTime?: number;
  taskLogContents?: string;
  taskLogContentsList?: string[];
  attachList?: unknown[];
  createdName?: string;
  updatedName?: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
  deleteFlag?: string;
  [key: string]: unknown;
}

// API 응답 타입
interface TaskLogListResponse {
  ajaxCallResult: string;
  ajaxCallErrorCode?: string;
  ajaxCallMessage?: string;
  processResult?: string;
  taskLogList?: TaskLog[];
}

export function registerTaskSelectTaskLogList(server: McpServer): void {
  server.registerTool(
    "task_select_task_log_list",
    {
      description:
        "업무(Task)의 로그 목록을 조회합니다. (command: taskUIService.selectTaskLogList)\n" +
        "업무 ID를 입력하면 해당 업무의 모든 작업 로그를 반환합니다.",
      inputSchema: {
        taskId: z
          .string()
          .min(1, "업무 ID는 필수입니다")
          .describe("업무 ID (예: TASK0000012098)"),
      },
    },
    async (args) => {
      const params = {
        taskId: args.taskId,
      };

      try {
        const response = await callCommand<TaskLogListResponse>(
          "taskUIService.selectTaskLogList",
          params
        );

        // 에러 체크
        if (response.ajaxCallResult !== "S" && response.processResult !== "S") {
          return errorContent(
            response.ajaxCallMessage || "업무 로그 조회에 실패했습니다"
          );
        }

        // taskLogList가 없거나 비어있는 경우
        if (!response.taskLogList || response.taskLogList.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "조회된 업무 로그가 없습니다.",
              },
            ],
          };
        }

        // 로그 데이터 정리
        const logs = response.taskLogList.map((log) => ({
          logId: log.logId,
          taskId: log.taskId,
          logStatus: log.logStatus,
          logTime: log.logTime,
          contents: log.taskLogContents,
          createdBy: log.createdName || log.createdBy,
          createdDate: log.createdDate,
          updatedBy: log.updatedName || log.updatedBy,
          updatedDate: log.updatedDate,
          attachmentCount: log.attachList?.length || 0,
        }));

        const result = {
          taskId: args.taskId,
          totalLogs: logs.length,
          logs: logs,
        };

        return successContent(result);
      } catch (error) {
        console.error("[task-select-task-log-list] 오류:", error);
        return errorContent(
          error instanceof Error ? error.message : "업무 로그 조회 중 오류 발생"
        );
      }
    }
  );
}
