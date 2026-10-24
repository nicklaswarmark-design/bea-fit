import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addDays, endOfMonth, startOfMonth } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronRight, Footprints, Trophy } from "lucide-react";
import {
  isDone,
  useExerciseMap,
  usePRs,
  useProfile,
  useRuns,
  useSessions,
  useSets,
  useTemplates,
} from "@/lib/data";
import { epley, fmtDuration, fmtPace, fmtShort, isoDate, weekStart } from "@/lib/program";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorBlock, LoadingBlock, PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/utveckling/")({
  head: () => ({
    meta: [
      { title: "Utveckling – BEACTIVE" },
      { name: "description", content: "Statistik, styrkeprogression, löpning och personbästa." },
      { property: "og:title", content: "Utveckling – BEACTIVE" },
      {
        property: "og:description",
        content: "Statistik, styrkeprogression, löpning och personbästa.",
      },
    ],
  }),
  component: Progress,
});

const tick = { fontSize: 11, fill: "var(--muted-foreground)" };
const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 12,
};

function Progress() {
  const sessions = useSessions();
  const sets = useSets();
  const runs = useRuns();
  const prs = usePRs();
  const profile = useProfile();
  const templates = useTemplates();
  const ex = useExerciseMap();
  const [exId, setExId] = useState<string>("");

  const qs = [sessions, sets, runs, prs, profile, templates];
  const err = qs.find((q) => q.error)?.error;

  const data = useMemo(() => {
    if (!sessions.data || !sets.data || !runs.data) return null;
    const done = sessions.data.filter(isDone);
    const doneIds = new Set(done.map((s) => s.id));
    const sessDate = new Map(done.map((s) => [s.id, new Date(s.started_at)]));
    const doneSets = sets.data.filter((s) => s.completed && doneIds.has(s.session_id));
    const ws0 = weekStart(new Date());
    const weeks = Array.from({ length: 8 }, (_, i) => addDays(ws0, -7 * (7 - i)));
    const perWeek = weeks.map((w) => {
      const we = addDays(w, 7);
      const inW = (d: Date) => d >= w && d < we;
      return {
        week: fmtShort(w),
        Gym: done.filter((s) => inW(new Date(s.started_at))).length,
        Löpning: runs.data!.filter((r) => inW(new Date(r.run_date + "T12:00"))).length,
        volym: Math.round(
          doneSets
            .filter((s) => inW(sessDate.get(s.session_id)!))
            .reduce((a, s) => a + Number(s.weight) * s.reps, 0),
        ),
        km:
          Math.round(
            runs
              .data!.filter((r) => inW(new Date(r.run_date + "T12:00")))
              .reduce((a, r) => a + Number(r.distance_km), 0) * 10,
          ) / 10,
      };
    });
    const exIds = [...new Set(doneSets.map((s) => s.exercise_id))];
    const totalVol = Math.round(doneSets.reduce((a, s) => a + Number(s.weight) * s.reps, 0));
    return { done, doneSets, perWeek, exIds, totalVol };
  }, [sessions.data, sets.data, runs.data]);

  if (err)
    return (
      <div className="pt-10">
        <ErrorBlock error={err} />
      </div>
    );
  if (!data || !profile.data || !templates.data)
    return (
      <div className="pt-10">
        <LoadingBlock />
      </div>
    );

  const selected = exId || data.exIds[0] || "";
  const strength = (() => {
    const bySession = new Map<string, { date: Date; best: number; weight: number }>();
    for (const s of data.doneSets.filter((x) => x.exercise_id === selected)) {
      const sess = data.done.find((d) => d.id === s.session_id)!;
      const e = epley(Number(s.weight), s.reps);
      const cur = bySession.get(s.session_id);
      if (!cur || e > cur.best)
        bySession.set(s.session_id, {
          date: new Date(sess.started_at),
          best: e,
          weight: Number(s.weight),
        });
    }
    return [...bySession.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((v) => ({ date: fmtShort(v.date), "Est. 1RM": v.best, Vikt: v.weight }));
  })();

  const runSeries = [...runs.data!].reverse().map((r) => ({
    date: fmtShort(r.run_date),
    km: Number(r.distance_km),
    tempo: Math.round((r.duration_seconds / Number(r.distance_km) / 60) * 100) / 100,
  }));

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const weeklyPlanned = templates.data.filter(
    (t) => t.day_of_week !== null && t.kind !== "express",
  ).length;
  const monthDone =
    data.done.filter((s) => new Date(s.started_at) >= monthStart).length +
    runs.data!.filter((r) => new Date(r.run_date) >= monthStart).length;
  const monthPlanned = Math.round((weeklyPlanned * monthEnd.getDate()) / 7);
  const avg = data.perWeek.reduce((a, w) => a + w.Gym + w.Löpning, 0) / 8;

  const activeDays = [
    ...data.done.map((s) => new Date(s.started_at)),
    ...runs.data!.map((r) => new Date(r.run_date + "T12:00")),
  ];
  const bestPR = new Map<string, NonNullable<typeof prs.data>[number]>();
  for (const p of prs.data ?? []) {
    const c = bestPR.get(p.exercise_id);
    if (!c || Number(p.est_1rm) > Number(c.est_1rm)) bestPR.set(p.exercise_id, p);
  }
  const hasAny = data.done.length + runs.data!.length > 0;

  return (
    <div>
      <PageHeader title="Utveckling" subtitle="Dina framsteg" />
      <div className="space-y-5 px-5 md:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Totalt antal pass" value={String(data.done.length + runs.data!.length)} />
          <Kpi label="Pass / vecka (8 v)" value={avg.toFixed(1)} />
          <Kpi
            label="Månadens konsekvens"
            value={
              monthPlanned ? `${Math.min(100, Math.round((monthDone / monthPlanned) * 100))}%` : "–"
            }
          />
          <Kpi
            label="Uppskattad volym"
            value={`${(data.totalVol / 1000).toFixed(1)} t`}
            hint="vikt × reps"
          />
        </div>

        {!hasAny && (
          <div className="rounded-3xl bg-gradient-sage p-6">
            <p className="font-display text-xl font-bold">Din resa börjar här 🌱</p>
            <p className="mt-1 text-sm">
              När du loggat ditt första pass fylls grafer, kalender och personbästa på automatiskt.
            </p>
          </div>
        )}

        <ChartCard title="Åtta veckor i översikt" subtitle="Antal pass per vecka">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.perWeek}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="week" tick={tick} axisLine={false} tickLine={false} />
              <YAxis
                allowDecimals={false}
                tick={tick}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="Gym" stackId="a" fill="var(--forest)" radius={[0, 0, 4, 4]} />
              <Bar dataKey="Löpning" stackId="a" fill="var(--terracotta)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Styrkeprogression"
          subtitle="Uppskattat 1RM per pass"
          right={
            data.exIds.length > 0 && (
              <Select value={selected} onValueChange={setExId}>
                <SelectTrigger className="h-10 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.exIds.map((id) => (
                    <SelectItem key={id} value={id}>
                      {ex.name(id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }
        >
          {strength.length < 1 ? (
            <Empty text="Logga en övning för att se din styrkekurva." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={strength}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} width={32} unit=" kg" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="Est. 1RM"
                  stroke="var(--forest)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Vikt"
                  stroke="var(--terracotta)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Uppskattad träningsvolym"
          subtitle="Vikt × reps per vecka (kg) – en uppskattning"
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.perWeek}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="week" tick={tick} axisLine={false} tickLine={false} />
              <YAxis tick={tick} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
              <Bar
                dataKey="volym"
                name="Uppskattad volym"
                fill="var(--sage)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Löpning" subtitle="Distans (km) och tempo (min/km)">
          {runSeries.length === 0 ? (
            <Empty text="Inga löppass ännu. Söndagens Run Club väntar!" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={runSeries}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tick={tick} axisLine={false} tickLine={false} />
                <YAxis yAxisId="km" tick={tick} axisLine={false} tickLine={false} width={28} />
                <YAxis
                  yAxisId="p"
                  orientation="right"
                  reversed
                  tick={tick}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  yAxisId="km"
                  type="monotone"
                  dataKey="km"
                  name="Distans (km)"
                  stroke="var(--forest)"
                  strokeWidth={3}
                />
                <Line
                  yAxisId="p"
                  type="monotone"
                  dataKey="tempo"
                  name="Tempo (min/km)"
                  stroke="var(--terracotta)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <section className="card-surface p-5">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Trophy className="size-5 text-accent" /> Personbästa
          </h3>
          {bestPR.size === 0 ? (
            <Empty text="Dina riktiga personbästa visas här efter dina pass." />
          ) : (
            <ul className="mt-2 divide-y">
              {[...bestPR.values()].map((p) => (
                <li key={p.id} className="flex justify-between py-2.5 text-sm">
                  <span className="font-semibold">{ex.name(p.exercise_id)}</span>
                  <span>
                    {Number(p.weight)} kg × {p.reps}{" "}
                    <span className="text-muted-foreground">· {fmtShort(p.achieved_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-surface p-5">
          <h3 className="text-lg font-bold">Kalender</h3>
          <Calendar
            mode="multiple"
            selected={activeDays}
            locale={sv}
            weekStartsOn={1}
            className="mx-auto"
            onSelect={() => {}}
          />
        </section>

        <section>
          <h3 className="mb-3 text-xl font-bold">Historik</h3>
          {data.done.length + runs.data!.length === 0 ? (
            <Empty text="Inga sparade pass ännu." />
          ) : (
            <ul className="space-y-2">
              {[
                ...data.done.map((s) => ({
                  kind: "gym" as const,
                  date: new Date(s.started_at),
                  s,
                })),
                ...runs.data!.map((r) => ({
                  kind: "run" as const,
                  date: new Date(r.run_date + "T12:00"),
                  r,
                })),
              ]
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .slice(0, 40)
                .map((h) =>
                  h.kind === "gym" ? (
                    <li key={h.s.id}>
                      <Link
                        to="/utveckling/pass/$sessionId"
                        params={{ sessionId: h.s.id }}
                        className="flex items-center gap-3 card-surface p-4"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">
                            {h.s.name}
                            {h.s.status === "partial" && (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                delvis
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {fmtShort(h.date)} · {fmtDuration(h.s.duration_seconds)}
                            {h.s.effort ? ` · RPE ${h.s.effort}` : ""}
                          </p>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ) : (
                    <li key={h.r.id}>
                      <Link
                        to="/traning/lopning"
                        className="flex items-center gap-3 card-surface p-4"
                      >
                        <Footprints className="size-5 text-accent" />
                        <div className="flex-1">
                          <p className="font-semibold">Run Club · {Number(h.r.distance_km)} km</p>
                          <p className="text-xs text-muted-foreground">
                            {fmtShort(h.date)} ·{" "}
                            {fmtPace(h.r.duration_seconds / Number(h.r.distance_km))}
                          </p>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ),
                )}
            </ul>
          )}
        </section>
        <p className="pb-4 text-center text-xs text-muted-foreground">
          Senast uppdaterad {isoDate(new Date())}
        </p>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-surface p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
function ChartCard({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card-surface p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="mt-2 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">{text}</p>;
}
