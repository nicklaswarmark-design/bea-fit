import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useTemplates, keys } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Brand, LoadingBlock } from "@/components/AppShell";
import { DAY_SHORT, WEEK_ORDER } from "@/lib/program";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Välkommen – BEACTIVE" },
      { name: "description", content: "Ställ in din profil och ditt träningsprogram." },
      { property: "og:title", content: "Välkommen – BEACTIVE" },
      { property: "og:description", content: "Ställ in din profil och ditt träningsprogram." },
    ],
  }),
  component: Onboarding,
});

import { EQUIPMENT } from "@/lib/program";

function Onboarding() {
  const profile = useProfile();
  const templates = useTemplates();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Bea");
  const [equipment, setEquipment] = useState<string[]>(EQUIPMENT.slice(0, 5));
  const [days, setDays] = useState<Record<string, number>>({});
  const [minutes, setMinutes] = useState(60);
  const [avoid, setAvoid] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.name);
      if (profile.data.equipment.length) setEquipment(profile.data.equipment);
      setMinutes(profile.data.session_minutes);
      setAvoid(profile.data.avoid_movements);
    }
  }, [profile.data]);
  useEffect(() => {
    if (templates.data)
      setDays(
        Object.fromEntries(
          templates.data.filter((t) => t.day_of_week !== null).map((t) => [t.id, t.day_of_week!]),
        ),
      );
  }, [templates.data]);

  if (!profile.data || !templates.data)
    return (
      <div className="pt-10">
        <LoadingBlock />
      </div>
    );
  const p = profile.data;
  const weekly = templates.data.filter((t) => t.day_of_week !== null);

  async function finish() {
    setSaving(true);
    try {
      for (const t of weekly) {
        if (days[t.id] !== t.day_of_week) {
          const r = await supabase
            .from("workout_templates")
            .update({ day_of_week: days[t.id] ?? null })
            .eq("id", t.id);
          if (r.error) throw r.error;
        }
      }
      const r = await supabase
        .from("profiles")
        .update({
          name,
          equipment,
          session_minutes: minutes,
          avoid_movements: avoid,
          training_days: Object.values(days),
          onboarded: true,
          program_start: new Date().toISOString().slice(0, 10),
        })
        .eq("id", p.id);
      if (r.error) throw r.error;
      await qc.invalidateQueries({ queryKey: keys.profile });
      await qc.invalidateQueries({ queryKey: keys.templates });
      toast.success(`Välkommen, ${name}! Beast mode activated.`);
      navigate({ to: "/hem", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    <div key="0">
      <h1 className="text-4xl font-extrabold">Hej {name}! 👋</h1>
      <p className="mt-3 text-muted-foreground">
        Vi har förberett din profil. Du kan ändra allt nu eller senare.
      </p>
      <dl className="mt-6 space-y-2 card-surface p-5 text-sm">
        <Row k="Namn">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-40 text-right"
          />
        </Row>
        <Row k="Nivå">{p.level}</Row>
        <Row k="Mål">{p.goal}</Row>
        <Row k="Styrkepass / vecka">{p.strength_per_week}</Row>
        <Row k="Löppass / vecka">{p.runs_per_week}</Row>
        <Row k="Löpvana">{p.run_ability}</Row>
      </dl>
    </div>,
    <div key="1">
      <h1 className="text-3xl font-extrabold">Vilken utrustning har du?</h1>
      <p className="mt-2 text-muted-foreground">
        Vi använder det för att föreslå alternativa övningar.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {EQUIPMENT.map((e) => {
          const on = equipment.includes(e);
          return (
            <button
              key={e}
              onClick={() =>
                setEquipment(on ? equipment.filter((x) => x !== e) : [...equipment, e])
              }
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-semibold",
                on ? "border-primary bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {e}
            </button>
          );
        })}
      </div>
    </div>,
    <div key="2">
      <h1 className="text-3xl font-extrabold">Dina träningsdagar</h1>
      <p className="mt-2 text-muted-foreground">Välj vilken dag varje pass ska ligga.</p>
      <div className="mt-6 space-y-3">
        {weekly.map((t) => (
          <div key={t.id} className="card-surface p-4">
            <p className="font-semibold">
              {t.name} <span className="text-muted-foreground font-normal">· {t.subtitle}</span>
            </p>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {WEEK_ORDER.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays({ ...days, [t.id]: d })}
                  className={cn(
                    "min-h-11 rounded-xl text-xs font-bold",
                    days[t.id] === d ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {DAY_SHORT[d]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>,
    <div key="3">
      <h1 className="text-3xl font-extrabold">Passlängd & önskemål</h1>
      <p className="mt-6 text-sm font-semibold">Hur lång tid har du per pass?</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {[30, 45, 60, 75].map((m) => (
          <button
            key={m}
            onClick={() => setMinutes(m)}
            className={cn(
              "min-h-12 rounded-2xl font-bold",
              minutes === m ? "bg-primary text-primary-foreground" : "bg-card border",
            )}
          >
            {m} min
          </button>
        ))}
      </div>
      <p className="mt-6 text-sm font-semibold">Finns det rörelser du vill undvika?</p>
      <Textarea
        className="mt-2"
        placeholder="T.ex. knäböj med skivstång (valfritt)"
        value={avoid}
        onChange={(e) => setAvoid(e.target.value)}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Byt övningar fritt i programmet. Träna aldrig igenom smärta.
      </p>
    </div>,
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8 safe-top">
      <div className="flex items-center justify-between">
        <Brand />
        <span className="text-sm font-semibold text-muted-foreground">
          {step + 1}/{steps.length}
        </span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>
      <div className="mt-10 flex-1">{steps[step]}</div>
      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
            Tillbaka
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button className="flex-1" onClick={() => setStep(step + 1)}>
            Nästa
          </Button>
        ) : (
          <Button variant="accent" className="flex-1" disabled={saving} onClick={finish}>
            {saving ? "Sparar…" : "Kör igång!"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}
