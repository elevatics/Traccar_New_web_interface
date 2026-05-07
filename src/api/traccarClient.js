import axios from "axios";

const TRACCAR_BASIC_AUTH_KEY = "traccar_basic_auth";

/**
 * Base URL for Traccar REST calls from the browser.
 * - Default `/api` is same-origin (HTTPS on Vercel, dev server) so you avoid mixed-content
 *   when the page is served over HTTPS. Proxy rewrites must forward `/api` → your Traccar server
 *   (see `vercel.json` and `vite.config.ts`).
 * - Override with `VITE_TRACCAR_API_BASE_URL` only if you use an HTTPS-capable Traccar URL or another proxy.
 */
const traccarBaseUrl = import.meta.env.VITE_TRACCAR_API_BASE_URL || "/api";

const getStoredBasicAuth = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TRACCAR_BASIC_AUTH_KEY);
};

export const setTraccarBasicAuth = (username, password) => {
  if (typeof window === "undefined") {
    return;
  }
  const encoded = window.btoa(`${username}:${password}`);
  window.localStorage.setItem(TRACCAR_BASIC_AUTH_KEY, encoded);
};

export const clearTraccarBasicAuth = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(TRACCAR_BASIC_AUTH_KEY);
};

const traccarClient = axios.create({
  baseURL: traccarBaseUrl,
  withCredentials: true,
  timeout: 15000,
});

traccarClient.interceptors.request.use(
  (config) => {
    const storedAuth = getStoredBasicAuth();
    if (storedAuth && !config.headers?.Authorization) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Basic ${storedAuth}`;
    }

    const method = String(config.method || "GET").toUpperCase();
    const url = `${config.baseURL || ""}${config.url || ""}`;
    // console.info("[Traccar API][Request]", {
    //   method,
    //   url,
    //   withCredentials: config.withCredentials,
    //   hasAuthorization: Boolean(config.headers?.Authorization),
    //   params: config.params || null,
    //   data: config.data || null,
    // });
    return config;
  },
  (error) => {
    console.error("[Traccar API][Request Error]", error?.message || error);
    return Promise.reject(error);
  },
);

traccarClient.interceptors.response.use(
  (response) => {
    const method = String(response.config?.method || "GET").toUpperCase();
    const url = `${response.config?.baseURL || ""}${response.config?.url || ""}`;
    // console.info("[Traccar API][Response]", {
    //   method,
    //   url,
    //   status: response.status,
    //   statusText: response.statusText,
    //   hasData:
    //     Array.isArray(response.data) || typeof response.data === "object"
    //       ? true
    //       : Boolean(response.data),
    //   dataCount: Array.isArray(response.data)
    //     ? response.data.length
    //     : undefined,
    //   data: response.data,
    // });
    return response;
  },
  (error) => {
    const config = error?.config || {};
    const method = String(config.method || "GET").toUpperCase();
    const url = `${config.baseURL || ""}${config.url || ""}`;
    const status = error?.response?.status;
    const responseData = error?.response?.data;
    const message =
      responseData?.message || error?.message || "Unexpected API error";

    const diagnostics = {
      method,
      url,
      status,
      message,
      withCredentials: config.withCredentials,
      requestSent: Boolean(error?.request),
      responseData,
      hint: undefined,
    };

    if (!error?.response) {
      diagnostics.hint =
        "Network/CORS failure: request blocked, timed out, or no server response.";
    } else if (status === 401) {
      diagnostics.hint =
        "Unauthorized: login may have failed or session cookie not sent/accepted.";
    } else if (status === 403) {
      diagnostics.hint =
        "Forbidden: possible CORS policy or permission issue on Traccar server.";
    } else if (status === 404) {
      diagnostics.hint =
        "Endpoint not found: verify route and HTTP method for this Traccar version.";
    } else if (status >= 500) {
      diagnostics.hint = "Server error from Traccar instance.";
    }

    console.error("[Traccar API][Response Error]", diagnostics);
    return Promise.reject(error);
  },
);

export default traccarClient;
