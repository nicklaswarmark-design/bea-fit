import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/AppShell";
import hero from "@/assets/hero.jpg";
import { Flame, Calendar, Trophy } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BEACTIVE – Powered by Bea | Träningsdagbok" },
      {
        name: "description",
        content: "Styrka, löpning och progression – en personlig träningsapp för Bea.",
      },
      { property: "og:title", content: "BEACTIVE – Powered by Bea" },
      {
        property: "og:description",
        content: "Styrka, löpning och progression – en personlig träningsapp för Bea.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/hem", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 md:grid-cols-2 md:items-center md:py-16">
        <div>
          <Brand />
          <h1 className="mt-10 text-5xl font-extrabold leading-[1.05] md:text-6xl">
            Stark, stadig <span className="text-accent italic">& glad</span> i kroppen.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Din träningsdagbok, ditt program och din progression – samlat på ett ställe. Tre gympass
            och en Run Club i veckan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Kom igång</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth" search={{ mode: "login" }}>
                Logga in
              </Link>
            </Button>
          </div>

          <div className="mt-10 card-surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-accent">
                Förhandsvisning · demodata
              </p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Exempel
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Demo icon={Calendar} value="2/4" label="Denna vecka" />
              <Demo icon={Flame} value="3" label="Veckor i rad" />
              <Demo icon={Trophy} value="—" label="Personbästa" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Så här ser din översikt ut. Riktiga siffror visas först när du loggat dina egna pass.
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[2rem] shadow-lift">
          <img
            src={hero}
            alt="Kvinna som gör hip thrust i ett ljust gym"
            width={1024}
            height={1280}
            className="h-full max-h-[80vh] w-full object-cover"
          />
          <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-card/90 p-4 backdrop-blur">
            <p className="font-display text-lg font-bold">Beast mode activated!</p>
            <p className="text-sm text-muted-foreground">Måndag · Underkropp – säte & ben</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Demo({ icon: Icon, value, label }: { icon: typeof Flame; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-secondary p-3">
      <Icon className="mx-auto size-4 text-primary" />
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}
