import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { addDays } from "date-fns";
import {
  dateForDow,
  epley,
  isoDate,
  weekStart,
  WEEK_ORDER,
  type LastSet,
  type TemplateItem,
} from "./program";

export type Profile = Tables<"profiles">;
export type Exercise = Tables<"exercises">;
export type Template = Omit<Tables<"workout_templates">, "items"> & { items: TemplateItem[] };
export type Session = Tables<"workout_sessions">;
export type SetRow = Tables<"exercise_sets">;
export type Run = Tables<"running_sessions">;
export type PR = Tables<"personal_records">;
export type Milestone = Tables<"milestones">;
export type Scheduled = Tables<"scheduled_sessions">;

export type PlayerSet = { weight: number; reps: number; done: boolean };
export type PlayerExercise = {
  exercise_id: string;
  rep_min: number;
  rep_max: number;
  per_side?: boolean | undefined;
  too_hard: boolean;
  sets: PlayerSet[];
};
export type PlayerState = {
  exercises: PlayerExercise[];
  current: number;
  elapsed: number;
  runningSince: number | null;
  rest: number;
};

const authRoute = getRouteApi("/_authenticated");
export const useUserId = () => authRoute.useRouteContext().userId as string;

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export const keys = {
  profile: ["profile"],
  exercises: ["exercises"],
  templates: ["templates"],
  sessions: ["sessions"],
  sets: ["sets"],
  runs: ["runs"],
  prs: ["prs"],
  milestones: ["milestones"],
  schedule: ["schedule"],
};

export function useProfile() {
  const uid = useUserId();
  return useQuery({
    queryKey: keys.profile,
    queryFn: async (): Promise<Profile> => {
      const p = must(await supabase.from("profiles").select("*").eq("id", uid).maybeSingle());
      if (p) return p;
      // Safety net if the signup trigger did not run.
      const ins = await supabase.from("profiles").insert({ id: uid }).select().single();
      if (ins.error) throw new Error(ins.error.message);
      return ins.data;
    },
  });
}

export function useExercises() {
  return useQuery({
    queryKey: keys.exercises,
    staleTime: Infinity,
    queryFn: async () => must(await supabase.from("exercises").select("*").order("name")),
  });
}
export function useExerciseMap() {
  const q = useExercises();
  const map = new Map<string, Exercise>((q.data ?? []).map((e) => [e.id, e]));
  return { ...q, map, name: (id: string) => map.get(id)?.name ?? id };
}

export function useTemplates() {
  return useQuery({
    queryKey: keys.templates,
    queryFn: async () =>
      must(
        await supabase.from("workout_templates").select("*").order("sort"),
      ) as unknown as Template[],
  });
}

export function useSessions() {
  return useQuery({
    queryKey: keys.sessions,
    queryFn: async () =>
      must(
        await supabase
          .from("workout_sessions")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(1000),
      ),
  });
}
export const isDone = (s: Session) => s.status === "completed" || s.status === "partial";

export function useSets() {
  return useQuery({
    queryKey: keys.sets,
    queryFn: async () =>
      must(
        await supabase
          .from("exercise_sets")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5000),
      ),
  });
}
export function useRuns() {
  return useQuery({
    queryKey: keys.runs,
    queryFn: async () =>
      must(
        await supabase.from("running_sessions").select("*").order("run_date", { ascending: false }),
      ),
  });
}
export function usePRs() {
  return useQuery({
    queryKey: keys.prs,
    queryFn: async () =>
      must(
        await supabase
          .from("personal_records")
          .select("*")
          .order("achieved_at", { ascending: false }),
      ),
  });
}
export function useMilestones() {
  return useQuery({
    queryKey: keys.milestones,
    queryFn: async () => must(await supabase.from("milestones").select("*").order("achieved_at")),
  });
}
export function useSchedule() {
  return useQuery({
    queryKey: keys.schedule,
    queryFn: async () => must(await supabase.from("scheduled_sessions").select("*")),
  });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

/** Last completed sets per exercise (from the most recent session containing it). */
export function lastSetsByExercise(sets: SetRow[], sessions: Session[], excludeSession?: string) {
  const done = new Set(sessions.filter(isDone).map((s) => s.id));
  const out = new Map<string, LastSet[]>();
  const sessionFor = new Map<string, string>();
  for (const s of sets) {
    if (!done.has(s.session_id) || s.session_id === excludeSession || !s.completed) continue;
    const sid = sessionFor.get(s.exercise_id);
    if (!sid) sessionFor.set(s.exercise_id, s.session_id);
    if ((sid ?? s.session_id) !== s.session_id) continue;
    const arr = out.get(s.exercise_id) ?? [];
    arr.push({ weight: Number(s.weight), reps: s.reps, too_hard: s.too_hard });
    out.set(s.exercise_id, arr);
  }
  return out;
}

export type WeekEntry = {
  template: Template;
  date: Date;
  originalDate: Date;
  status: "planned" | "rest" | "done";
  override?: Scheduled | undefined;
};

/** Build the week schedule from templates + overrides + completed activity. */
export function buildWeek(
  ws: Date,
  templates: Template[],
  overrides: Scheduled[],
  sessions: Session[],
  runs: Run[],
): WeekEntry[] {
  const we = addDays(ws, 7);
  const inWeek = (d: Date) => d >= ws && d < we;
  const doneIds = new Set(
    sessions.filter((s) => isDone(s) && inWeek(new Date(s.started_at))).map((s) => s.template_id),
  );
  const ranThisWeek = runs.some((r) => inWeek(new Date(r.run_date + "T12:00:00")));
  const entries: WeekEntry[] = [];
  for (const t of templates) {
    if (t.day_of_week === null || t.kind === "express") continue;
    const orig = dateForDow(ws, t.day_of_week);
    const ov = overrides.find((o) => o.template_id === t.id && o.original_date === isoDate(orig));
    const date = ov ? new Date(ov.planned_date + "T12:00:00") : orig;
    const done = t.kind === "run" ? ranThisWeek : doneIds.has(t.id);
    entries.push({
      template: t,
      date,
      originalDate: orig,
      status: done ? "done" : ov?.status === "rest" ? "rest" : "planned",
      override: ov,
    });
  }
  return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function weeklyActivity(sessions: Session[], runs: Run[]) {
  const set = new Map<string, number>();
  for (const s of sessions.filter(isDone)) {
    const k = isoDate(weekStart(new Date(s.started_at)));
    set.set(k, (set.get(k) ?? 0) + 1);
  }
  for (const r of runs) {
    const k = isoDate(weekStart(new Date(r.run_date + "T12:00:00")));
    set.set(k, (set.get(k) ?? 0) + 1);
  }
  return set;
}

/** Consecutive active weeks. The current week never breaks the streak. */
export function weekStreak(sessions: Session[], runs: Run[]) {
  const act = weeklyActivity(sessions, runs);
  let ws = weekStart(new Date());
  let streak = act.has(isoDate(ws)) ? 1 : 0;
  ws = addDays(ws, -7);
  while (act.has(isoDate(ws))) {
    streak++;
    ws = addDays(ws, -7);
  }
  return streak;
}

export function buildInitialState(
  template: Template,
  last: Map<string, LastSet[]>,
  reduced: boolean,
): PlayerState {
  return {
    current: 0,
    elapsed: 0,
    runningSince: Date.now(),
    rest: 90,
    exercises: template.items.map((it) => {
      const l = last.get(it.exercise_id);
      const n = reduced ? Math.max(1, it.sets - 1) : it.sets;
      return {
        exercise_id: it.exercise_id,
        rep_min: it.rep_min,
        rep_max: it.rep_max,
        per_side: it.per_side,
        too_hard: false,
        sets: Array.from({ length: n }, (_, i) => ({
          weight: l?.[i]?.weight ?? l?.[0]?.weight ?? 0,
          reps: l?.[i]?.reps ?? it.rep_min,
          done: false,
        })),
      };
    }),
  };
}

export async function startSession(uid: string, template: Template, reduced: boolean) {
  const [sets, sessions] = await Promise.all([
    supabase
      .from("exercise_sets")
      .select("*")
      .eq("completed", true)
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase.from("workout_sessions").select("*"),
  ]);
  const last = lastSetsByExercise(sets.data ?? [], sessions.data ?? []);
  const state = buildInitialState(template, last, reduced);
  const ins = await supabase
    .from("workout_sessions")
    .insert({
      user_id: uid,
      template_id: template.id,
      name: template.name,
      kind: template.kind,
      status: "active",
      reduced_volume: reduced,
      state: state as never,
    })
    .select()
    .single();
  if (ins.error) throw new Error(ins.error.message);
  return ins.data;
}

/** Persist a finished session: sets, PRs, milestones. Returns new PRs + milestones. */
export async function finishSession(
  uid: string,
  session: Session,
  state: PlayerState,
  extra: { effort: number | null; notes: string; elapsed: number },
) {
  const rows = state.exercises.flatMap((ex, ei) =>
    ex.sets.map((s, si) => ({
      user_id: uid,
      session_id: session.id,
      exercise_id: ex.exercise_id,
      exercise_order: ei,
      set_index: si,
      weight: s.weight,
      reps: s.reps,
      rep_min: ex.rep_min,
      rep_max: ex.rep_max,
      completed: s.done,
      too_hard: ex.too_hard,
    })),
  );
  must(await supabase.from("exercise_sets").delete().eq("session_id", session.id));
  if (rows.length) must(await supabase.from("exercise_sets").insert(rows));
  const allDone = state.exercises.every((e) => e.sets.every((s) => s.done));
  must(
    await supabase
      .from("workout_sessions")
      .update({
        status: allDone ? "completed" : "partial",
        ended_at: new Date().toISOString(),
        duration_seconds: Math.round(extra.elapsed),
        effort: extra.effort,
        notes: extra.notes,
        state: null,
      })
      .eq("id", session.id),
  );

  // Personal records (best estimated 1RM per exercise)
  const prs = must(await supabase.from("personal_records").select("*"));
  const best = new Map<string, number>();
  for (const p of prs)
    best.set(p.exercise_id, Math.max(best.get(p.exercise_id) ?? 0, Number(p.est_1rm)));
  const newPRs: { exercise_id: string; weight: number; reps: number; est_1rm: number }[] = [];
  for (const ex of state.exercises) {
    let top: { weight: number; reps: number; e: number } | null = null;
    for (const s of ex.sets) {
      if (!s.done || s.weight <= 0) continue;
      const e = epley(s.weight, s.reps);
      if (!top || e > top.e) top = { weight: s.weight, reps: s.reps, e };
    }
    if (top && top.e > (best.get(ex.exercise_id) ?? 0)) {
      newPRs.push({
        exercise_id: ex.exercise_id,
        weight: top.weight,
        reps: top.reps,
        est_1rm: top.e,
      });
    }
  }
  if (newPRs.length)
    must(
      await supabase
        .from("personal_records")
        .insert(newPRs.map((p) => ({ ...p, user_id: uid, session_id: session.id }))),
    );
  const milestones = await checkMilestones(uid, newPRs.length > 0, false);
  return { newPRs, milestones };
}

export async function checkMilestones(uid: string, gotPR: boolean, ran5k: boolean) {
  const [s, r] = await Promise.all([
    supabase.from("workout_sessions").select("*"),
    supabase.from("running_sessions").select("*"),
  ]);
  const sessions = (s.data ?? []).filter(isDone);
  const runs = r.data ?? [];
  const total = sessions.length + runs.length;
  const keysToAdd: string[] = [];
  if (total >= 1) keysToAdd.push("first_workout");
  if (total >= 5) keysToAdd.push("five_workouts");
  if (total >= 10) keysToAdd.push("ten_workouts");
  const act = weeklyActivity(sessions, runs);
  let ws = weekStart(new Date());
  let ok = 0;
  for (let i = 0; i < 4; i++) {
    if (act.has(isoDate(ws))) ok++;
    ws = addDays(ws, -7);
  }
  if (ok === 4) keysToAdd.push("four_weeks");
  if (gotPR) keysToAdd.push("first_pr");
  if (ran5k || runs.some((x) => Number(x.distance_km) >= 5)) keysToAdd.push("first_5k");
  if (!keysToAdd.length) return [];
  const res = await supabase
    .from("milestones")
    .upsert(
      keysToAdd.map((key) => ({ user_id: uid, key })),
      { onConflict: "user_id,key", ignoreDuplicates: true },
    )
    .select();
  return res.data ?? [];
}

export { WEEK_ORDER };
