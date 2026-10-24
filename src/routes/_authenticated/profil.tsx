import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, LogOut, RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { keys, useProfile, useTemplates, type Profile } from "@/lib/data";
import { DAY_SHORT, WEEK_ORDER } from "@/lib/program";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LoadingBlock, PageHeader } from "@/components/AppShell";
import { EQUIPMENT } from "@/lib/program";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Profil – BEACTIVE" },
      { name: "description", content: "Profil, mål, träningsdagar, påminnelser och data." },
      { property: "og:title", content: "Profil – BEACTIVE" },
      { property: "og:description", content: "Profil, mål, träningsdagar, påminnelser och data." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const profile = useProfile();
  const templates = useTemplates();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { email } = Route.useRouteContext();
  const [f, setF] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (profile.data) setF(profile.data);
  }, [profile.data]);

  if (!f || !templates.data)
    return (
      <div className="pt-10">
        <LoadingBlock />
      </div>
    );

  async function save() {
    setSaving(true);
    const { id, created_at, ...rest } = f!;
    void created_at;
    const r = await supabase
      .from("profiles")
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSaving(false);
    if (r.error) {
      toast.error(r.error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: keys.profile });
    toast.success("Profilen är sparad");
  }

  async function setDay(tid: string, d: number) {
    const r = await supabase.from("workout_templates").update({ day_of_week: d }).eq("id", tid);
    if (r.error) {
      toast.error(r.error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: keys.templates });
    const days = (templates.data ?? [])
      .map((t) => (t.id === tid ? d : t.day_of_week))
      .filter((x): x is number => x !== null);
    await supabase.from("profiles").update({ training_days: days }).eq("id", f!.id);
  }

  async function exportData() {
    const tables = [
      "profiles",
      "workout_templates",
      "workout_sessions",
      "exercise_sets",
      "running_sessions",
      "goals",
      "personal_records",
      "milestones",
      "scheduled_sessions",
    ] as const;
    const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
    for (const t of tables) {
      const r = await supabase.from(t).select("*");
      out[t] = r.data ?? [];
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `beactive-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast.success("Din träningshistorik är exporterad");
  }

  async function resetProgram() {
    if (!confirm("Återställ alla passmallar till standardprogrammet? Din historik påverkas inte."))
      return;
    const r = await supabase.rpc("reset_my_program");
    if (r.error) {
      toast.error(r.error.message);
      return;
    }
    qc.invalidateQueries();
    toast.success("Programmet är återställt");
  }

  async function deleteAll() {
    if (prompt('Skriv "RADERA" för att permanent ta bort ditt konto och all data.') !== "RADERA")
      return;
    const r = await supabase.rpc("delete_my_data");
    if (r.error) {
      toast.error(r.error.message);
      return;
    }
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/", replace: true });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setF({ ...f!, [k]: v });

  return (
    <div>
      <PageHeader title="Profil" subtitle={email} />
      <div className="space-y-5 px-5 pb-6 md:px-8">
        <section className="grid gap-4 card-surface p-5 sm:grid-cols-2">
          <F label="Namn">
            <Input value={f.name} onChange={(e) => set("name", e.target.value)} className="h-11" />
          </F>
          <F label="Träningsnivå">
            <Input
              value={f.level}
              onChange={(e) => set("level", e.target.value)}
              className="h-11"
            />
          </F>
          <F label="Huvudmål" wide>
            <Input value={f.goal} onChange={(e) => set("goal", e.target.value)} className="h-11" />
          </F>
          <F label="Styrkepass per vecka">
            <Input
              type="number"
              min={0}
              value={f.strength_per_week}
              onChange={(e) => set("strength_per_week", Number(e.target.value))}
              className="h-11"
            />
          </F>
          <F label="Löppass per vecka">
            <Input
              type="number"
              min={0}
              value={f.runs_per_week}
              onChange={(e) => set("runs_per_week", Number(e.target.value))}
              className="h-11"
            />
          </F>
          <F label="Löpvana">
            <Input
              value={f.run_ability}
              onChange={(e) => set("run_ability", e.target.value)}
              className="h-11"
            />
          </F>
          <F label="Passlängd (min)">
            <Input
              type="number"
              min={10}
              value={f.session_minutes}
              onChange={(e) => set("session_minutes", Number(e.target.value))}
              className="h-11"
            />
          </F>
          <F label="Minsta viktökning (kg)">
            <Input
              type="number"
              step="0.25"
              min={0.25}
              value={Number(f.weight_increment)}
              onChange={(e) => set("weight_increment", Number(e.target.value))}
              className="h-11"
            />
          </F>
          <F label="Rörelser att undvika" wide>
            <Textarea
              value={f.avoid_movements}
              onChange={(e) => set("avoid_movements", e.target.value)}
            />
          </F>
          <div className="sm:col-span-2">
            <Label>Utrustning</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {EQUIPMENT.map((e) => {
                const on = f.equipment.includes(e);
                return (
                  <button
                    key={e}
                    onClick={() =>
                      set(
                        "equipment",
                        on ? f.equipment.filter((x) => x !== e) : [...f.equipment, e],
                      )
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
          </div>
          <Button className="sm:col-span-2" disabled={saving} onClick={save}>
            {saving ? "Sparar…" : "Spara profil"}
          </Button>
        </section>

        <section className="card-surface p-5">
          <h2 className="text-lg font-bold">Träningsdagar</h2>
          <p className="text-sm text-muted-foreground">Ändringar sparas direkt.</p>
          <div className="mt-3 space-y-3">
            {templates.data
              .filter((t) => t.day_of_week !== null)
              .map((t) => (
                <div key={t.id}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <Link
                      to="/traning/mall/$templateId"
                      params={{ templateId: t.id }}
                      className="text-xs font-semibold text-primary"
                    >
                      Redigera mall
                    </Link>
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {WEEK_ORDER.map((d) => (
                      <button
                        key={d}
                        onClick={() => setDay(t.id, d)}
                        className={cn(
                          "min-h-11 rounded-xl text-xs font-bold",
                          t.day_of_week === d ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        {DAY_SHORT[d]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="card-surface p-5">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-lg font-bold">Påminnelser</span>
              <span className="text-sm text-muted-foreground">
                Sparar din önskade påminnelsetid för träningsdagar.
              </span>
            </span>
            <Switch
              checked={f.reminders_enabled}
              onCheckedChange={(v) => set("reminders_enabled", v)}
            />
          </label>
          {f.reminders_enabled && (
            <div className="mt-3 flex items-center gap-3">
              <Label>Tid</Label>
              <Input
                type="time"
                value={f.reminder_time}
                onChange={(e) => set("reminder_time", e.target.value)}
                className="h-11 w-32"
              />
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Kom ihåg att trycka på Spara profil. Enheter: kilogram och kilometer.
          </p>
        </section>

        <Link to="/mal" className="flex items-center justify-between card-surface p-5">
          <span>
            <span className="block text-lg font-bold">Mina mål</span>
            <span className="text-sm text-muted-foreground">Lopp, styrkemål, vikt och vanor</span>
          </span>
          <span className="text-2xl">🎯</span>
        </Link>

        <section className="space-y-2 card-surface p-5">
          <h2 className="text-lg font-bold">Data</h2>
          <Button variant="outline" className="w-full justify-start" onClick={exportData}>
            <Download /> Exportera träningshistorik (JSON)
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={resetProgram}>
            <RotateCcw /> Återställ standardprogrammet
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={signOut}>
            <LogOut /> Logga ut
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive"
            onClick={deleteAll}
          >
            <Trash2 /> Radera konto och all data
          </Button>
        </section>
      </div>
    </div>
  );
}

function F({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", wide && "sm:col-span-2")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
