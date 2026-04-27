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
    const error: any = new Error(data?.error || "Request failed");
    error.response = { status: response.status, data };
    throw error;
  }
  return data;
};

export const saveAuthSession = (token: string, user: AuthUser) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
};

export const getStoredToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

export const getStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
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
