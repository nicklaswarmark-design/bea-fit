import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { checkMilestones, keys, useProfile, useRuns, useUserId, type Run } from "@/lib/data";
import {
  fmtDuration,
  fmtPace,
  fmtShort,
  isoDate,
  programWeek,
  runPlanForWeek,
} from "@/lib/program";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LoadingBlock } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/traning/lopning")({
  head: () => ({
    meta: [
      { title: "Run Club – BEACTIVE" },
      {
        name: "description",
        content: "Logga distans, tid, tempo och ansträngning för dina löppass.",
      },
      { property: "og:title", content: "Run Club – BEACTIVE" },
      {
        property: "og:description",
        content: "Logga distans, tid, tempo och ansträngning för dina löppass.",
      },
    ],
  }),
  component: RunPage,
});

const empty = {
  id: "",
  run_date: isoDate(new Date()),
  km: "",
  min: "",
  sec: "",
  effort: null as number | null,
  intervals: false,
  notes: "",
};

function RunPage() {
  const uid = useUserId();
  const runs = useRuns();
  const profile = useProfile();
  const qc = useQueryClient();
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const plan = profile.data ? runPlanForWeek(programWeek(profile.data.program_start)) : null;

  const km = Number(f.km.replace(",", "."));
  const secs = Number(f.min || 0) * 60 + Number(f.sec || 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!(km > 0) || !(secs > 0)) {
      toast.error("Fyll i distans och tid");
      return;
    }
    setBusy(true);
    const row = {
      user_id: uid,
      run_date: f.run_date,
      distance_km: km,
      duration_seconds: secs,
      effort: f.effort,
      intervals: f.intervals,
      notes: f.notes,
    };
    const r = f.id
      ? await supabase.from("running_sessions").update(row).eq("id", f.id)
      : await supabase.from("running_sessions").insert(row);
    if (r.error) {
      setBusy(false);
      toast.error(r.error.message);
      return;
    }
    await checkMilestones(uid, false, km >= 5);
    await qc.invalidateQueries();
    setBusy(false);
    toast.success(
      f.id
        ? "Löppasset är uppdaterat"
        : km >= 5
          ? "5 km! Run Club-legend! 🏃‍♀️"
          : "Löppass sparat – snyggt, Bea!",
    );
    setF(empty);
  }

  function edit(r: Run) {
    const s = r.duration_seconds;
    setF({
      id: r.id,
      run_date: r.run_date,
      km: String(r.distance_km),
      min: String(Math.floor(s / 60)),
      sec: String(s % 60),
      effort: r.effort,
      intervals: r.intervals,
      notes: r.notes,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function remove(id: string) {
    if (!confirm("Radera löppasset?")) return;
    await supabase.from("running_sessions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: keys.runs });
  }

  return (
    <div className="space-y-5 px-5 pt-6 safe-top md:px-8">
      <Link
        to="/traning"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Träning
      </Link>
      <h1 className="text-3xl font-bold">Run Club</h1>
      {plan && (
        <div className="rounded-3xl bg-gradient-sage p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-primary/70">
            Veckans förslag
          </p>
          <p className="font-display text-xl font-bold">{plan.title}</p>
          <p className="text-sm">
            {plan.detail} Anpassa fritt – löpningen ska komplettera styrkan, inte stjäla
            återhämtning.
          </p>
        </div>
      )}
      <form onSubmit={save} className="space-y-4 card-surface p-5">
        <h2 className="text-lg font-bold">{f.id ? "Redigera löppass" : "Logga löppass"}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="d">Datum</Label>
            <Input
              id="d"
              type="date"
              value={f.run_date}
              onChange={(e) => setF({ ...f, run_date: e.target.value })}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="km">Distans (km)</Label>
            <Input
              id="km"
              inputMode="decimal"
              placeholder="4,5"
              value={f.km}
              onChange={(e) => setF({ ...f, km: e.target.value })}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="min">Minuter</Label>
            <Input
              id="min"
              inputMode="numeric"
              type="number"
              min={0}
              value={f.min}
              onChange={(e) => setF({ ...f, min: e.target.value })}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sec">Sekunder</Label>
            <Input
              id="sec"
              inputMode="numeric"
              type="number"
              min={0}
              max={59}
              value={f.sec}
              onChange={(e) => setF({ ...f, sec: e.target.value })}
              className="h-11"
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Snittempo:{" "}
          <b className="text-foreground">{km > 0 && secs > 0 ? fmtPace(secs / km) : "–"}</b>
        </p>
        <div>
          <Label>Upplevd ansträngning (valfritt)</Label>
          <div className="mt-2 grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setF({ ...f, effort: f.effort === n ? null : n })}
                className={cn(
                  "min-h-11 rounded-lg text-sm font-bold",
                  f.effort === n ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center justify-between text-sm font-medium">
          Inkluderade snabbare intervaller
          <Switch checked={f.intervals} onCheckedChange={(v) => setF({ ...f, intervals: v })} />
        </label>
        <Textarea
          placeholder="Hur kändes det?"
          value={f.notes}
          onChange={(e) => setF({ ...f, notes: e.target.value })}
        />
        <div className="flex gap-2">
          {f.id && (
            <Button type="button" variant="outline" onClick={() => setF(empty)}>
              Avbryt
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={busy}>
            {busy ? "Sparar…" : "Spara löppass"}
          </Button>
        </div>
      </form>

      <section>
        <h2 className="mb-3 text-xl font-bold">Historik</h2>
        {runs.isLoading ? (
          <LoadingBlock />
        ) : (runs.data ?? []).length === 0 ? (
          <p className="rounded-3xl bg-muted p-5 text-sm text-muted-foreground">
            Inga löppass ännu. Ditt första Run Club-pass hamnar här.
          </p>
        ) : (
          <ul className="space-y-2">
            {runs.data!.map((r) => (
              <li key={r.id} className="flex items-center gap-3 card-surface p-4">
                <div className="flex-1">
                  <p className="font-semibold">
                    {Number(r.distance_km)} km · {fmtDuration(r.duration_seconds)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtShort(r.run_date)} · {fmtPace(r.duration_seconds / Number(r.distance_km))}
                    {r.effort ? ` · RPE ${r.effort}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label="Redigera" onClick={() => edit(r)}>
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Radera"
                  onClick={() => remove(r.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
