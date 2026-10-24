import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { keys, useExercises, useTemplates, type Template } from "@/lib/data";
import { DAY_NAMES, WEEK_ORDER, type TemplateItem } from "@/lib/program";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingBlock } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/traning/mall/$templateId")({
  head: () => ({
    meta: [
      { title: "Redigera pass – BEACTIVE" },
      { name: "description", content: "Anpassa övningar, set och reps i din passmall." },
      { property: "og:title", content: "Redigera pass – BEACTIVE" },
      { property: "og:description", content: "Anpassa övningar, set och reps i din passmall." },
    ],
  }),
  component: Editor,
});

function Editor() {
  const { templateId } = Route.useParams();
  const templates = useTemplates();
  const t = templates.data?.find((x) => x.id === templateId);
  if (templates.isLoading)
    return (
      <div className="pt-10">
        <LoadingBlock />
      </div>
    );
  if (!t)
    return (
      <p className="p-8">
        Mallen hittades inte.{" "}
        <Link to="/traning" className="text-primary underline">
          Tillbaka
        </Link>
      </p>
    );
  return <EditorForm t={t} />;
}

function EditorForm({ t }: { t: Template }) {
  const exercises = useExercises();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState(t);
  const [saving, setSaving] = useState(false);
  useEffect(() => setF(t), [t]);

  const setItem = (i: number, patch: Partial<TemplateItem>) =>
    setF({ ...f, items: f.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const move = (i: number, d: number) => {
    const items = [...f.items];
    const [x] = items.splice(i, 1);
    items.splice(i + d, 0, x!);
    setF({ ...f, items });
  };

  async function save() {
    setSaving(true);
    const r = await supabase
      .from("workout_templates")
      .update({
        name: f.name,
        subtitle: f.subtitle,
        warmup: f.warmup,
        duration: f.duration,
        day_of_week: f.day_of_week,
        items: f.items as never,
      })
      .eq("id", t.id);
    setSaving(false);
    if (r.error) {
      toast.error(r.error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: keys.templates });
    toast.success("Passet är sparat");
    navigate({ to: "/traning" });
  }

  return (
    <div className="space-y-5 px-5 pt-6 pb-10 safe-top md:px-8">
      <Link
        to="/traning"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Träning
      </Link>
      <h1 className="text-3xl font-bold">Redigera pass</h1>
      <div className="grid gap-4 card-surface p-5 sm:grid-cols-2">
        <Field label="Namn">
          <Input
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            className="h-11"
          />
        </Field>
        <Field label="Undertitel">
          <Input
            value={f.subtitle}
            onChange={(e) => setF({ ...f, subtitle: e.target.value })}
            className="h-11"
          />
        </Field>
        <Field label="Uppvärmning">
          <Input
            value={f.warmup}
            onChange={(e) => setF({ ...f, warmup: e.target.value })}
            className="h-11"
          />
        </Field>
        <Field label="Beräknad tid">
          <Input
            value={f.duration}
            onChange={(e) => setF({ ...f, duration: e.target.value })}
            className="h-11"
          />
        </Field>
        {t.kind !== "express" && (
          <Field label="Veckodag">
            <Select
              value={String(f.day_of_week ?? "none")}
              onValueChange={(v) => setF({ ...f, day_of_week: v === "none" ? null : Number(v) })}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEK_ORDER.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {DAY_NAMES[d]}
                  </SelectItem>
                ))}
                <SelectItem value="none">Ingen fast dag</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>

      {t.kind !== "run" && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Övningar</h2>
          {f.items.map((it, i) => (
            <div key={i} className="card-surface space-y-3 p-4">
              <div className="flex gap-2">
                <Select
                  value={it.exercise_id}
                  onValueChange={(v) => setItem(i, { exercise_id: v })}
                >
                  <SelectTrigger className="h-11 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(exercises.data ?? []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Flytta upp"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Flytta ner"
                  disabled={i === f.items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Ta bort"
                  onClick={() => setF({ ...f, items: f.items.filter((_, j) => j !== i) })}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Set">
                  <Input
                    type="number"
                    min={1}
                    value={it.sets}
                    onChange={(e) => setItem(i, { sets: Number(e.target.value) })}
                    className="h-11"
                  />
                </Field>
                <Field label="Reps min">
                  <Input
                    type="number"
                    min={1}
                    value={it.rep_min}
                    onChange={(e) => setItem(i, { rep_min: Number(e.target.value) })}
                    className="h-11"
                  />
                </Field>
                <Field label="Reps max">
                  <Input
                    type="number"
                    min={1}
                    value={it.rep_max}
                    onChange={(e) => setItem(i, { rep_max: Number(e.target.value) })}
                    className="h-11"
                  />
                </Field>
              </div>
              <label className="flex items-center justify-between text-sm">
                Per ben / per sida
                <Switch
                  checked={!!it.per_side}
                  onCheckedChange={(v) => setItem(i, { per_side: v })}
                />
              </label>
            </div>
          ))}
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              setF({
                ...f,
                items: [
                  ...f.items,
                  {
                    exercise_id: exercises.data?.[0]?.id ?? "squat",
                    sets: 3,
                    rep_min: 8,
                    rep_max: 12,
                  },
                ],
              })
            }
          >
            <Plus /> Lägg till övning
          </Button>
        </section>
      )}
      <Button className="w-full" size="lg" disabled={saving} onClick={save}>
        {saving ? "Sparar…" : "Spara ändringar"}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
