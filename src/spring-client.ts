import axios, {AxiosInstance} from "axios";

const SPRING_BASE_URL = process.env.SPRING_BASE_URL ?? "http://localhost:19090";
const SPRING_AJAX_PATH = process.env.SPRING_AJAX_PATH ?? "/enomix/common/ajaxHandler.ex";
const SESSION_ID = process.env.SESSION_ID ?? "";
const DOMAIN_ID = process.env.SPRING_DOMAIN_ID ?? "NODE0000000001";

const httpClient: AxiosInstance = axios.create({
    baseURL: SPRING_BASE_URL,
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
    },
    timeout: 60000,
});

// 세션 쿠키를 동적으로 가져오는 함수
function getSessionCookie(): string | null {
    const sessionId = process.env.SESSION_ID;
    return sessionId ? `JSESSIONID=${sessionId}` : null;
}

/**
 * Spring App의 ajaxHandler.ex로 command를 전송합니다.
 *
 * 세션 관리:
 * - .env 파일의 SESSION_ID를 사용하여 요청
 * - 세션 만료 시 에러 반환 (자동 재로그인 없음)
 *
 * command 형식: "serviceName.methodName" (예: "ticketUIService.selectList")
 */
export async function callCommand<T = unknown>(
    command: string,
    params: Record<string, unknown> = {}
): Promise<T> {
    const sessionCookie = getSessionCookie();

    if (!sessionCookie) {
        throw new Error("SESSION_ID가 .env 파일에 설정되지 않았습니다.");
    }

    console.error(`[spring-client] 요청: ${command}`);

    const response = await sendRequest<T>(command, params, sessionCookie);

    // 세션 만료 감지
    if (isSessionExpired(response)) {
        throw new Error(
            "세션이 만료되었습니다. .env 파일의 SESSION_ID를 새로운 JSESSIONID로 업데이트하세요."
        );
    }

    return response;
}

async function sendRequest<T>(
    command: string,
    params: Record<string, unknown>,
    sessionCookie: string
): Promise<T> {
    const formData = new URLSearchParams();
    formData.append("command", command);
    formData.append("domainId", DOMAIN_ID);

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
            formData.append(key, String(value));
        }
    }

    const response = await httpClient.post<T>(SPRING_AJAX_PATH, formData, {
        headers: {
            Cookie: sessionCookie,
        },
    });

    return response.data;
}

function isSessionExpired(response: unknown): boolean {
    if (response && typeof response === "object") {
        const r = response as Record<string, unknown>;
        return (
            r["ajaxCallErrorCode"] === "NO_SESSION" ||
            r["ajaxCallResult"] === "N_SESSION" ||
            (r["ajaxCallResult"] === "N" && r["ajaxCallMessage"] === "Login session is invalid.")
        );
    }
    return false;
}
