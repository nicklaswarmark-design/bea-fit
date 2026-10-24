import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Calendar, Trophy, Zap, Play, ArrowRight, Footprints, Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildWeek,
  keys,
  useExerciseMap,
  useMilestones,
  usePRs,
  useProfile,
  useRuns,
  useSchedule,
  useSessions,
  useTemplates,
  weekStreak,
  type PR,
} from "@/lib/data";
import {
  dailyMessage,
  fmtDay,
  greeting,
  isoDate,
  MILESTONES,
  programWeek,
  runPlanForWeek,
  weekStart,
} from "@/lib/program";
import { useStartWorkout } from "@/lib/useStart";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorBlock, LoadingBlock } from "@/components/AppShell";
import { addDays, startOfDay, differenceInCalendarDays, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/hem")({
  head: () => ({
    meta: [
      { title: "Hem – BEACTIVE" },
      { name: "description", content: "Din översikt: nästa pass, veckans framsteg och streak." },
      { property: "og:title", content: "Hem – BEACTIVE" },
      {
        property: "og:description",
        content: "Din översikt: nästa pass, veckans framsteg och streak.",
      },
    ],
  }),
  component: Hem,
});

function Hem() {
  const profile = useProfile();
  const templates = useTemplates();
  const sessions = useSessions();
  const runs = useRuns();
  const schedule = useSchedule();
  const prs = usePRs();
  const milestones = useMilestones();
  const ex = useExerciseMap();
  const qc = useQueryClient();
  const { start, busy, active } = useStartWorkout();

  const qs = [profile, templates, sessions, runs, schedule];
  const err = qs.find((q) => q.error)?.error;
  if (err)
    return (
      <div className="pt-10">
        <ErrorBlock error={err} onRetry={() => qs.forEach((q) => q.refetch())} />
      </div>
    );
  if (qs.some((q) => !q.data))
    return (
      <div className="pt-10">
        <LoadingBlock />
      </div>
    );

  const p = profile.data!;
  const week = buildWeek(
    weekStart(new Date()),
    templates.data!,
    schedule.data!,
    sessions.data!,
    runs.data!,
  );
  const planned = week.filter((w) => w.status !== "rest");
  const done = week.filter((w) => w.status === "done").length;
  const today = startOfDay(new Date());
  const next =
    week.find((w) => w.status === "planned" && w.date >= today) ??
    buildWeek(
      weekStart(addDays(new Date(), 7)),
      templates.data!,
      schedule.data!,
      sessions.data!,
      runs.data!,
    ).find((w) => w.status === "planned");
  const isToday = next && isoDate(next.date) === isoDate(new Date());
  const streak = weekStreak(sessions.data!, runs.data!);
  const express = templates.data!.find((t) => t.kind === "express");
  const pw = programWeek(p.program_start);
  const unseen = (milestones.data ?? []).find((m) => !m.seen);
  const bestPRs = Object.values(
    (prs.data ?? []).reduce<Record<string, PR>>((acc, r) => {
      if (!acc[r.exercise_id] || Number(r.est_1rm) > Number(acc[r.exercise_id]!.est_1rm))
        acc[r.exercise_id] = r;
      return acc;
    }, {}),
  ).slice(0, 3);

  async function markSeen(id: string) {
    await supabase.from("milestones").update({ seen: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: keys.milestones });
  }

  return (
    <div className="space-y-5 px-5 pt-8 safe-top md:px-8">
      <header>
        <p className="text-sm font-semibold text-muted-foreground">{greeting()}</p>
        <h1 className="text-4xl font-extrabold">
          {p.name}
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-2 font-display text-lg italic text-primary/80">“{dailyMessage()}”</p>
      </header>

      {active && (
        <Link
          to="/traning/pass/$sessionId"
          params={{ sessionId: active.id }}
          className="flex items-center justify-between rounded-3xl bg-accent p-4 text-accent-foreground shadow-soft"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Pågående pass</p>
            <p className="font-display text-lg font-bold">{active.name} – fortsätt där du var</p>
          </div>
          <ArrowRight />
        </Link>
      )}

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-forest p-6 text-primary-foreground shadow-lift">
        <p className="text-xs font-bold uppercase tracking-widest opacity-70">
          {next ? (isToday ? "Idag" : fmtDay(next.date)) : "Nästa pass"}
        </p>
        {next ? (
          <>
            <h2 className="mt-1 text-3xl font-bold">{next.template.name}</h2>
            <p className="opacity-80">
              {next.template.kind === "run" ? runPlanForWeek(pw).title : next.template.subtitle} ·{" "}
              {next.template.duration}
            </p>
            <Button
              variant="hero"
              size="lg"
              className="mt-5"
              disabled={busy}
              onClick={() => start(next.template)}
            >
              {next.template.kind === "run" ? <Footprints /> : <Play />}{" "}
              {next.template.kind === "run" ? "Logga löpning" : "Starta pass"}
            </Button>
          </>
        ) : (
          <p className="mt-2 text-lg">Inga fler pass planerade. Even beasts need rest. 🌿</p>
        )}
        <Leaf className="absolute -right-6 -bottom-6 size-36 opacity-10" />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Calendar} label="Denna vecka" value={`${done}/${planned.length}`}>
          <div className="mt-3 flex gap-1">
            {planned.map((w) => (
              <div
                key={w.template.id}
                className={
                  w.status === "done"
                    ? "h-2 flex-1 rounded-full bg-primary"
                    : "h-2 flex-1 rounded-full bg-muted"
                }
              />
            ))}
          </div>
        </Stat>
        <Stat icon={Flame} label="Aktiva veckor i rad" value={String(streak)}>
          <p className="mt-2 text-xs text-muted-foreground">
            {streak ? "Snyggt jobbat!" : "Första passet startar din streak."}
          </p>
        </Stat>
      </div>

      <NextGoal />

      {express && (
        <button
          onClick={() => start(express)}
          disabled={busy}
          className="flex w-full items-center gap-4 card-surface p-4 text-left"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-terracotta-soft text-accent">
            <Zap />
          </span>
          <span className="flex-1">
            <span className="block font-semibold">Ont om tid? Express-pass</span>
            <span className="text-sm text-muted-foreground">20 minuter helkropp – det räknas!</span>
          </span>
          <ArrowRight className="text-muted-foreground" />
        </button>
      )}

      <section className="card-surface p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Trophy className="size-5 text-accent" /> Personbästa
          </h3>
          <Link to="/utveckling" className="text-sm font-semibold text-primary">
            Se alla
          </Link>
        </div>
        {bestPRs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Inga personbästa ännu – de dyker upp här när du loggat dina första pass.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {bestPRs.map((r) => (
              <li key={r.id} className="flex justify-between py-2.5 text-sm">
                <span className="font-semibold">{ex.name(r.exercise_id)}</span>
                <span>
                  {Number(r.weight)} kg × {r.reps}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!unseen} onOpenChange={(o) => !o && unseen && markSeen(unseen.id)}>
        <DialogContent className="rounded-3xl text-center">
          {unseen && (
            <DialogHeader className="items-center">
              <div className="text-6xl">{MILESTONES[unseen.key]?.emoji ?? "✨"}</div>
              <DialogTitle className="font-display text-3xl">
                {MILESTONES[unseen.key]?.title ?? "Milstolpe!"}
              </DialogTitle>
              <DialogDescription className="text-base">
                {MILESTONES[unseen.key]?.text}
              </DialogDescription>
              <Button className="mt-4 w-full" onClick={() => markSeen(unseen.id)}>
                Tack!
              </Button>
            </DialogHeader>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NextGoal() {
  const goals = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("*").order("target_date", { nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
  const g = (goals.data ?? []).find((x) => !x.achieved);
  if (goals.isLoading) return null;
  if (!g)
    return (
      <Link to="/mal" className="flex items-center gap-4 card-surface p-4">
        <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-2xl">🎯</span>
        <span className="flex-1">
          <span className="block font-semibold">Sätt ett mål</span>
          <span className="text-sm text-muted-foreground">Ett lopp, en ny rekordvikt eller en vana</span>
        </span>
        <ArrowRight className="text-muted-foreground" />
      </Link>
    );
  const d = g.target_date ? differenceInCalendarDays(parseISO(g.target_date), new Date()) : null;
  return (
    <Link to="/mal" className="flex items-center gap-4 card-surface p-4">
      <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-2xl">
        {g.kind === "race" ? "🏃‍♀️" : g.kind === "strength" ? "💪" : g.kind === "weight" ? "⚖️" : "🌿"}
      </span>
      <span className="flex-1">
        <span className="block text-xs font-semibold text-muted-foreground">Ditt mål</span>
        <span className="block font-semibold">{g.title || "Mitt mål"}</span>
        {d !== null && d >= 0 && (
          <span className="text-sm font-semibold text-accent">
            {d === 0 ? "Idag – lycka till!" : `${d} dagar kvar`}
          </span>
        )}
      </span>
      <ArrowRight className="text-muted-foreground" />
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="size-4 text-accent" />
        {label}
      </div>
      <div className="mt-1 font-display text-3xl font-bold">{value}</div>
      {children}
    </div>
  );
}
