import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";

const credsSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  displayName: z.string().trim().min(2, "At least 2 characters").max(60).optional(),
});

type Mode = "signin" | "signup";

const BlogAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading, setSession } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  const redirectTo =
    (location.search as { redirect?: string } | undefined)?.redirect ?? "/blog/admin";

  useEffect(() => {
    if (!loading && isAuthenticated) navigate({ to: redirectTo, replace: true });
  }, [loading, isAuthenticated, navigate, redirectTo]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const parsed = credsSchema.safeParse({
        email,
        password,
        displayName: mode === "signup" ? displayName : undefined,
      });
      if (!parsed.success) {
        toast({
          title: "Check the form",
          description: parsed.error.issues[0].message,
          variant: "destructive",
        });
        return;
      }

      const result =
        mode === "signup"
          ? await api.auth.signup({
              email: parsed.data.email,
              password: parsed.data.password,
              displayName: parsed.data.displayName,
            })
          : await api.auth.login({
              email: parsed.data.email,
              password: parsed.data.password,
            });

      await setSession(result.token);
      toast({ title: mode === "signup" ? "Account created" : "Welcome back" });
      navigate({ to: redirectTo, replace: true });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Something went wrong";
      toast({ title: "Authentication failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20">
        <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Journal
          </Link>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            {mode === "signin" ? "Sign in to write" : "Create your author account"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {mode === "signin"
              ? "Use your email and password to access the Adhar Journal."
              : "Anyone can submit a story — a moderator will review before it goes live."}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jane Doe"
                  maxLength={60}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                maxLength={72}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary-modern w-full inline-flex items-center justify-center gap-2 rounded-full h-10 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={busy}
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{mode === "signin" ? "Sign in" : "Create account"}</span>
            </button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            {mode === "signin" ? (
              <>
                New to the Journal?{" "}
                <button onClick={() => setMode("signup")} className="text-primary hover:underline">
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => setMode("signin")} className="text-primary hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogAuth;
