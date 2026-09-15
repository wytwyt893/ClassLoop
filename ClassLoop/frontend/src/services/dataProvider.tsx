import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8100").replace(/\/$/, "");
const LEGACY_TOKEN_KEY = "classloop.api.token.v1";
const TEACHER_TOKEN_KEY = "classloop.api.teacher-token.v1";
const ADMIN_TOKEN_KEY = "classloop.api.admin-token.v1";

type AuthScope = "teacher" | "admin" | "public";

function detectAuthScope(): AuthScope {
  const path = window.location.pathname;
  if (path === "/admin") return "admin";
  if (path === "/teacher" || path === "/output") return "teacher";
  return "public";
}

const AUTH_SCOPE = detectAuthScope();
const ACTIVE_TOKEN_KEY = AUTH_SCOPE === "teacher"
  ? TEACHER_TOKEN_KEY
  : AUTH_SCOPE === "admin"
    ? ADMIN_TOKEN_KEY
    : null;

type FunctionRef = { key: string };
const ref = (key: string): FunctionRef => ({ key });

export const api = {
  sessions: {
    createSession: ref("sessions.createSession"),
    updateSession: ref("sessions.updateSession"),
    getTeacherSessions: ref("sessions.getTeacherSessions"),
    getSessionByCode: ref("sessions.getSessionByCode"),
    verifyResultsAccess: ref("sessions.verifyResultsAccess"),
    getBroadcasts: ref("sessions.getBroadcasts"),
    sendBroadcast: ref("sessions.sendBroadcast"),
    toggleSessionActive: ref("sessions.toggleSessionActive"),
    deleteSession: ref("sessions.deleteSession"),
    cloneSession: ref("sessions.cloneSession"),
  },
  elements: {
    createElement: ref("elements.createElement"),
    getSessionElements: ref("elements.getSessionElements"),
    getVisibleElementsForParticipant: ref("elements.getVisibleElementsForParticipant"),
    deleteElement: ref("elements.deleteElement"),
    moveElementUp: ref("elements.moveElementUp"),
    moveElementDown: ref("elements.moveElementDown"),
    updateElementConditionalLogic: ref("elements.updateElementConditionalLogic"),
    updateElement: ref("elements.updateElement"),
    duplicateElement: ref("elements.duplicateElement"),
    generateUploadUrl: ref("elements.generateUploadUrl"),
    importElements: ref("elements.importElements"),
  },
  responses: {
    registerParticipant: ref("responses.registerParticipant"),
    leaveParticipant: ref("responses.leaveParticipant"),
    submitResponse: ref("responses.submitResponse"),
    getParticipantResponses: ref("responses.getParticipantResponses"),
    getSessionResponses: ref("responses.getSessionResponses"),
    checkSessionOwnership: ref("responses.checkSessionOwnership"),
    deleteAllSessionResponses: ref("responses.deleteAllSessionResponses"),
    deleteParticipantResponses: ref("responses.deleteParticipantResponses"),
    getSessionParticipants: ref("responses.getSessionParticipants"),
    getFileMetadata: ref("responses.getFileMetadata"),
  },
  classroom: {
    getPresentation: ref("classroom.getPresentation"),
    setPresentation: ref("classroom.setPresentation"),
    submitPageFeedback: ref("classroom.submitPageFeedback"),
    getMyPageFeedback: ref("classroom.getMyPageFeedback"),
    getPageFeedback: ref("classroom.getPageFeedback"),
    updatePageFeedbackStatus: ref("classroom.updatePageFeedbackStatus"),
  },
  documents: {
    getDocuments: ref("documents.getDocuments"),
    getDocument: ref("documents.getDocument"),
  },
  agent: {
    getStatus: ref("agent.getStatus"),
    getDiagnoses: ref("agent.getDiagnoses"),
    diagnose: ref("agent.diagnose"),
  },
  admin: {
    getOverview: ref("admin.getOverview"),
    getGraphStatus: ref("admin.getGraphStatus"),
    getDocuments: ref("admin.getDocuments"),
    getDocumentGraph: ref("admin.getDocumentGraph"),
  },
};

type ApiUser = {
  _id: string;
  _creationTime: number;
  email: string;
  name: string;
  role: "teacher" | "admin";
};

type ContextValue = {
  token: string | null;
  user: ApiUser | null;
  loading: boolean;
  revision: number;
  refresh: () => void;
  request: (path: string, init?: RequestInit, anonymous?: boolean) => Promise<any>;
  mutate: (reference: FunctionRef, args?: any) => Promise<any>;
  signIn: (provider: string, formData?: FormData) => Promise<void>;
  signOut: () => Promise<void>;
};

const ApiContext = createContext<ContextValue | null>(null);

function withAbsoluteFileUrls(value: any): any {
  if (Array.isArray(value)) return value.map(withAbsoluteFileUrls);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if ((key.endsWith("Url") || key === "dataUrl") && typeof item === "string" && item.startsWith("/")) {
      return [key, `${API_BASE_URL}${item}`];
    }
    return [key, withAbsoluteFileUrls(item)];
  }));
}

async function parseResponse(response: Response): Promise<any> {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  const value = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const detail = typeof value === "object" && value ? value.detail : value;
    throw new Error(typeof detail === "string" ? detail : "请求失败，请稍后重试");
  }
  return withAbsoluteFileUrls(value);
}

export async function lookupPublicSession(sessionCode: string): Promise<any | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/public/sessions/by-code/${encodeURIComponent(sessionCode)}`,
      { signal: controller.signal },
    );
    return parseResponse(response);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function ApiDataProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => ACTIVE_TOKEN_KEY ? localStorage.getItem(ACTIVE_TOKEN_KEY) : null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  const request = useCallback(async (path: string, init: RequestInit = {}, anonymous = false) => {
    const headers = new Headers(init.headers);
    const currentToken = ACTIVE_TOKEN_KEY ? localStorage.getItem(ACTIVE_TOKEN_KEY) : null;
    if (!anonymous && currentToken) headers.set("Authorization", `Bearer ${currentToken}`);
    if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
    return parseResponse(response);
  }, []);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      const stored = ACTIVE_TOKEN_KEY ? localStorage.getItem(ACTIVE_TOKEN_KEY) : null;
      if (!stored) {
        if (active) setLoading(false);
        return;
      }
      try {
        const current = await request("/api/auth/me");
        const expectedRole = AUTH_SCOPE === "admin" ? "admin" : "teacher";
        if (AUTH_SCOPE !== "public" && current.role !== expectedRole) {
          if (ACTIVE_TOKEN_KEY) localStorage.removeItem(ACTIVE_TOKEN_KEY);
          if (active) {
            setToken(null);
            setUser(null);
          }
        } else if (active) {
          setUser(current);
        }
      } catch {
        if (ACTIVE_TOKEN_KEY) localStorage.removeItem(ACTIVE_TOKEN_KEY);
        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void restore();
    return () => { active = false; };
  }, [request]);

  const signIn = useCallback(async (provider: string, formData?: FormData) => {
    const endpoint = provider === "anonymous"
      ? "/api/auth/anonymous"
      : String(formData?.get("flow") || "signIn") === "signUp"
        ? "/api/auth/register"
        : "/api/auth/login";
    const payload = provider === "anonymous" ? undefined : JSON.stringify({
      email: String(formData?.get("email") || ""),
      password: String(formData?.get("password") || ""),
      name: String(formData?.get("name") || ""),
    });
    const result = await request(endpoint, { method: "POST", body: payload }, true);
    const expectedRole = AUTH_SCOPE === "admin" ? "admin" : "teacher";
    if (result.user.role !== expectedRole) {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${result.access_token}` },
      }).catch(() => undefined);
      throw new Error(expectedRole === "admin" ? "该账号不是管理员账号" : "管理员账号不能用于教师入口");
    }
    if (!ACTIVE_TOKEN_KEY) throw new Error("当前页面不提供账号登录");
    localStorage.setItem(ACTIVE_TOKEN_KEY, result.access_token);
    setToken(result.access_token);
    setUser(result.user);
    setRevision((value) => value + 1);
  }, [request]);

  const signOut = useCallback(async () => {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } finally {
      if (ACTIVE_TOKEN_KEY) localStorage.removeItem(ACTIVE_TOKEN_KEY);
      setToken(null);
      setUser(null);
      setRevision((value) => value + 1);
    }
  }, [request]);

  const mutate = useCallback(async (reference: FunctionRef, args: any = {}) => {
    const id = (value: any) => encodeURIComponent(String(value));
    let path = "";
    let method = "POST";
    let body: any = args;
    let anonymous = false;
    switch (reference.key) {
      case "sessions.createSession": path = "/api/sessions"; break;
      case "sessions.updateSession": path = `/api/sessions/${id(args.sessionId)}`; method = "PATCH"; break;
      case "sessions.toggleSessionActive": path = `/api/sessions/${id(args.sessionId)}/toggle`; break;
      case "sessions.deleteSession": path = `/api/sessions/${id(args.sessionId)}`; method = "DELETE"; body = undefined; break;
      case "sessions.cloneSession": path = `/api/sessions/${id(args.sessionId)}/clone`; body = undefined; break;
      case "sessions.sendBroadcast": path = `/api/sessions/${id(args.sessionId)}/broadcasts`; break;
      case "elements.createElement": path = `/api/sessions/${id(args.sessionId)}/questions`; break;
      case "elements.deleteElement": path = `/api/questions/${id(args.elementId)}`; method = "DELETE"; body = undefined; break;
      case "elements.moveElementUp": path = `/api/questions/${id(args.elementId)}/move`; body = { direction: "up" }; break;
      case "elements.moveElementDown": path = `/api/questions/${id(args.elementId)}/move`; body = { direction: "down" }; break;
      case "elements.updateElementConditionalLogic": path = `/api/questions/${id(args.elementId)}`; method = "PATCH"; body = { conditionalLogic: args.conditionalLogic }; break;
      case "elements.updateElement": path = `/api/questions/${id(args.elementId)}`; method = "PATCH"; break;
      case "elements.duplicateElement": path = `/api/questions/${id(args.elementId)}/duplicate`; body = undefined; break;
      case "elements.generateUploadUrl": return `${API_BASE_URL}/api/files`;
      case "elements.importElements": path = `/api/sessions/${id(args.sessionId)}/questions/import`; break;
      case "responses.submitResponse": path = "/api/public/responses"; anonymous = true; break;
      case "responses.registerParticipant": path = `/api/public/sessions/${id(args.sessionId)}/participants/register`; anonymous = true; break;
      case "responses.leaveParticipant": path = `/api/public/sessions/${id(args.sessionId)}/participants/${id(args.participantId)}/leave`; anonymous = true; body = undefined; break;
      case "responses.deleteAllSessionResponses": path = `/api/sessions/${id(args.sessionId)}/responses`; method = "DELETE"; body = undefined; break;
      case "responses.deleteParticipantResponses": path = `/api/sessions/${id(args.sessionId)}/participants/${id(args.participantId)}/responses`; method = "DELETE"; body = undefined; break;
      case "classroom.setPresentation": path = `/api/sessions/${id(args.sessionId)}/presentation`; break;
      case "classroom.submitPageFeedback": path = `/api/public/sessions/${id(args.sessionId)}/page-feedback`; anonymous = true; break;
      case "classroom.updatePageFeedbackStatus": path = `/api/sessions/${id(args.sessionId)}/page-feedback/${id(args.feedbackId)}`; method = "PATCH"; body = { status: args.status }; break;
      case "agent.diagnose": path = `/api/sessions/${id(args.sessionId)}/agent/diagnose`; body = undefined; break;
      default: throw new Error(`Unknown API mutation: ${reference.key}`);
    }
    const result = await request(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    }, anonymous);
    refresh();
    return result;
  }, [request, refresh]);

  const value = useMemo(() => ({ token, user, loading, revision, refresh, request, mutate, signIn, signOut }),
    [token, user, loading, revision, refresh, request, mutate, signIn, signOut]);
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApiData() {
  const value = useContext(ApiContext);
  if (!value) throw new Error("ApiDataProvider is missing");
  return value;
}

async function runQuery(request: ContextValue["request"], reference: FunctionRef, args: any): Promise<any> {
  const id = (value: any) => encodeURIComponent(String(value));
  switch (reference.key) {
    case "sessions.getTeacherSessions": return request("/api/sessions");
    case "sessions.getSessionByCode": return request(`/api/public/sessions/by-code/${id(args.sessionCode)}`, {}, true);
    case "sessions.verifyResultsAccess": return request("/api/public/sessions/verify-results", { method: "POST", body: JSON.stringify(args) }, true);
    case "sessions.getBroadcasts": return request(`/api/public/sessions/${id(args.sessionId)}/broadcasts`, {}, true);
    case "elements.getSessionElements": return request(`/api/public/sessions/${id(args.sessionId)}/all-questions`, {}, true);
    case "elements.getVisibleElementsForParticipant": return request(`/api/public/sessions/${id(args.sessionId)}/questions?participant_id=${id(args.participantId)}`, {}, true);
    case "responses.getParticipantResponses": return request(`/api/public/sessions/${id(args.sessionId)}/participants/${id(args.participantId)}/responses`, {}, true);
    case "responses.getSessionResponses": return request(`/api/public/sessions/${id(args.sessionId)}/responses`, {}, true);
    case "responses.checkSessionOwnership": return request(`/api/sessions/${id(args.sessionId)}/ownership`);
    case "responses.getSessionParticipants": return request(`/api/sessions/${id(args.sessionId)}/participants`);
    case "responses.getFileMetadata": return request(`/api/files/${id(args.fileId)}/metadata`, {}, true);
    case "classroom.getPresentation": return request(`/api/public/sessions/${id(args.sessionId)}/presentation`, {}, true);
    case "classroom.getMyPageFeedback": return request(`/api/public/sessions/${id(args.sessionId)}/page-feedback?participant_id=${id(args.participantId)}`, {}, true);
    case "classroom.getPageFeedback": {
      const params = new URLSearchParams();
      if (args.documentId) params.set("document_id", String(args.documentId));
      if (args.pageNumber) params.set("page_number", String(args.pageNumber));
      const query = params.toString();
      return request(`/api/sessions/${id(args.sessionId)}/page-feedback${query ? `?${query}` : ""}`);
    }
    case "documents.getDocuments": {
      const query = args.sessionId ? `?session_id=${id(args.sessionId)}` : "";
      return request(`/api/documents${query}`);
    }
    case "documents.getDocument": return request(`/api/documents/${id(args.documentId)}`);
    case "agent.getStatus": return request("/api/agent/status");
    case "agent.getDiagnoses": return request(`/api/sessions/${id(args.sessionId)}/agent/diagnoses`);
    case "admin.getOverview": return request("/api/admin/overview");
    case "admin.getGraphStatus": return request("/api/admin/graph/status");
    case "admin.getDocuments": return request("/api/admin/documents");
    case "admin.getDocumentGraph": return request(`/api/admin/documents/${id(args.documentId)}/graph`);
    default: throw new Error(`Unknown API query: ${reference.key}`);
  }
}

export function useQueryState(reference: FunctionRef, args?: any | "skip") {
  const { request, revision, token } = useApiData();
  const [result, setResult] = useState<any>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(args !== "skip");
  const argsKey = args === "skip" ? "skip" : JSON.stringify(args ?? {});
  useEffect(() => {
    if (args === "skip") {
      setResult(undefined);
      setError(null);
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    setError(null);
    const load = async () => {
      try {
        const next = await runQuery(request, reference, args ?? {});
        if (active) {
          setResult(next);
          setError(null);
          setIsLoading(false);
        }
      } catch (caught) {
        const nextError = caught instanceof Error ? caught : new Error("数据查询失败");
        console.error(`[ClassLoop] ${reference.key}`, nextError);
        if (active) {
          setResult(undefined);
          setError(nextError);
          setIsLoading(false);
        }
      }
    };
    void load();
    const interval = window.setInterval(load, 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [request, reference.key, argsKey, revision, token]);
  return { data: result, error, isLoading };
}

export function useQuery(reference: FunctionRef, args?: any | "skip") {
  return useQueryState(reference, args).data;
}

export type SessionLiveEvent = {
  id: string;
  type: string;
  sessionId: string;
  createdAt: number;
  data: Record<string, any>;
};

export function useSessionEvents(sessionId?: string | null) {
  const { refresh } = useApiData();
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "reconnecting">("idle");
  const [lastEvent, setLastEvent] = useState<SessionLiveEvent | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus("idle");
      setLastEvent(null);
      return;
    }
    setStatus("connecting");
    const source = new EventSource(`${API_BASE_URL}/api/public/sessions/${encodeURIComponent(sessionId)}/events`);
    source.onopen = () => setStatus("connected");
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as SessionLiveEvent;
        setLastEvent(event);
        if (event.type !== "stream.connected") refresh();
      } catch (error) {
        console.error("[ClassLoop] 无法解析课堂实时事件", error);
      }
    };
    source.onerror = () => setStatus("reconnecting");
    return () => {
      source.close();
      setStatus("idle");
    };
  }, [sessionId, refresh]);

  return { status, lastEvent, isConnected: status === "connected" };
}

export function useMutation(reference: FunctionRef) {
  const { mutate } = useApiData();
  return useCallback((args?: any) => mutate(reference, args), [reference.key, mutate]);
}

export function useAuthActions() {
  const { signIn, signOut } = useApiData();
  return { signIn, signOut };
}

export function useConvexAuth() {
  const { user, loading } = useApiData();
  return { isAuthenticated: Boolean(user), isLoading: loading };
}

export function useCurrentUser() {
  const { user } = useApiData();
  return { user, resetDemo: () => undefined };
}

export function Authenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  return !isLoading && isAuthenticated ? <>{children}</> : null;
}

export function Unauthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  return !isLoading && !isAuthenticated ? <>{children}</> : null;
}
