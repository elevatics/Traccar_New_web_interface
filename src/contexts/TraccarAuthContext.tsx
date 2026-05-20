import {
  createContext,
  useCallback,
  useEffect,
  useContext,
  useMemo,
  useState,
} from "react";
import { login as loginService, logout as logoutService } from "@/services/authService";
import {
  clearAuthSession,
  getMe,
  getStoredToken,
  getStoredUser,
  saveAuthSession,
  traccarSignin,
  traccarSignup,
} from "@/services/backendAuthService";

const STORAGE_KEY = "traccar_authenticated";
const AUTH_MODE_KEY = "auth_mode";

type TraccarAuthContextValue = {
  isAuthenticated: boolean;
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const TraccarAuthContext = createContext<TraccarAuthContextValue | undefined>(
  undefined
);

const getInitialAuthState = () => {
  if (typeof window === "undefined") return false;
  const inSession = window.sessionStorage.getItem(STORAGE_KEY) === "true";
  const inLegacy = window.localStorage.getItem(STORAGE_KEY) === "true";
  return (inSession || inLegacy) && Boolean(getStoredToken());
};

export const TraccarAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(getInitialAuthState);
  const [user, setUser] = useState<any | null>(
    typeof window !== "undefined" ? getStoredUser() : null
  );

  const login = useCallback(async (email: string, password: string) => {
    const result = await traccarSignin({ email, password });

    saveAuthSession(result.token, result.user);
    setUser(result.user || null);
    window.sessionStorage.setItem(AUTH_MODE_KEY, "traccar");
    window.localStorage.removeItem(AUTH_MODE_KEY);
    await loginService(email, password);

    setIsAuthenticated(true);
    window.sessionStorage.setItem(STORAGE_KEY, "true");
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const result = await traccarSignup({ name, email, password });
    saveAuthSession(result.token, result.user);
    setUser(result.user || null);
    window.sessionStorage.setItem(AUTH_MODE_KEY, "traccar");
    window.localStorage.removeItem(AUTH_MODE_KEY);
    await loginService(email, password);
    setIsAuthenticated(true);
    window.sessionStorage.setItem(STORAGE_KEY, "true");
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const logout = useCallback(async () => {
    const authMode =
      window.sessionStorage.getItem(AUTH_MODE_KEY) ??
      window.localStorage.getItem(AUTH_MODE_KEY);
    try {
      if (authMode === "traccar") {
        await logoutService();
      }
    } finally {
      clearAuthSession();
      setUser(null);
      setIsAuthenticated(false);
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(AUTH_MODE_KEY);
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(AUTH_MODE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getStoredToken()) {
      setIsAuthenticated(false);
      return;
    }
    void getMe()
      .then((result) => {
        if (!result?.user) throw new Error("Invalid session");
        setUser(result.user);
        setIsAuthenticated(true);
        window.sessionStorage.setItem(STORAGE_KEY, "true");
        window.localStorage.removeItem(STORAGE_KEY);
      })
      .catch(() => {
        clearAuthSession();
        setUser(null);
        setIsAuthenticated(false);
        window.sessionStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(STORAGE_KEY);
      });
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      login,
      signup,
      logout,
    }),
    [isAuthenticated, user, login, signup, logout]
  );

  return (
    <TraccarAuthContext.Provider value={value}>
      {children}
    </TraccarAuthContext.Provider>
  );
};

export const useTraccarAuth = () => {
  const context = useContext(TraccarAuthContext);
  if (!context) {
    throw new Error("useTraccarAuth must be used within TraccarAuthProvider");
  }
  return context;
};

