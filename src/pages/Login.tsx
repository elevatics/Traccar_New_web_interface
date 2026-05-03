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
    <div className="min-h-screen flex">
      {/* Left panel — gradient branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/85 to-primary/60 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] left-[-80px] w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute bottom-[-60px] right-[-60px] w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-[-30px] w-40 h-40 rounded-full bg-white/5" />

        <div className="relative z-10 text-white max-w-md text-center">
          {/* Logo / brand icon */}
          <div className="flex items-center justify-center mb-8">
            <div className="h-20 w-20 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shadow-2xl">
              <MapPin className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight">FleetTrack Pro</h1>
          <p className="text-white/70 text-lg mb-10">Real-time vehicle tracking & fleet intelligence</p>

          {/* Feature pills */}
          <div className="space-y-3 text-left">
            {[
              "Live GPS tracking for every vehicle",
              "AI-powered fleet insights & reports",
              "Instant alerts and geofencing",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm border border-white/10">
                <div className="h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="text-sm text-white/90">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">FleetTrack Pro</span>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {mode === "signup"
                ? "Sign up to start managing your fleet"
                : "Sign in to your fleet dashboard"}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-border bg-muted/40 p-1 gap-1">
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); setFieldErrors({}); }}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200",
                mode === "signin"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); setFieldErrors({}); }}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200",
                mode === "signup"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: undefined })); }}
                    placeholder="John Smith"
                    className={cn("pl-10", fieldErrors.name && "border-destructive focus-visible:ring-destructive")}
                    autoComplete="name"
                  />
                </div>
                {fieldErrors.name && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{fieldErrors.name}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Username or Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }}
                  placeholder="admin or name@example.com"
                  className={cn("pl-10", fieldErrors.email && "border-destructive focus-visible:ring-destructive")}
                  autoComplete="username"
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                  placeholder="••••••••"
                  className={cn("pl-10 pr-10", fieldErrors.password && "border-destructive focus-visible:ring-destructive")}
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
              {fieldErrors.password && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{fieldErrors.password}</p>}
            </div>

            {mode === "signin" && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-muted-foreground">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline font-medium"
                  onClick={() => {/* forgot password placeholder */}}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-semibold text-sm rounded-xl"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === "signup" ? "Creating account…" : "Signing in…"}
                </>
              ) : (
                mode === "signup" ? "Create account" : "Sign in to dashboard"
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <span className="text-primary hover:underline cursor-pointer">Terms of Service</span>{" "}
            and{" "}
            <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
