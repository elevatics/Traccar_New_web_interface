import {
  traccarDelete,
  traccarGet,
  traccarPost,
} from "../api/traccarRequest";
import {
  clearTraccarBasicAuth,
  setTraccarBasicAuth,
} from "../api/traccarClient";

export const login = async (email, password) => {
  // Traccar session endpoint expects form-style payload for cookie auth.
  const payload = new URLSearchParams({
    email,
    password,
  });
  const session = await traccarPost("/session", payload, {
    config: {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  });
  setTraccarBasicAuth(email, password);

  return session;
};

export const logout = async () => {
  try {
    return await traccarDelete("/session");
  } finally {
    clearTraccarBasicAuth();
  }
};

export const getCurrentSession = async () => {
  try {
    return await traccarGet("/session");
  } catch (error) {
    if (error?.response?.status === 404) {
      console.warn(
        "[Traccar Auth] GET /session returned 404. This Traccar instance may not expose session read endpoint."
      );
      return null;
    }
    throw error;
  }
};
