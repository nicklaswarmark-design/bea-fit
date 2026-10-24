import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Pause,
  Play,
  Plus,
  Repeat,
  Search,
  Timer,
  Trophy,
  X,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  finishSession,
  lastSetsByExercise,
  useExerciseMap,
  useProfile,
  useSessions,
  useSets,
  useUserId,
  type PlayerState,
  type Session,
} from "@/lib/data";
import { fmtDuration, MILESTONES, suggestProgression } from "@/lib/program";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/DecimalInput";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ErrorBlock, LoadingBlock } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/traning/pass/$sessionId")({
  head: () => ({
    meta: [
      { title: "Pågående pass – BEACTIVE" },
      { name: "description", content: "Logga set, vikter och vila under ditt pass." },
      { property: "og:title", content: "Pågående pass – BEACTIVE" },
      { property: "og:description", content: "Logga set, vikter och vila under ditt pass." },
    ],
  }),
  component: PlayerPage,
});

function PlayerPage() {
  const { sessionId } = Route.useParams();
  const q = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const r = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (r.error) throw r.error;
      return r.data;
    },
    staleTime: Infinity,
    gcTime: 0,
  });
  if (q.error)
    return (
      <div className="pt-10">
        <ErrorBlock error={q.error} />
      </div>
    );
  if (!q.data) {
    if (q.isLoading)
      return (
        <div className="pt-10">
          <LoadingBlock />
        </div>
      );
    return (
      <div className="p-8 text-center">
        <p className="font-semibold">Passet hittades inte.</p>
        <Link to="/traning" className="mt-3 inline-block font-semibold text-primary underline">
          Till träning
        </Link>
      </div>
    );
  }
  if (!q.data.state) {
    return (
      <div className="p-8 text-center">
        <p className="font-semibold">Det här passet är redan sparat.</p>
        <Link
          to="/utveckling/pass/$sessionId"
          params={{ sessionId }}
          className="mt-3 inline-block font-semibold text-primary underline"
        >
          Visa passet
        </Link>
      </div>
    );
  }
  return <Player session={q.data} />;
}

const LS = (id: string) => `beactive-session-${id}`;

function Player({ session }: { session: Session }) {
  const uid = useUserId();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ex = useExerciseMap();
  const profile = useProfile();
  const allSets = useSets();
  const allSessions = useSessions();

  const [state, setState] = useState<PlayerState>(() => {
    const db = session.state as unknown as PlayerState;
    try {
      const local = JSON.parse(localStorage.getItem(LS(session.id)) ?? "null");
      if (local && local.savedAt > new Date(session.updated_at).getTime()) return local.state;
    } catch {
      /* ignore */
    }
    return db;
  });
  const [now, setNow] = useState(Date.now());
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof finishSession>> | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Autosave (local immediately, cloud debounced)
  useEffect(() => {
    if (savedRef.current) return;
    localStorage.setItem(LS(session.id), JSON.stringify({ savedAt: Date.now(), state }));
    const t = setTimeout(() => {
      supabase
        .from("workout_sessions")
        .update({
          state: state as never,
          status: state.runningSince ? "active" : "paused",
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .then(
          ({ error }) =>
            error && toast.error("Autosparning misslyckades – försöker igen vid nästa ändring"),
        );
    }, 700);
    return () => clearTimeout(t);
  }, [state, session.id]);

  useEffect(() => {
    if (restEnd && now >= restEnd) {
      setRestEnd(null);
      if ("vibrate" in navigator) navigator.vibrate?.(300);
      toast("Vilan är slut – nästa set! 💪");
    }
  }, [now, restEnd]);

  const last = useMemo(
    () => lastSetsByExercise(allSets.data ?? [], allSessions.data ?? [], session.id),
    [allSets.data, allSessions.data, session.id],
  );

  const elapsed = state.elapsed + (state.runningSince ? (now - state.runningSince) / 1000 : 0);
  const totalSets = state.exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = state.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const cur = state.exercises[state.current];
  const info = cur ? ex.map.get(cur.exercise_id) : undefined;
  const inc = Number(profile.data?.weight_increment ?? 2.5);
  const suggestion = cur
    ? suggestProgression(last.get(cur.exercise_id), cur.rep_min, cur.rep_max, inc)
    : null;
  const paused = !state.runningSince;

  const update = (fn: (s: PlayerState) => void) =>
    setState((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });

  function togglePause() {
    update((s) => {
      if (s.runningSince) {
        s.elapsed += (Date.now() - s.runningSince) / 1000;
        s.runningSince = null;
      } else s.runningSince = Date.now();
    });
  }

  function toggleSet(i: number) {
    const willBeDone = !cur!.sets[i]!.done;
    update((s) => {
      s.exercises[s.current]!.sets[i]!.done = willBeDone;
    });
    if (willBeDone) setRestEnd(Date.now() + state.rest * 1000);
  }

  async function saveForLater() {
    const s = structuredClone(state);
    if (s.runningSince) {
      s.elapsed += (Date.now() - s.runningSince) / 1000;
      s.runningSince = null;
    }
    await supabase
      .from("workout_sessions")
      .update({ state: s as never, status: "paused" })
      .eq("id", session.id);
    localStorage.removeItem(LS(session.id));
    qc.invalidateQueries({ queryKey: ["sessions"] });
    qc.removeQueries({ queryKey: ["session", session.id] });
    toast.success("Passet är sparat – fortsätt när du vill.");
    navigate({ to: "/hem" });
  }

  async function finish(effort: number | null, notes: string) {
    try {
      savedRef.current = true;
      const r = await finishSession(uid, session, state, { effort, notes, elapsed });
      if (r.milestones.length)
        await supabase
          .from("milestones")
          .update({ seen: true })
          .in(
            "id",
            r.milestones.map((m) => m.id),
          );
      localStorage.removeItem(LS(session.id));
      await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "session" });
      setFinishOpen(false);
      setResult(r);
    } catch (e) {
      savedRef.current = false;
      toast.error(e instanceof Error ? e.message : "Kunde inte spara passet");
    }
  }

  async function discard() {
    if (!confirm("Radera det här passet? Inget sparas.")) return;
    savedRef.current = true;
    await supabase.from("workout_sessions").delete().eq("id", session.id);
    localStorage.removeItem(LS(session.id));
    await qc.invalidateQueries({ queryKey: ["sessions"] });
    navigate({ to: "/traning" });
  }

  if (result)
    return (
      <Summary
        result={result}
        name={session.name}
        elapsed={elapsed}
        doneSets={doneSets}
        exName={ex.name}
      />
    );

  return (
    <div className="mx-auto min-h-screen max-w-xl pb-40 safe-top">
      <header className="sticky top-0 z-30 border-b bg-background/95 px-4 pt-4 pb-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={saveForLater} aria-label="Spara och lämna">
            <ChevronLeft />
          </Button>
          <div className="flex-1 text-center">
            <p className="font-display text-lg font-bold leading-tight">{session.name}</p>
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                paused ? "text-accent" : "text-muted-foreground",
              )}
            >
              {fmtDuration(elapsed)} {paused && "· pausat"}
            </p>
          </div>
          <Button
            variant={paused ? "accent" : "outline"}
            size="icon"
            onClick={togglePause}
            aria-label={paused ? "Fortsätt" : "Pausa"}
          >
            {paused ? <Play /> : <Pause />}
          </Button>
        </div>
        <div
          className="mt-3 h-2 rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={doneSets}
          aria-valuemax={totalSets}
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }}
          />
        </div>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {state.exercises.map((e, i) => {
            const complete = e.sets.length > 0 && e.sets.every((s) => s.done);
            return (
              <button
                key={i}
                onClick={() =>
                  update((s) => {
                    s.current = i;
                  })
                }
                className={cn(
                  "shrink-0 rounded-full border px-3 py-2 text-xs font-semibold",
                  i === state.current
                    ? "border-primary bg-primary text-primary-foreground"
                    : complete
                      ? "bg-secondary"
                      : "bg-card",
                )}
              >
                {complete && <Check className="mr-1 inline size-3" />}
                {ex.name(e.exercise_id)}
              </button>
            );
          })}
        </div>
      </header>

      {!cur ? (
        <p className="p-8 text-center text-muted-foreground">Inga övningar i passet.</p>
      ) : (
        <div className="space-y-4 px-4 pt-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">
              Övning {state.current + 1} av {state.exercises.length}
            </p>
            <h1 className="mt-1 text-3xl font-bold">{ex.name(cur.exercise_id)}</h1>
            <p className="mt-1 text-muted-foreground">
              Mål: {cur.sets.length} ×{" "}
              {cur.rep_min === cur.rep_max ? cur.rep_min : `${cur.rep_min}–${cur.rep_max}`}
              {cur.per_side ? " per sida" : ""} · 1–3 reps kvar
            </p>
            {info?.muscles?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {info.muscles.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold"
                  >
                    {m}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowInfo(!showInfo)}>
                <Info /> Teknik
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSwapOpen(true)}>
                <Repeat /> Byt övning
              </Button>
            </div>
            {showInfo && info && (
              <div className="mt-3 rounded-2xl bg-muted p-4 text-sm">
                {info.media_url && (
                  <img
                    src={info.media_url}
                    alt={info.name}
                    className="mb-3 w-full rounded-xl"
                    loading="lazy"
                  />
                )}
                <p>{info.instructions}</p>
                {info.mistakes.length > 0 && (
                  <>
                    <p className="mt-3 font-semibold">Vanliga misstag</p>
                    <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                      {info.mistakes.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-4 text-sm">
            <p className="font-semibold">
              Förra gången:{" "}
              <span className="font-normal text-muted-foreground">
                {last
                  .get(cur.exercise_id)
                  ?.map((s) => `${s.weight} kg × ${s.reps}`)
                  .join(" · ") ?? "Ingen historik ännu"}
              </span>
            </p>
            {suggestion && (
              <div className="mt-2 rounded-xl bg-secondary p-3">
                <p>{suggestion.text}</p>
                {suggestion.type === "weight" && (
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      update((s) => {
                        s.exercises[s.current]!.sets.forEach((x) => {
                          if (!x.done) {
                            x.weight = suggestion.weight;
                            x.reps = cur.rep_min;
                          }
                        });
                      });
                      toast.success(`Uppdaterat till ${suggestion.weight} kg`);
                    }}
                  >
                    Använd {suggestion.weight} kg
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="card-surface overflow-hidden">
            <div className="grid grid-cols-[2rem_1fr_1fr_3rem_2rem] items-center gap-2 border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
              <span>Set</span>
              <span>Vikt (kg)</span>
              <span>Reps</span>
              <span className="text-center">Klar</span>
              <span />
            </div>
            {cur.sets.map((s, i) => (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[2rem_1fr_1fr_3rem_2rem] items-center gap-2 px-3 py-2",
                  s.done && "bg-secondary/60",
                )}
              >
                <span className="font-display text-lg font-bold">{i + 1}</span>
                <DecimalInput
                  placeholder="kg"
                  aria-label={`Vikt set ${i + 1}`}
                  value={s.weight}
                  onValueChange={(n) =>
                    update((st) => {
                      st.exercises[st.current]!.sets[i]!.weight = n;
                    })
                  }
                  className="h-11 text-base"
                />
                <DecimalInput
                  integer
                  placeholder="reps"
                  aria-label={`Reps set ${i + 1}`}
                  value={s.reps}
                  onValueChange={(n) =>
                    update((st) => {
                      st.exercises[st.current]!.sets[i]!.reps = n;
                    })
                  }
                  className="h-11 text-base"
                />
                <button
                  onClick={() => toggleSet(i)}
                  aria-label={`Markera set ${i + 1} klart`}
                  aria-pressed={s.done}
                  className={cn(
                    "mx-auto grid size-11 place-items-center rounded-full border-2 transition-colors",
                    s.done ? "border-primary bg-primary text-primary-foreground" : "border-input",
                  )}
                >
                  <Check className="size-5" />
                </button>
                <button
                  onClick={() =>
                    update((st) => {
                      st.exercises[st.current]!.sets.splice(i, 1);
                    })
                  }
                  aria-label={`Ta bort set ${i + 1}`}
                  className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                update((st) => {
                  const e = st.exercises[st.current]!;
                  const l = e.sets[e.sets.length - 1];
                  e.sets.push({ weight: l?.weight ?? 0, reps: l?.reps ?? e.rep_min, done: false });
                })
              }
              className="flex min-h-12 w-full items-center justify-center gap-2 border-t text-sm font-semibold text-primary"
            >
              <Plus className="size-4" /> Lägg till set
            </button>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border bg-card p-4 text-sm">
            <input
              type="checkbox"
              className="size-5 accent-[var(--terracotta)]"
              checked={cur.too_hard}
              onChange={(e) =>
                update((s) => {
                  s.exercises[s.current]!.too_hard = e.target.checked;
                })
              }
            />
            Kändes för tungt eller tekniken brast – höj inte vikten nästa gång
          </label>

          <div className="rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Timer className="size-4" /> Vila mellan set
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[60, 90, 120].map((r) => (
                <button
                  key={r}
                  onClick={() =>
                    update((s) => {
                      s.rest = r;
                    })
                  }
                  className={cn(
                    "min-h-11 rounded-xl text-sm font-bold",
                    state.rest === r ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {r} s
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setRestEnd(Date.now() + state.rest * 1000)}
            >
              Starta vila nu
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              disabled={state.current === 0}
              onClick={() =>
                update((s) => {
                  s.current--;
                })
              }
            >
              <ChevronLeft /> Föregående
            </Button>
            {state.current < state.exercises.length - 1 ? (
              <Button
                className="flex-1"
                onClick={() =>
                  update((s) => {
                    s.current++;
                  })
                }
              >
                Nästa <ChevronRight />
              </Button>
            ) : (
              <Button variant="accent" className="flex-1" onClick={() => setFinishOpen(true)}>
                Avsluta pass
              </Button>
            )}
          </div>
          <button
            className="w-full py-2 text-sm font-semibold text-muted-foreground underline"
            onClick={() => setFinishOpen(true)}
          >
            Avsluta passet nu
          </button>
        </div>
      )}

      {restEnd && (
        <div className="fixed inset-x-0 bottom-0 z-40 safe-bottom">
          <div className="mx-auto m-3 flex max-w-xl items-center gap-4 rounded-3xl bg-gradient-forest p-4 text-primary-foreground shadow-lift">
            <Timer />
            <div className="flex-1">
              <p className="text-xs font-semibold opacity-80">Vila</p>
              <p className="font-display text-3xl font-bold tabular-nums">
                {fmtDuration(Math.max(0, (restEnd - now) / 1000))}
              </p>
            </div>
            <Button
              variant="hero"
              size="icon"
              aria-label="Minska vila"
              onClick={() => setRestEnd(restEnd - 15000)}
            >
              <Minus />
            </Button>
            <Button
              variant="hero"
              size="icon"
              aria-label="Öka vila"
              onClick={() => setRestEnd(restEnd + 15000)}
            >
              <Plus />
            </Button>
            <Button variant="hero" size="sm" onClick={() => setRestEnd(null)}>
              Hoppa över
            </Button>
          </div>
        </div>
      )}

      <SwapDialog
        open={swapOpen}
        onOpenChange={setSwapOpen}
        currentId={cur?.exercise_id}
        onPick={(id) => {
          update((s) => {
            s.exercises[s.current]!.exercise_id = id;
          });
          setSwapOpen(false);
          toast.success(`Bytt till ${ex.name(id)}`);
        }}
      />
      <FinishDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        doneSets={doneSets}
        totalSets={totalSets}
        onSave={finish}
        onDiscard={discard}
        onLater={saveForLater}
      />
    </div>
  );
}

function SwapDialog({
  open,
  onOpenChange,
  currentId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentId?: string | undefined;
  onPick: (id: string) => void;
}) {
  const ex = useExerciseMap();
  const [q, setQ] = useState("");
  const current = currentId ? ex.map.get(currentId) : undefined;
  const alts = (current?.alternatives ?? []).map((id) => ex.map.get(id)).filter(Boolean);
  const list = (ex.data ?? []).filter(
    (e) => e.id !== currentId && e.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>Byt övning</DialogTitle>
        </DialogHeader>
        {alts.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">
              Rekommenderade alternativ
            </p>
            <div className="mt-2 space-y-2">
              {alts.map((a) => (
                <button
                  key={a!.id}
                  onClick={() => onPick(a!.id)}
                  className="flex min-h-12 w-full items-center justify-between rounded-2xl bg-secondary px-4 text-left font-semibold"
                >
                  {a!.name}
                  <ChevronRight className="size-4" />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="relative mt-2">
          <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
          <Input
            placeholder="Sök övning"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
        <div className="space-y-1">
          {list.map((e) => (
            <button
              key={e.id}
              onClick={() => onPick(e.id)}
              className="flex min-h-12 w-full flex-col justify-center rounded-xl px-3 text-left hover:bg-muted"
            >
              <span className="font-semibold">{e.name}</span>
              <span className="text-xs text-muted-foreground">
                {e.muscles.join(", ")} · {e.equipment.join(", ")}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FinishDialog({
  open,
  onOpenChange,
  doneSets,
  totalSets,
  onSave,
  onDiscard,
  onLater,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  doneSets: number;
  totalSets: number;
  onSave: (effort: number | null, notes: string) => Promise<void>;
  onDiscard: () => void;
  onLater: () => void;
}) {
  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Snyggt jobbat, Bea!</DialogTitle>
          <DialogDescription>
            {doneSets}/{totalSets} set klara.
            {doneSets < totalSets &&
              " Passet sparas som delvis genomfört – det räknas fortfarande!"}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm font-semibold">Hur ansträngande kändes det? (valfritt)</p>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setEffort(effort === n ? null : n)}
              className={cn(
                "min-h-11 rounded-xl font-bold",
                effort === n ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">1 = väldigt lätt · 10 = maximalt</p>
        <Textarea
          placeholder="Anteckningar (valfritt)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onSave(effort, notes);
            setBusy(false);
          }}
        >
          {busy ? "Sparar…" : "Spara pass"}
        </Button>
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={onLater}>
            Spara & fortsätt senare
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onDiscard}>
            Radera passet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Summary({
  result,
  name,
  elapsed,
  doneSets,
  exName,
}: {
  result: Awaited<ReturnType<typeof finishSession>>;
  name: string;
  elapsed: number;
  doneSets: number;
  exName: (id: string) => string;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10 text-center">
      <p className="text-6xl">🎉</p>
      <h1 className="mt-4 text-4xl font-extrabold">Pass klart!</h1>
      <p className="mt-2 text-muted-foreground">
        {name} · {fmtDuration(elapsed)} · {doneSets} set
      </p>
      <p className="mt-4 font-display text-lg italic text-primary">
        “Det viktigaste är att du dök upp.”
      </p>
      {result.newPRs.length > 0 && (
        <div className="mt-6 card-surface p-5 text-left">
          <p className="flex items-center gap-2 font-bold">
            <Trophy className="size-5 text-accent" /> Nya personbästa
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {result.newPRs.map((p) => (
              <li key={p.exercise_id}>
                <b>{exName(p.exercise_id)}</b>: {p.weight} kg × {p.reps}
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.milestones.map((m) => (
        <div key={m.id} className="mt-3 rounded-2xl bg-terracotta-soft p-4">
          <p className="font-bold">
            {MILESTONES[m.key]?.emoji} {MILESTONES[m.key]?.title}
          </p>
          <p className="text-sm">{MILESTONES[m.key]?.text}</p>
        </div>
      ))}
      <Button asChild size="lg" className="mt-8">
        <Link to="/hem">Till Hem</Link>
      </Button>
    </div>
  );
}
