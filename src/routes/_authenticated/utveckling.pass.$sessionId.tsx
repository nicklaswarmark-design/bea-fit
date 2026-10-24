import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useExerciseMap, type SetRow } from "@/lib/data";
import { fmtDay, fmtDuration } from "@/lib/program";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/DecimalInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBlock, LoadingBlock } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/utveckling/pass/$sessionId")({
  head: () => ({
    meta: [
      { title: "Passdetaljer – BEACTIVE" },
      { name: "description", content: "Visa och redigera ett sparat pass." },
      { property: "og:title", content: "Passdetaljer – BEACTIVE" },
      { property: "og:description", content: "Visa och redigera ett sparat pass." },
    ],
  }),
  component: HistoryEdit,
});

function HistoryEdit() {
  const { sessionId } = Route.useParams();
  const ex = useExerciseMap();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["history", sessionId],
    queryFn: async () => {
      const [s, sets] = await Promise.all([
        supabase.from("workout_sessions").select("*").eq("id", sessionId).single(),
        supabase
          .from("exercise_sets")
          .select("*")
          .eq("session_id", sessionId)
          .order("exercise_order")
          .order("set_index"),
      ]);
      if (s.error) throw s.error;
      if (sets.error) throw sets.error;
      return { s: s.data, sets: sets.data };
    },
  });
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [effort, setEffort] = useState<string>("");
  const [minutes, setMinutes] = useState("");
  const [rows, setRows] = useState<SetRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!q.data) return;
    setName(q.data.s.name);
    setNotes(q.data.s.notes);
    setEffort(q.data.s.effort ? String(q.data.s.effort) : "");
    setMinutes(String(Math.round(q.data.s.duration_seconds / 60)));
    setRows(q.data.sets);
  }, [q.data]);

  if (q.error)
    return (
      <div className="pt-10">
        <ErrorBlock error={q.error} />
      </div>
    );
  if (!q.data)
    return (
      <div className="pt-10">
        <LoadingBlock />
      </div>
    );

  const groups = rows.reduce<Record<string, SetRow[]>>((a, r) => {
    const k = `${r.exercise_order}-${r.exercise_id}`;
    (a[k] ||= []).push(r);
    return a;
  }, {});
  const setRow = (id: string, patch: Partial<SetRow>) =>
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function save() {
    setBusy(true);
    try {
      const r = await supabase
        .from("workout_sessions")
        .update({
          name,
          notes,
          effort: effort ? Number(effort) : null,
          duration_seconds: Number(minutes || 0) * 60,
        })
        .eq("id", sessionId);
      if (r.error) throw r.error;
      for (const row of rows) {
        const orig = q.data!.sets.find((s) => s.id === row.id);
        if (
          orig &&
          (orig.weight !== row.weight || orig.reps !== row.reps || orig.completed !== row.completed)
        ) {
          const u = await supabase
            .from("exercise_sets")
            .update({ weight: row.weight, reps: row.reps, completed: row.completed })
            .eq("id", row.id);
          if (u.error) throw u.error;
        }
      }
      await qc.invalidateQueries();
      toast.success("Passet är uppdaterat");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte spara");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!confirm("Radera passet permanent?")) return;
    await supabase.from("workout_sessions").delete().eq("id", sessionId);
    await qc.invalidateQueries();
    navigate({ to: "/utveckling" });
  }

  return (
    <div className="space-y-5 px-5 pt-6 safe-top md:px-8">
      <Link
        to="/utveckling"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Utveckling
      </Link>
      <div>
        <p className="text-sm font-semibold capitalize text-muted-foreground">
          {fmtDay(q.data.s.started_at)} · {fmtDuration(q.data.s.duration_seconds)}
        </p>
        <h1 className="text-3xl font-bold">{q.data.s.name}</h1>
      </div>
      <div className="grid gap-3 card-surface p-5 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Namn</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label>Tid (min)</Label>
          <Input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Ansträngning (1–10)</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={effort}
            onChange={(e) => setEffort(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-3">
          <Label>Anteckningar</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {Object.entries(groups).length === 0 && (
        <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
          Inga set sparade för passet.
        </p>
      )}
      {Object.entries(groups).map(([k, sets]) => (
        <section key={k} className="card-surface p-4">
          <h2 className="font-display text-lg font-bold">{ex.name(sets[0]!.exercise_id)}</h2>
          <div className="mt-2 space-y-2">
            {sets.map((s, i) => (
              <div key={s.id} className="grid grid-cols-[2rem_1fr_1fr_auto] items-center gap-2">
                <span className="font-bold">{i + 1}</span>
                <DecimalInput
                  placeholder="kg"
                  aria-label="Vikt"
                  value={Number(s.weight)}
                  onValueChange={(n) => setRow(s.id, { weight: n })}
                  className="h-11"
                />
                <DecimalInput
                  integer
                  placeholder="reps"
                  aria-label="Reps"
                  value={s.reps}
                  onValueChange={(n) => setRow(s.id, { reps: n })}
                  className="h-11"
                />
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={s.completed}
                    onChange={(e) => setRow(s.id, { completed: e.target.checked })}
                  />
                  Klar
                </label>
              </div>
            ))}
          </div>
        </section>
      ))}
      <div className="flex gap-3 pb-6">
        <Button variant="outline" onClick={remove}>
          <Trash2 /> Radera
        </Button>
        <Button className="flex-1" disabled={busy} onClick={save}>
          {busy ? "Sparar…" : "Spara ändringar"}
        </Button>
      </div>
    </div>
  );
}
