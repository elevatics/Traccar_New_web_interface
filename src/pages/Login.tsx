import { FormEvent, useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTraccarAuth } from "@/contexts/TraccarAuthContext";
import { Eye, EyeOff, Mail, Lock, User, Loader2, AlertCircle, CheckCircle2, KeyRound, ArrowLeft, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { requestPasswordReset } from "@/services/smtpService";

const ATTEMPT_KEY = "login_failed_attempts";
const LOCKOUT_UNTIL_KEY = "login_lockout_until";
const MAX_ATTEMPTS = 5;
const MAX_LOCKOUT_SECONDS = 30;

function getLockoutSeconds(attempts: number): number {
  if (attempts < 1) return 0;
  return Math.min(Math.pow(2, attempts - 1), MAX_LOCKOUT_SECONDS);
}

function getStoredAttempts(): number {
  return parseInt(sessionStorage.getItem(ATTEMPT_KEY) ?? "0", 10);
}

function getStoredLockoutUntil(): number {
  return parseInt(sessionStorage.getItem(LOCKOUT_UNTIL_KEY) ?? "0", 10);
}

function recordFailedAttempt(): number {
  const next = getStoredAttempts() + 1;
  sessionStorage.setItem(ATTEMPT_KEY, String(next));
  const lockoutMs = getLockoutSeconds(next) * 1000;
  sessionStorage.setItem(LOCKOUT_UNTIL_KEY, String(Date.now() + lockoutMs));
  return next;
}

function clearAttempts(): void {
  sessionStorage.removeItem(ATTEMPT_KEY);
  sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
}

type LoginMode = "signin" | "signup" | "forgot" | "forgot-sent";

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, login, signup } = useTraccarAuth();
  const [mode, setMode] = useState<LoginMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [failedAttempts, setFailedAttempts] = useState(getStoredAttempts);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(() => {
    const until = getStoredLockoutUntil();
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  });
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (lockoutSecondsLeft <= 0) return;
    lockoutTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((getStoredLockoutUntil() - Date.now()) / 1000));
      setLockoutSecondsLeft(remaining);
      if (remaining <= 0 && lockoutTimerRef.current) {
        clearInterval(lockoutTimerRef.current);
      }
    }, 500);
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    };
  }, [lockoutSecondsLeft > 0]);

  const isLockedOut = lockoutSecondsLeft > 0;

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const resetForm = () => {
    setError(null);
    setFieldErrors({});
  };

  const switchMode = (next: LoginMode) => {
    resetForm();
    if (next === "forgot") {
      setForgotEmail(email);
    }
    setMode(next);
  };

  // ── Auth form validation ───────────────────────────────────────────────────
  const validate = () => {
    const errors: typeof fieldErrors = {};
    if (mode === "signup" && !name.trim()) errors.name = "Name is required";
    if (!email.trim()) errors.email = "Username or email is required";
    if (!password) errors.password = "Password is required";
    else if (password.length < 4) errors.password = "Password must be at least 4 characters";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isLockedOut) return;
    if (!validate()) return;
    try {
      setSubmitting(true);
      setError(null);
      if (mode === "signup") {
        await signup(name, email, password);
      } else {
        await login(email, password);
      }
      clearAttempts();
      setFailedAttempts(0);
      setLockoutSecondsLeft(0);
      navigate("/", { replace: true });
    } catch (err: any) {
      const next = recordFailedAttempt();
      setFailedAttempts(next);
      const secs = Math.max(0, Math.ceil((getStoredLockoutUntil() - Date.now()) / 1000));
      setLockoutSecondsLeft(secs);
      if (err?.response?.status === 401) {
        setError("Invalid credentials. Please check your username and password.");
      } else if (err?.response?.status === 409) {
        setError("Email already exists. Please sign in instead.");
      } else if (err?.response?.status === 429) {
        setError("Too many attempts. Please wait before trying again.");
      } else {
        setError(err?.message || "Login failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Forgot password ────────────────────────────────────────────────────────
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState<string | null>(null);

  const handleForgotSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotEmailError("Please enter your email address.");
      return;
    }
    setForgotEmailError(null);
    setSubmitting(true);
    setError(null);
    try {
      await requestPasswordReset(forgotEmail.trim());
      setMode("forgot-sent");
    } catch (err: any) {
      setError(err?.message || "Failed to send reset email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Background decoration (shared) ────────────────────────────────────────
  const background = (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary/80 to-slate-800" />
      <div className="absolute top-[-10%] left-[-5%] w-[480px] h-[480px] rounded-full bg-primary/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[560px] h-[560px] rounded-full bg-slate-700/40 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </>
  );

  // ── Forgot password — email sent confirmation ──────────────────────────────
  if (mode === "forgot-sent") {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
        {background}
        <div className="relative z-10 w-full max-w-sm">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-7 space-y-5 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Check your inbox</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If an account exists for <span className="font-medium text-foreground">{forgotEmail}</span>,
                we've sent a password reset link. Check your email and follow the instructions.
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <Button
                className="w-full h-10 font-semibold text-sm rounded-xl"
                onClick={() => switchMode("signin")}
              >
                Back to sign in
              </Button>
              <p className="text-xs text-muted-foreground">
                Didn't receive it?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => {
                    resetForm();
                    setMode("forgot");
                  }}
                >
                  Try again
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Forgot password — enter email ──────────────────────────────────────────
  if (mode === "forgot") {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
        {background}
        <div className="relative z-10 w-full max-w-sm">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-7 space-y-5">
            {/* Header */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Forgot password?</h2>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Enter your email and we'll send you a reset link
                </p>
              </div>
            </div>

            <form onSubmit={handleForgotSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email" className="text-xs font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      setForgotEmailError(null);
                    }}
                    placeholder="name@example.com"
                    className={cn(
                      "pl-9 h-10 text-sm",
                      forgotEmailError && "border-destructive focus-visible:ring-destructive"
                    )}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {forgotEmailError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {forgotEmailError}
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 font-semibold text-sm rounded-xl mt-1"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending reset link…
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Sign in / Sign up ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {background}

      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-7 space-y-5">

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-border bg-muted/50 p-1 gap-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                mode === "signin"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                mode === "signup"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign up
            </button>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              {mode === "signup"
                ? "Sign up to start managing your fleet"
                : "Sign in to your fleet dashboard"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })); }}
                    placeholder="John Smith"
                    className={cn("pl-9 h-10 text-sm", fieldErrors.name && "border-destructive focus-visible:ring-destructive")}
                    autoComplete="name"
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{fieldErrors.name}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">Username or Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
                  placeholder="admin or name@example.com"
                  className={cn("pl-9 h-10 text-sm", fieldErrors.email && "border-destructive focus-visible:ring-destructive")}
                  autoComplete="username"
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
                  placeholder="••••••••"
                  className={cn("pl-9 pr-9 h-10 text-sm", fieldErrors.password && "border-destructive focus-visible:ring-destructive")}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{fieldErrors.password}
                </p>
              )}
            </div>

            {mode === "signin" && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline font-medium"
                  onClick={() => switchMode("forgot")}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            {failedAttempts >= 3 && !isLockedOut && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
                <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {MAX_ATTEMPTS - failedAttempts} attempt{MAX_ATTEMPTS - failedAttempts !== 1 ? "s" : ""} remaining before temporary lockout.
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 font-semibold text-sm rounded-xl mt-1"
              disabled={submitting || isLockedOut}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === "signup" ? "Creating account…" : "Signing in…"}
                </>
              ) : isLockedOut ? (
                <>
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Try again in {lockoutSecondsLeft}s
                </>
              ) : (
                mode === "signup" ? "Create account" : "Sign in"
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-[11px] text-muted-foreground pt-1">
            By continuing, you agree to our{" "}
            <span className="text-primary hover:underline cursor-pointer">Terms</span>{" "}
            &{" "}
            <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
