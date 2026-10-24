import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Search, Dumbbell } from "lucide-react";
import { useExerciseMap, type Exercise } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ErrorBlock, LoadingBlock } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/traning/bibliotek")({
  head: () => ({
    meta: [
      { title: "Övningsbibliotek – BEACTIVE" },
      {
        name: "description",
        content: "Sök övningar med muskler, utrustning, teknik och alternativ.",
      },
      { property: "og:title", content: "Övningsbibliotek – BEACTIVE" },
      {
        property: "og:description",
        content: "Sök övningar med muskler, utrustning, teknik och alternativ.",
      },
    ],
  }),
  component: Library,
});

function Library() {
  const ex = useExerciseMap();
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);
  const [open, setOpen] = useState<Exercise | null>(null);
  const all = ex.data ?? [];
  const [home, setHome] = useState(false);
  const muscles = [...new Set(all.flatMap((e) => e.muscles))].sort();
  const list = all
    .filter(
      (e) =>
        (!muscle || e.muscles.includes(muscle)) &&
        (!home || e.equipment.includes("Kroppsvikt")) &&
        (e.name + e.muscles.join(" ") + e.equipment.join(" "))
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));

  return (
    <div className="space-y-4 px-5 pt-6 safe-top md:px-8">
      <Link
        to="/traning"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Träning
      </Link>
      <h1 className="text-3xl font-bold">Övningsbibliotek</h1>
      <div className="relative">
        <Search className="absolute top-3.5 left-3 size-4 text-muted-foreground" />
        <Input
          placeholder="Sök övning, muskel eller utrustning"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-12 rounded-full pl-9"
        />
      </div>
      <button
        onClick={() => setHome((h) => !h)}
        aria-pressed={home}
        className={cn(
          "rounded-full border px-4 py-2 text-sm font-semibold",
          home ? "bg-accent text-accent-foreground" : "bg-card",
        )}
      >
        🏠 Hemma / kroppsvikt
      </button>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {[null, ...muscles].map((m) => (
          <button
            key={m ?? "all"}
            onClick={() => setMuscle(m)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-2 text-xs font-semibold",
              muscle === m ? "bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            {m ?? "Alla"}
          </button>
        ))}
      </div>
      {ex.error ? (
        <ErrorBlock error={ex.error} />
      ) : ex.isLoading ? (
        <LoadingBlock />
      ) : list.length === 0 ? (
        <p className="rounded-3xl bg-muted p-5 text-sm text-muted-foreground">
          Inga övningar matchar din sökning.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => setOpen(e)}
                className="flex w-full items-center gap-3 card-surface p-4 text-left"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
                  <Dumbbell className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold">{e.name}</span>
                  <span className="text-xs text-muted-foreground">{e.muscles.join(", ")}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl">
          {open && (
            <div className="mx-auto max-w-xl pb-6">
              <SheetHeader className="px-0">
                <SheetTitle className="font-display text-2xl">{open.name}</SheetTitle>
              </SheetHeader>
              {open.media_url ? (
                <img
                  src={open.media_url}
                  alt={open.name}
                  className="w-full rounded-2xl"
                  loading="lazy"
                />
              ) : (
                <p className="rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
                  Ingen demonstrationsvideo tillgänglig ännu.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-1">
                {open.muscles.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold"
                  >
                    {m}
                  </span>
                ))}
                {open.equipment.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-terracotta-soft px-2.5 py-1 text-xs font-semibold"
                  >
                    {m}
                  </span>
                ))}
              </div>
              <h3 className="mt-5 text-lg font-bold">Teknik</h3>
              <p className="mt-1 text-sm">{open.instructions}</p>
              {open.mistakes.length > 0 && (
                <>
                  <h3 className="mt-5 text-lg font-bold">Vanliga misstag</h3>
                  <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                    {open.mistakes.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </>
              )}
              {open.alternatives.length > 0 && (
                <>
                  <h3 className="mt-5 text-lg font-bold">Alternativ</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {open.alternatives
                      .map((a) => ex.map.get(a))
                      .filter(Boolean)
                      .map((a) => (
                        <button
                          key={a!.id}
                          onClick={() => setOpen(a!)}
                          className="min-h-11 rounded-full border bg-card px-4 text-sm font-semibold"
                        >
                          {a!.name}
                        </button>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
