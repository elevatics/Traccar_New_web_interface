import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTraccarAuth } from "@/contexts/TraccarAuthContext";
import { Eye, EyeOff, Mail, Lock, User, MapPin, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, login, signup } = useTraccarAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; name?: string }>({});

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

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
    if (!validate()) return;
    try {
      setSubmitting(true);
      setError(null);
      if (mode === "signup") {
        await signup(name, email, password, "traccar");
      } else {
        await login(email, password, "traccar");
      }
      navigate("/", { replace: true });
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError("Invalid credentials. Please check your username and password.");
      } else if (err?.response?.status === 409) {
        setError("Email already exists. Please sign in instead.");
      } else {
        setError(err?.message || "Login failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    /* ── Full-screen background ── */
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">

      {/* Background gradient layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary/80 to-slate-800" />

      {/* Decorative blurred circles — depth effect */}
      <div className="absolute top-[-10%] left-[-5%] w-[480px] h-[480px] rounded-full bg-primary/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[560px] h-[560px] rounded-full bg-slate-700/40 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Centered card ── */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Brand header */}
        {/* <div className="flex flex-col items-center gap-3 mb-6">
          <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shadow-xl">
            <MapPin className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">FleetTrack Pro</h1>
            <p className="text-white/50 text-xs mt-0.5">GPS Fleet Management</p>
          </div>
        </div> */}

        {/* Card */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-7 space-y-5">

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-border bg-muted/50 p-1 gap-1">
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); setFieldErrors({}); }}
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
              onClick={() => { setMode("signup"); setError(null); setFieldErrors({}); }}
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
                    onChange={(e) => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: undefined })); }}
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
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }}
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
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                  placeholder="••••••••"
                  className={cn("pl-9 pr-9 h-10 text-sm", fieldErrors.password && "border-destructive focus-visible:ring-destructive")}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
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
                  onClick={() => {/* forgot password placeholder */}}
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

            <Button
              type="submit"
              className="w-full h-10 font-semibold text-sm rounded-xl mt-1"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === "signup" ? "Creating account…" : "Signing in…"}
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
            &amp;{" "}
            <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
