import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/AppShell";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["login", "signup"]).optional() }),
  head: () => ({
    meta: [
      { title: "Logga in – BEACTIVE" },
      { name: "description", content: "Logga in eller skapa konto i BEACTIVE." },
      { property: "og:title", content: "Logga in – BEACTIVE" },
      { property: "og:description", content: "Logga in eller skapa konto i BEACTIVE." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initial } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">(initial ?? "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/hem", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/hem", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/hem" },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-sage px-5 py-10">
      <div className="w-full max-w-sm card-surface p-7">
        <Brand />
        {sent ? (
          <div className="mt-8">
            <h1 className="text-2xl font-bold">Kolla din mejl</h1>
            <p className="mt-2 text-muted-foreground">
              Vi har skickat en bekräftelselänk till {email}. Klicka på den så är du igång!
            </p>
            <Button
              variant="outline"
              className="mt-6 w-full"
              onClick={() => {
                setSent(false);
                setMode("login");
              }}
            >
              Till inloggning
            </Button>
          </div>
        ) : (
          <>
            <h1 className="mt-8 text-2xl font-bold">
              {mode === "signup" ? "Skapa ditt konto" : "Välkommen tillbaka"}
            </h1>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw">Lösenord</Label>
                <Input
                  id="pw"
                  type="password"
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Ett ögonblick…" : mode === "signup" ? "Skapa konto" : "Logga in"}
              </Button>
            </form>
            <button
              className="mt-5 w-full text-center text-sm font-semibold text-primary"
              onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            >
              {mode === "signup" ? "Har du redan ett konto? Logga in" : "Ny här? Skapa konto"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
