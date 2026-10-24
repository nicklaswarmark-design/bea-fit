import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Dumbbell, TrendingUp, User } from "lucide-react";
import { useEffect } from "react";
import { useProfile } from "@/lib/data";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/hem", label: "Hem", icon: Home },
  { to: "/traning", label: "Träning", icon: Dumbbell },
  { to: "/utveckling", label: "Utveckling", icon: TrendingUp },
  { to: "/profil", label: "Profil", icon: User },
] as const;

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("leading-none", className)}>
      <div className="font-display text-xl font-extrabold tracking-tight">
        BEACTIVE<span className="text-accent">.</span>
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">
        Powered by Bea
      </div>
    </div>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const profile = useProfile();
  const immersive = pathname.startsWith("/traning/pass/") || pathname.startsWith("/onboarding");

  useEffect(() => {
    if (profile.data && !profile.data.onboarded && !pathname.startsWith("/onboarding")) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [profile.data, pathname, navigate]);

  return (
    <div className="min-h-screen bg-background md:flex">
      {!immersive && (
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card px-5 py-8 md:flex">
          <Brand />
          <nav className="mt-10 flex flex-col gap-1">
            {TABS.map((t) => {
              const active = pathname.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <t.icon className="size-5" />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </aside>
      )}
      <main className={cn("mx-auto w-full flex-1", !immersive && "max-w-3xl pb-28 md:pb-10")}>
        <Outlet />
      </main>
      {!immersive && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur safe-bottom md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4">
            {TABS.map((t) => {
              const active = pathname.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "rounded-full px-4 py-1 transition-colors",
                      active && "bg-secondary",
                    )}
                  >
                    <t.icon className="size-5" />
                  </span>
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 px-5 pt-8 pb-4 safe-top md:px-8">
      <div>
        {subtitle && <p className="text-sm font-semibold text-muted-foreground">{subtitle}</p>}
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
      </div>
      {right}
    </header>
  );
}

export function LoadingBlock() {
  return (
    <div className="space-y-3 px-5 md:px-8" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-3xl bg-muted" />
      ))}
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="mx-5 rounded-3xl border border-destructive/30 bg-card p-5 md:mx-8">
      <p className="font-semibold">Något gick fel</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "Okänt fel"}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-sm font-semibold text-primary underline">
          Försök igen
        </button>
      )}
    </div>
  );
}
