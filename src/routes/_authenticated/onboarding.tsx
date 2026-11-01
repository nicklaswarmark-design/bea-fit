import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useTemplates, keys, type Template } from "@/lib/data";
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
  const [strengthDays, setStrengthDays] = useState<number[]>([]);
  const [runDays, setRunDays] = useState<number[]>([]);
  const [minutes, setMinutes] = useState(60);
  const [avoid, setAvoid] = useState("");
  const [level, setLevel] = useState("Medel");
  const [goal, setGoal] = useState("");
  const [strengthPerWeek, setStrengthPerWeek] = useState(3);
  const [runsPerWeek, setRunsPerWeek] = useState(1);
  const [runAbility, setRunAbility] = useState("3–5 km");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.name);
      if (profile.data.equipment.length) setEquipment(profile.data.equipment);
      setMinutes(profile.data.session_minutes);
      setAvoid(profile.data.avoid_movements);
      setLevel(profile.data.level);
      setGoal(profile.data.goal);
      setStrengthPerWeek(profile.data.strength_per_week);
      setRunsPerWeek(profile.data.runs_per_week);
      setRunAbility(profile.data.run_ability);
    }
  }, [profile.data]);
  // Start from the days already set on the program's templates.
  useEffect(() => {
    if (!templates.data) return;
    const daysOf = (kind: string) =>
      templates.data
        .filter((t) => t.kind === kind && t.day_of_week !== null)
        .map((t) => t.day_of_week!);
    setStrengthDays(daysOf("strength"));
    setRunDays(daysOf("run"));
  }, [templates.data]);

  if (!profile.data || !templates.data)
    return (
      <div className="pt-10">
        <LoadingBlock />
      </div>
    );
  const p = profile.data;
  const strengthTemplates = templates.data.filter((t) => t.kind === "strength");
  const runTemplates = templates.data.filter((t) => t.kind === "run");
  const strengthSlots = slotTemplates(strengthTemplates, strengthPerWeek);
  const runSlots = slotTemplates(runTemplates, runsPerWeek);
  // One day per chosen session: earlier picks are kept, new sessions get sensible defaults.
  const sDays = fitDays(strengthDays, strengthPerWeek, STRENGTH_DEFAULTS[strengthPerWeek] ?? []);
  const rDays = fitDays(runDays, runsPerWeek, RUN_DEFAULTS);

  async function finish() {
    setSaving(true);
    try {
      await saveSchedule(strengthTemplates, strengthSlots, sDays);
      await saveSchedule(runTemplates, runSlots, rDays);
      const r = await supabase
        .from("profiles")
        .update({
          name,
          level,
          goal,
          strength_per_week: strengthPerWeek,
          runs_per_week: runsPerWeek,
          run_ability: runAbility,
          equipment,
          session_minutes: minutes,
          avoid_movements: avoid,
          training_days: [...new Set([...sDays, ...rDays])],
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
      <h1 className="text-4xl font-extrabold">Hej {name || "där"}! 👋</h1>
      <p className="mt-3 text-muted-foreground">
        Berätta lite om dig så anpassar vi appen. Allt går att ändra senare under Profil.
      </p>
      <div className="mt-6 space-y-6 card-surface p-5">
        <Field label="Namn">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
            className="h-11"
          />
        </Field>
        <Field label="Träningsnivå">
          <Chips options={LEVELS} value={level} onChange={setLevel} />
        </Field>
        <Field label="Huvudmål">
          <Chips options={GOALS} value={goal} onChange={setGoal} />
          <Input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Eller skriv ditt eget mål"
            className="mt-2 h-11"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Styrkepass / vecka">
            <Stepper value={strengthPerWeek} onChange={setStrengthPerWeek} />
          </Field>
          <Field label="Löppass / vecka">
            <Stepper value={runsPerWeek} onChange={setRunsPerWeek} />
          </Field>
        </div>
        <Field label="Löpvana">
          <Chips options={RUN_ABILITIES} value={runAbility} onChange={setRunAbility} />
        </Field>
      </div>
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
      <p className="mt-2 text-muted-foreground">
        {strengthPerWeek + runsPerWeek > 0
          ? `Du valde ${strengthPerWeek} styrkepass och ${runsPerWeek} löppass i veckan. Välj vilken dag varje pass ska ligga.`
          : "Du valde inga fasta pass. Du kan alltid köra ett pass när du vill under Träning."}
      </p>
      <div className="mt-6 space-y-3">
        {strengthSlots.map((t, i) => (
          <DayPicker
            key={`s${i}`}
            title={`Styrkepass ${i + 1}`}
            subtitle={t ? `${t.name} · ${t.subtitle}` : ""}
            value={sDays[i]}
            onChange={(d) => setStrengthDays(sDays.map((x, j) => (j === i ? d : x)))}
          />
        ))}
        {runSlots.map((t, i) => (
          <DayPicker
            key={`r${i}`}
            title={runsPerWeek > 1 ? `Löppass ${i + 1}` : "Löppass"}
            subtitle={t ? `${t.name} · ${t.subtitle}` : ""}
            value={rDays[i]}
            onChange={(d) => setRunDays(rDays.map((x, j) => (j === i ? d : x)))}
          />
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

const LEVELS = ["Nybörjare", "Medel", "Avancerad"];
const GOALS = [
  "Muskeltillväxt och kroppssammansättning",
  "Bli starkare",
  "Gå ner i vikt",
  "Bättre kondition",
  "Må bra och hålla igång",
];
const RUN_ABILITIES = ["Springer inte", "Under 3 km", "3–5 km", "5–10 km", "Över 10 km"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      {children}
    </div>
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "min-h-11 rounded-full border px-4 text-sm font-semibold",
            value === o ? "border-primary bg-primary text-primary-foreground" : "bg-card",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-card p-1">
      <button
        type="button"
        aria-label="Minska"
        disabled={value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="h-10 w-10 rounded-xl text-xl font-bold disabled:opacity-30"
      >
        −
      </button>
      <span className="text-lg font-bold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Öka"
        disabled={value >= 7}
        onClick={() => onChange(Math.min(7, value + 1))}
        className="h-10 w-10 rounded-xl text-xl font-bold disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

/** Default days per number of strength sessions (JS day index, 0 = Sunday). */
const STRENGTH_DEFAULTS: Record<number, number[]> = {
  1: [3],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 0],
};
const RUN_DEFAULTS = [0, 3, 6, 2, 5, 1, 4];

function fitDays(cur: number[], n: number, defaults: number[]) {
  const out = cur.slice(0, n);
  for (const d of [...defaults, ...WEEK_ORDER]) {
    if (out.length >= n) break;
    if (!out.includes(d)) out.push(d);
  }
  while (out.length < n) out.push(WEEK_ORDER[out.length % 7] ?? 1);
  return out;
}

/**
 * Which template each chosen session uses. One session → the full-body workout (last in the
 * program); otherwise the templates in program order, repeating from the start when more
 * sessions than templates are chosen.
 */
function slotTemplates(list: Template[], n: number): (Template | undefined)[] {
  if (n <= 0 || list.length === 0) return Array.from({ length: Math.max(0, n) }, () => undefined);
  if (n === 1 && list.length > 1) return [list[list.length - 1]];
  return Array.from({ length: n }, (_, i) => list[i % list.length]);
}

/** Schedule the chosen templates, unschedule the rest, and add copies for repeated sessions. */
async function saveSchedule(list: Template[], slots: (Template | undefined)[], days: number[]) {
  const used = new Set<string>();
  for (let i = 0; i < slots.length; i++) {
    const t = slots[i];
    if (!t) continue;
    if (!used.has(t.id)) {
      used.add(t.id);
      const r = await supabase
        .from("workout_templates")
        .update({ day_of_week: days[i] ?? null })
        .eq("id", t.id);
      if (r.error) throw r.error;
    } else {
      const copyNo = slots.slice(0, i + 1).filter((x) => x?.id === t.id).length;
      const r = await supabase.from("workout_templates").insert({
        user_id: t.user_id,
        name: `${t.name} ${copyNo}`,
        subtitle: t.subtitle,
        kind: t.kind,
        day_of_week: days[i] ?? null,
        warmup: t.warmup,
        duration: t.duration,
        items: t.items,
        sort: t.sort,
      });
      if (r.error) throw r.error;
    }
  }
  for (const t of list) {
    if (!used.has(t.id) && t.day_of_week !== null) {
      const r = await supabase
        .from("workout_templates")
        .update({ day_of_week: null })
        .eq("id", t.id);
      if (r.error) throw r.error;
    }
  }
}

function DayPicker({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: number | undefined;
  onChange: (d: number) => void;
}) {
  return (
    <div className="card-surface p-4">
      <p className="font-semibold">
        {title}
        {subtitle && <span className="font-normal text-muted-foreground"> · {subtitle}</span>}
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEK_ORDER.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={value === d}
            onClick={() => onChange(d)}
            className={cn(
              "min-h-11 rounded-xl text-xs font-bold",
              value === d ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            {DAY_SHORT[d]}
          </button>
        ))}
      </div>
    </div>
  );
}
