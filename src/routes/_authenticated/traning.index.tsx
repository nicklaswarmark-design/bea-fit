import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Library,
  Moon,
  Pencil,
  Play,
  Undo2,
  Zap,
} from "lucide-react";
import { addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  buildWeek,
  keys,
  useProfile,
  useRuns,
  useSchedule,
  useSessions,
  useTemplates,
  useUserId,
  type WeekEntry,
} from "@/lib/data";
import {
  DAY_SHORT,
  fmtDay,
  fmtShort,
  isoDate,
  programWeek,
  runPlanForWeek,
  weekStart,
} from "@/lib/program";
import { useStartWorkout } from "@/lib/useStart";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ErrorBlock, LoadingBlock, PageHeader } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/traning/")({
  head: () => ({
    meta: [
      { title: "Träning – BEACTIVE" },
      { name: "description", content: "Veckans träningsschema, passmallar och övningsbibliotek." },
      { property: "og:title", content: "Träning – BEACTIVE" },
      {
        property: "og:description",
        content: "Veckans träningsschema, passmallar och övningsbibliotek.",
      },
    ],
  }),
  component: Traning,
});

function Traning() {
  const uid = useUserId();
  const profile = useProfile();
  const templates = useTemplates();
  const sessions = useSessions();
  const runs = useRuns();
  const schedule = useSchedule();
  const qc = useQueryClient();
  const { start, busy } = useStartWorkout();
  const [offset, setOffset] = useState(0);
  const [reduced, setReduced] = useState(false);

  async function addHome() {
    if (!uid) return;
    const { error } = await supabase.from("workout_templates").insert({
      user_id: uid,
      name: "Hemmapass",
      subtitle: "Hemma utan redskap",
      kind: "strength",
      day_of_week: null,
      warmup: "5 min marschera på stället + höftcirklar",
      duration: "30–40 min",
      sort: 10,
      items: [
        { exercise_id: "bw_squat", sets: 3, rep_min: 12, rep_max: 20 },
        { exercise_id: "bw_couch_hip_thrust", sets: 3, rep_min: 12, rep_max: 20 },
        { exercise_id: "bw_reverse_lunge", sets: 3, rep_min: 10, rep_max: 12, per_side: true },
        { exercise_id: "bw_knee_pushup", sets: 3, rep_min: 8, rep_max: 15 },
        { exercise_id: "bw_table_row", sets: 3, rep_min: 8, rep_max: 12 },
        { exercise_id: "bw_side_lying_abduction", sets: 2, rep_min: 15, rep_max: 20, per_side: true },
        { exercise_id: "bw_dead_bug", sets: 3, rep_min: 8, rep_max: 10, per_side: true },
      ],
    });
    if (error) { toast.error("Kunde inte lägga till hemmapasset"); return; }
    toast.success("Hemmapasset är tillagt!");
    qc.invalidateQueries({ queryKey: keys.templates });
  }

  const qs = [profile, templates, sessions, runs, schedule];
  const err = qs.find((q) => q.error)?.error;
  if (err)
    return (
      <div className="pt-10">
        <ErrorBlock error={err} />
      </div>
    );
  if (qs.some((q) => !q.data))
    return (
      <div className="pt-10">
        <LoadingBlock />
      </div>
    );

  const ws = weekStart(addDays(new Date(), offset * 7));
  const week = buildWeek(ws, templates.data!, schedule.data!, sessions.data!, runs.data!);
  const pw = programWeek(profile.data!.program_start, ws);

  async function override(e: WeekEntry, patch: { planned_date?: string; status?: string } | null) {
    try {
      if (patch === null) {
        if (e.override) await supabase.from("scheduled_sessions").delete().eq("id", e.override.id);
      } else if (e.override) {
        const r = await supabase.from("scheduled_sessions").update(patch).eq("id", e.override.id);
        if (r.error) throw r.error;
      } else {
        const r = await supabase.from("scheduled_sessions").insert({
          user_id: uid,
          template_id: e.template.id,
          original_date: isoDate(e.originalDate),
          planned_date: patch.planned_date ?? isoDate(e.originalDate),
          status: patch.status ?? "moved",
        });
        if (r.error) throw r.error;
      }
      qc.invalidateQueries({ queryKey: keys.schedule });
    } catch (er) {
      toast.error(er instanceof Error ? er.message : "Kunde inte uppdatera");
    }
  }

  return (
    <div>
      <PageHeader title="Träning" subtitle={`Programvecka ${pw}`} />
      <div className="space-y-5 px-5 md:px-8">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Föregående vecka"
            onClick={() => setOffset(offset - 1)}
          >
            <ChevronLeft />
          </Button>
          <p className="font-semibold">
            {offset === 0 ? "Denna vecka" : `Vecka från ${fmtShort(ws)}`}
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Nästa vecka"
            onClick={() => setOffset(offset + 1)}
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="space-y-3">
          {week.map((e) => (
            <div
              key={e.template.id}
              className={cn("card-surface p-4", e.status === "rest" && "opacity-70")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-2xl text-xs font-bold",
                    e.status === "done"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {e.status === "done" ? <Check /> : DAY_SHORT[e.date.getDay()]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground capitalize">
                    {fmtDay(e.date)}
                    {e.override?.status === "moved" && " · flyttat"}
                  </p>
                  <p className="font-display text-xl font-bold">{e.template.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {e.status === "rest"
                      ? "Återhämtningsdag – even beasts need rest."
                      : e.template.kind === "run"
                        ? runPlanForWeek(pw).title
                        : `${e.template.subtitle} · ${e.template.duration}`}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {e.status === "planned" && (
                  <Button size="sm" disabled={busy} onClick={() => start(e.template, reduced)}>
                    {e.template.kind === "run" ? <Footprints /> : <Play />}{" "}
                    {e.template.kind === "run" ? "Logga" : "Starta"}
                  </Button>
                )}
                {e.status !== "done" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline">
                        Flytta
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 rounded-2xl">
                      <p className="mb-2 text-sm font-semibold">Flytta till</p>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map((d) => (
                          <button
                            key={d.toISOString()}
                            onClick={() =>
                              override(e, { planned_date: isoDate(d), status: "moved" })
                            }
                            className={cn(
                              "min-h-11 rounded-xl text-xs font-bold",
                              isoDate(d) === isoDate(e.date)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted",
                            )}
                          >
                            {DAY_SHORT[d.getDay()]}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {e.status === "planned" && (
                  <Button size="sm" variant="ghost" onClick={() => override(e, { status: "rest" })}>
                    <Moon /> Vilodag
                  </Button>
                )}
                {e.override && e.status !== "done" && (
                  <Button size="sm" variant="ghost" onClick={() => override(e, null)}>
                    <Undo2 /> Återställ
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <label className="flex items-center justify-between gap-4 card-surface p-4">
          <span>
            <span className="block font-semibold">Lättare vecka</span>
            <span className="text-sm text-muted-foreground">
              Ett set färre per övning när återhämtningen behöver extra kärlek.
            </span>
          </span>
          <Switch checked={reduced} onCheckedChange={setReduced} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/traning/bibliotek"
            className="card-surface flex min-h-24 flex-col justify-between p-4"
          >
            <Library className="text-accent" />
            <span className="font-semibold">Övningsbibliotek</span>
          </Link>
          <Link
            to="/traning/lopning"
            className="card-surface flex min-h-24 flex-col justify-between p-4"
          >
            <Footprints className="text-accent" />
            <span className="font-semibold">Run Club-logg</span>
          </Link>
        </div>

        <section>
          <h2 className="mb-3 text-xl font-bold">Dina passmallar</h2>
          <div className="space-y-2">
            {templates.data!.map((t) => (
              <div key={t.id} className="flex items-center gap-3 card-surface p-3 pl-4">
                {t.kind === "express" ? (
                  <Zap className="size-5 text-accent" />
                ) : t.kind === "run" ? (
                  <Footprints className="size-5 text-accent" />
                ) : (
                  <Play className="size-5 text-accent" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.day_of_week !== null ? DAY_SHORT[t.day_of_week] + " · " : ""}
                    {t.kind === "run" ? "Löpning" : `${t.items.length} övningar`}
                  </p>
                </div>
                {t.kind !== "run" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => start(t, reduced)}
                    aria-label={`Starta ${t.name}`}
                  >
                    <Play />
                  </Button>
                )}
                <Button asChild size="sm" variant="outline" aria-label={`Redigera ${t.name}`}>
                  <Link to="/traning/mall/$templateId" params={{ templateId: t.id }}>
                    <Pencil />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
          {!templates.data!.some((t) => t.subtitle === "Hemma utan redskap") && (
            <Button variant="outline" className="mt-3 w-full" onClick={addHome}>
              🏠 Lägg till hemmapass (bara kroppsvikt)
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}
