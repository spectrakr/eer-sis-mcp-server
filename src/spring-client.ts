import axios, { AxiosInstance } from "axios";

const SPRING_BASE_URL = process.env.SPRING_BASE_URL ?? "http://localhost:19090";
const SPRING_AJAX_PATH = process.env.SPRING_AJAX_PATH ?? "/enomix/common/ajaxHandler.ex";

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
export async function callCommand<T = unknown>(command: string, params: Record<string, unknown> = {}): Promise<T> {
    const sessionCookie = getSessionCookie();

    if (!sessionCookie) {
        throw new Error("SESSION_ID가 .env 파일에 설정되지 않았습니다.");
    }

    console.error(`[spring-client] 요청: ${command}`);

    let response: T;
    try {
        response = await sendRequest<T>(command, params, sessionCookie);
    } catch (error) {
        if (isRetryableError(error)) {
            console.error(`[spring-client] 재시도: ${command}`);
            await sleep(1000);
            response = await sendRequest<T>(command, params, sessionCookie);
        } else {
            throw error;
        }
    }

    // 세션 만료 감지 (HTTP 302 리다이렉트 또는 ajaxCall 에러코드)
    if (isSessionExpired(response)) {
        throw new Error(
            "세션이 만료되었습니다. update_session_id 도구로 새로운 JSESSIONID를 업데이트하세요.\n" +
                "(브라우저에서 eNomix에 로그인 후 개발자도구 > Application > Cookies > JSESSIONID 값을 복사하세요.)",
        );
    }

    return response;
}

async function sendRequest<T>(command: string, params: Record<string, unknown>, sessionCookie: string): Promise<T> {
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
        maxRedirects: 0,
        validateStatus: (status) => status < 400 || status === 302,
    });

    // HTTP 302 리다이렉트 = 로그인 페이지로 이동 = 세션 만료
    if (response.status === 302) {
        throw new Error(
            "세션이 만료되었습니다. update_session_id 도구로 새로운 JSESSIONID를 업데이트하세요.\n" +
                "(브라우저에서 eNomix에 로그인 후 개발자도구 > Application > Cookies > JSESSIONID 값을 복사하세요.)",
        );
    }

    return response.data;
}

function isRetryableError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const e = error as Record<string, unknown>;
    // 네트워크 오류
    if (e["code"] === "ECONNREFUSED" || e["code"] === "ECONNRESET" || e["code"] === "ETIMEDOUT") return true;
    // axios HTTP 오류 — 502/503/504만 재시도
    if (e["response"] && typeof e["response"] === "object") {
        const status = (e["response"] as Record<string, unknown>)["status"];
        return status === 502 || status === 503 || status === 504;
    }
    return false;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
