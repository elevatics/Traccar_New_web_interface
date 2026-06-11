type AuthUser = {
  id: string;
  name: string;
  email: string;
  provider: "local" | "traccar";
};

type AuthResponse = {
  success: boolean;
  token: string;
  user: AuthUser;
};

const AUTH_TOKEN_KEY = "backend_auth_token";
const AUTH_USER_KEY = "backend_auth_user";
const API_BASE_URL =
  import.meta.env.VITE_ALERT_BACKEND_URL || "https://backend-traccar.onrender.com";

const getAuthHeader = () => {
  const token = getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

const request = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const rawMessage: string = data?.error || "";
    const sanitized = rawMessage.toLowerCase().includes("traccar")
      ? "Authentication failed. Please check your credentials and try again."
      : rawMessage || "Request failed";
    const error: any = new Error(sanitized);
    error.response = { status: response.status, data };
    throw error;
  }
  return data;
};

export const saveAuthSession = (token: string, user: AuthUser) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  window.sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
};

export const clearAuthSession = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
  window.sessionStorage.removeItem(AUTH_USER_KEY);
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
};

export const getStoredToken = () => {
  if (typeof window === "undefined") return null;
  const sessionToken = window.sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (sessionToken) return sessionToken;
  const legacyToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (legacyToken) {
    window.sessionStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    return legacyToken;
  }
  return null;
};

export const getStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  const raw =
    window.sessionStorage.getItem(AUTH_USER_KEY) ??
    window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw);
    window.sessionStorage.setItem(AUTH_USER_KEY, raw);
    window.localStorage.removeItem(AUTH_USER_KEY);
    return user;
  } catch {
    return null;
  }
};

export const signin = async (payload: { email: string; password: string }) =>
  (await request("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as AuthResponse;

export const signup = async (payload: {
  name: string;
  email: string;
  password: string;
}) =>
  (await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as AuthResponse;

export const traccarSignin = async (payload: { email: string; password: string }) =>
  (await request("/api/auth/traccar-signin", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as AuthResponse;

export const traccarSignup = async (payload: {
  name: string;
  email: string;
  password: string;
}) =>
  (await request("/api/auth/traccar-signup", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as AuthResponse;

export const getMe = async () =>
  (await request("/api/auth/me", {
    method: "GET",
    headers: getAuthHeader(),
  })) as { success: boolean; user: AuthUser };
