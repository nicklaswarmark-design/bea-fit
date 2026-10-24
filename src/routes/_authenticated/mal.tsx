import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Plus, Trash2, Check, Pencil } from "lucide-react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useExerciseMap, usePRs } from "@/lib/data";
import { fmtDay } from "@/lib/program";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DecimalInput } from "@/components/DecimalInput";
import { ErrorBlock, LoadingBlock } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export type Goal = Tables<"goals">;

export const KIND_LABEL: Record<string, { label: string; emoji: string }> = {
  race: { label: "Lopp", emoji: "🏃‍♀️" },
  strength: { label: "Styrkemål", emoji: "💪" },
  weight: { label: "Viktmål", emoji: "⚖️" },
  habit: { label: "Vanemål", emoji: "🌿" },
};

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("achieved")
        .order("target_date", { nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
}

export function daysLeft(g: Goal) {
  return g.target_date ? differenceInCalendarDays(parseISO(g.target_date), new Date()) : null;
}

export const Route = createFileRoute("/_authenticated/mal")({
  head: () => ({
    meta: [
      { title: "Mina mål – BEACTIVE" },
      { name: "description", content: "Sätt lopp, styrkemål, viktmål och vanemål." },
      { property: "og:title", content: "Mina mål – BEACTIVE" },
      { property: "og:description", content: "Sätt lopp, styrkemål, viktmål och vanemål." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GoalsPage,
});

const empty = (kind: string): Partial<Goal> => ({
  kind,
  title: "",
  target_date: null,
  distance_km: kind === "race" ? 5 : null,
  target_time_seconds: null,
  exercise_id: null,
  target_value: null,
  start_value: null,
  notes: "",
});

function GoalsPage() {
  const goals = useGoals();
  const prs = usePRs();
  const ex = useExerciseMap();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Goal> | null>(null);

  const bestFor = (id: string | null) =>
    id
      ? Math.max(0, ...(prs.data ?? []).filter((p) => p.exercise_id === id).map((p) => Number(p.weight)))
      : 0;

  const refresh = () => qc.invalidateQueries({ queryKey: ["goals"] });

  async function toggle(g: Goal) {
    const { error } = await supabase.from("goals").update({ achieved: !g.achieved }).eq("id", g.id);
    if (error) { toast.error("Kunde inte spara"); return; }
    if (!g.achieved) toast.success("Mål uppnått – grymt jobbat, Bea! 🎉");
    refresh();
  }
  async function remove(g: Goal) {
    if (!confirm("Ta bort målet?")) return;
    await supabase.from("goals").delete().eq("id", g.id);
    refresh();
  }

  return (
    <div className="space-y-5 px-5 pt-6 safe-top md:px-8">
      <Link to="/profil" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
        <ChevronLeft className="size-4" /> Profil
      </Link>
      <h1 className="text-3xl font-bold">Mina mål</h1>
      <p className="text-sm text-muted-foreground">
        Sätt något att se fram emot. Alla mål är frivilliga och går att ändra när som helst.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(KIND_LABEL).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setEdit(empty(k))}
            className="flex min-h-16 items-center gap-2 card-surface p-3 text-left font-semibold"
          >
            <span className="text-2xl">{v.emoji}</span>
            <span className="flex-1">{v.label}</span>
            <Plus className="size-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {goals.error ? (
        <ErrorBlock error={goals.error} />
      ) : goals.isLoading ? (
        <LoadingBlock />
      ) : goals.data!.length === 0 ? (
        <p className="rounded-3xl bg-muted p-5 text-sm text-muted-foreground">
          Inga mål ännu. Kanske ett lopp i vår, eller en ny hip thrust-rekordvikt?
        </p>
      ) : (
        <ul className="space-y-3">
          {goals.data!.map((g) => {
            const d = daysLeft(g);
            const best = g.kind === "strength" ? bestFor(g.exercise_id) : 0;
            const pct =
              g.kind === "strength" && g.target_value
                ? Math.min(100, (best / Number(g.target_value)) * 100)
                : null;
            return (
              <li key={g.id} className={cn("card-surface p-4", g.achieved && "opacity-70")}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{KIND_LABEL[g.kind]?.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{g.title || KIND_LABEL[g.kind]?.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {describe(g, ex.name)}
                      {g.target_date && ` · ${fmtDay(parseISO(g.target_date))}`}
                    </p>
                    {d !== null && !g.achieved && (
                      <p className="mt-1 text-sm font-semibold text-accent">
                        {d > 0 ? `${d} dagar kvar` : d === 0 ? "Idag!" : "Datumet har passerat"}
                      </p>
                    )}
                    {pct !== null && (
                      <div className="mt-2">
                        <div className="h-2 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Bästa hittills: {best ? `${String(best).replace(".", ",")} kg` : "inget loggat ännu"}
                        </p>
                      </div>
                    )}
                    {g.notes && <p className="mt-1 text-sm">{g.notes}</p>}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant={g.achieved ? "outline" : "default"} onClick={() => toggle(g)}>
                    <Check /> {g.achieved ? "Uppnått" : "Markera uppnått"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEdit(g)} aria-label="Redigera">
                    <Pencil />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(g)} aria-label="Ta bort">
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <GoalDialog goal={edit} onClose={() => setEdit(null)} onSaved={refresh} />
    </div>
  );
}

export function describe(g: Goal, name: (id: string) => string) {
  const n = (v: number | null) => (v == null ? "" : String(Number(v)).replace(".", ","));
  switch (g.kind) {
    case "race": {
      const t = g.target_time_seconds;
      const time = t ? ` · mål ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}` : "";
      return `${n(g.distance_km)} km${time}`;
    }
    case "strength":
      return `${g.exercise_id ? name(g.exercise_id) : "Övning"} · ${n(g.target_value)} kg`;
    case "weight":
      return `${g.start_value ? `Från ${n(g.start_value)} kg → ` : ""}${n(g.target_value)} kg`;
    default:
      return `${n(g.target_value)} pass per vecka`;
  }
}

function GoalDialog({
  goal,
  onClose,
  onSaved,
}: {
  goal: Partial<Goal> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ex = useExerciseMap();
  const [f, setF] = useState<Partial<Goal>>({});
  const [key, setKey] = useState<unknown>(null);
  if (goal !== key) {
    setKey(goal);
    setF(goal ?? {});
  }
  const set = (p: Partial<Goal>) => setF((o) => ({ ...o, ...p }));
  const [busy, setBusy] = useState(false);
  const mins = f.target_time_seconds ? Math.floor(f.target_time_seconds / 60) : 0;
  const secs = f.target_time_seconds ? f.target_time_seconds % 60 : 0;

  async function save() {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const row = {
      kind: f.kind!,
      title: f.title ?? "",
      target_date: f.target_date || null,
      distance_km: f.distance_km || null,
      target_time_seconds: f.target_time_seconds || null,
      exercise_id: f.exercise_id || null,
      target_value: f.target_value || null,
      start_value: f.start_value || null,
      notes: f.notes ?? "",
    };
    const { error } = f.id
      ? await supabase.from("goals").update(row).eq("id", f.id)
      : await supabase.from("goals").insert({ ...row, user_id: u.user!.id });
    setBusy(false);
    if (error) { toast.error("Kunde inte spara målet"); return; }
    toast.success("Målet är sparat");
    onSaved();
    onClose();
  }

  return (
    <Dialog open={!!goal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {KIND_LABEL[f.kind ?? "race"]?.emoji} {KIND_LABEL[f.kind ?? "race"]?.label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Namn</Label>
            <Input
              value={f.title ?? ""}
              placeholder={f.kind === "race" ? "t.ex. Vårruset" : "Ge målet ett namn"}
              onChange={(e) => set({ title: e.target.value })}
            />
          </div>
          {f.kind === "race" && (
            <>
              <div>
                <Label>Distans (km)</Label>
                <DecimalInput value={Number(f.distance_km ?? 0)} onValueChange={(n) => set({ distance_km: n })} />
              </div>
              <div>
                <Label>Måltid (valfritt)</Label>
                <div className="flex gap-2">
                  <DecimalInput
                    integer
                    placeholder="min"
                    value={mins}
                    onValueChange={(n) => set({ target_time_seconds: n * 60 + secs })}
                  />
                  <DecimalInput
                    integer
                    placeholder="sek"
                    value={secs}
                    onValueChange={(n) => set({ target_time_seconds: mins * 60 + Math.min(59, n) })}
                  />
                </div>
              </div>
            </>
          )}
          {f.kind === "strength" && (
            <>
              <div>
                <Label>Övning</Label>
                <select
                  className="h-11 w-full rounded-md border bg-background px-3"
                  value={f.exercise_id ?? ""}
                  onChange={(e) => set({ exercise_id: e.target.value })}
                >
                  <option value="">Välj övning</option>
                  {(ex.data ?? [])
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, "sv"))
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label>Målvikt (kg)</Label>
                <DecimalInput value={Number(f.target_value ?? 0)} onValueChange={(n) => set({ target_value: n })} />
              </div>
            </>
          )}
          {f.kind === "weight" && (
            <>
              <p className="text-xs text-muted-foreground">
                Helt frivilligt. Kroppen förändras i sin egen takt – styrka och energi räknas lika mycket.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Nuvarande (kg)</Label>
                  <DecimalInput value={Number(f.start_value ?? 0)} onValueChange={(n) => set({ start_value: n })} />
                </div>
                <div>
                  <Label>Mål (kg)</Label>
                  <DecimalInput value={Number(f.target_value ?? 0)} onValueChange={(n) => set({ target_value: n })} />
                </div>
              </div>
            </>
          )}
          {f.kind === "habit" && (
            <div>
              <Label>Pass per vecka</Label>
              <DecimalInput integer value={Number(f.target_value ?? 0)} onValueChange={(n) => set({ target_value: n })} />
            </div>
          )}
          <div>
            <Label>{f.kind === "race" ? "Loppdatum" : "Måldatum (valfritt)"}</Label>
            <Input type="date" value={f.target_date ?? ""} onChange={(e) => set({ target_date: e.target.value })} />
          </div>
          <div>
            <Label>Anteckning</Label>
            <Textarea value={f.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
          </div>
          <Button className="w-full" disabled={busy} onClick={save}>
            Spara mål
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
