import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { login as loginService, logout as logoutService } from "@/services/authService";

const STORAGE_KEY = "traccar_authenticated";

type TraccarAuthContextValue = {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const TraccarAuthContext = createContext<TraccarAuthContextValue | undefined>(
  undefined
);

const getInitialAuthState = () =>
  typeof window !== "undefined" &&
  window.localStorage.getItem(STORAGE_KEY) === "true";

export const TraccarAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(getInitialAuthState);

  const login = useCallback(async (email: string, password: string) => {
    await loginService(email, password);
    setIsAuthenticated(true);
    window.localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutService();
    } finally {
      setIsAuthenticated(false);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      login,
      logout,
    }),
    [isAuthenticated, login, logout]
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

