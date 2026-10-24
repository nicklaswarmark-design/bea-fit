import { addDays, differenceInCalendarWeeks, format, startOfWeek } from "date-fns";
import { sv } from "date-fns/locale";

export type TemplateItem = {
  exercise_id: string;
  sets: number;
  rep_min: number;
  rep_max: number;
  per_side?: boolean | undefined;
  alt?: string | undefined;
};

export const DAY_NAMES = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
export const DAY_SHORT = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];
/** Week order Monday..Sunday as JS day indexes */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const weekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });
export const isoDate = (d: Date) => format(d, "yyyy-MM-dd");
export const dateForDow = (ws: Date, dow: number) => addDays(ws, dow === 0 ? 6 : dow - 1);
export const fmtDay = (d: Date | string) =>
  format(typeof d === "string" ? new Date(d) : d, "EEEE d MMM", { locale: sv });
export const fmtShort = (d: Date | string) =>
  format(typeof d === "string" ? new Date(d) : d, "d MMM", { locale: sv });

export function programWeek(programStart: string, today = new Date()) {
  const w = differenceInCalendarWeeks(today, new Date(programStart), { weekStartsOn: 1 }) + 1;
  return Math.max(1, w);
}

export function runPlanForWeek(week: number) {
  if (week <= 2)
    return {
      title: "3–4 km lugn löpning",
      detail: "Prata-tempo hela vägen. Fokus på att njuta.",
      km: 3.5,
    };
  if (week <= 4)
    return { title: "4–5 km lugn löpning", detail: "Samma lugna tempo, lite längre.", km: 4.5 };
  if (week <= 6)
    return {
      title: "4–5 km med valfria intervaller",
      detail: "Valfritt: 4 × 1 minut lite snabbare med lugn återhämtning emellan.",
      km: 4.5,
    };
  return {
    title: "5 km bekvämt och sammanhängande",
    detail: "Ett jämnt, bekvämt tempo. Du klarar det!",
    km: 5,
  };
}

export const epley = (w: number, r: number) =>
  r <= 0 ? 0 : Math.round(w * (1 + r / 30) * 10) / 10;

export const fmtDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
};
export const fmtPace = (secPerKm: number) =>
  !isFinite(secPerKm) || secPerKm <= 0
    ? "–"
    : `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, "0")} /km`;

export type LastSet = { weight: number; reps: number; too_hard: boolean };

export type Suggestion =
  | { type: "start"; text: string }
  | { type: "hold"; text: string }
  | { type: "reps"; text: string }
  | { type: "weight"; text: string; weight: number };

/** Double progression. Never applied automatically — Bea confirms. */
export function suggestProgression(
  last: LastSet[] | undefined,
  repMin: number,
  repMax: number,
  increment: number,
): Suggestion {
  if (!last || last.length === 0)
    return {
      type: "start",
      text: "Första gången: välj en vikt där du har 1–3 reps kvar i varje set.",
    };
  if (last.some((s) => s.too_hard))
    return {
      type: "hold",
      text: "Förra gången kändes tungt – behåll vikten och fokusera på tekniken.",
    };
  const w = Math.max(...last.map((s) => s.weight));
  const allTop = last.every((s) => s.reps >= repMax);
  if (allTop && w > 0) {
    const inc = Math.max(increment, Math.round((w * 0.03) / increment) * increment);
    const capped = Math.min(
      inc,
      Math.max(increment, Math.round((w * 0.05) / increment) * increment),
    );
    const nw = Math.round((w + capped) * 100) / 100;
    return {
      type: "weight",
      weight: nw,
      text: `Alla set nådde ${repMax} reps. Redo att höja till ${nw} kg? Börja på ${repMin} reps igen.`,
    };
  }
  if (repMin === repMax)
    return {
      type: "reps",
      text: `Sikta på ${repMax} reps i alla set med god teknik innan vikten höjs.`,
    };
  return {
    type: "reps",
    text: `Lägg till en rep där du kan – målet är ${repMax} reps i alla set innan vikten höjs.`,
  };
}

export const MILESTONES: Record<string, { title: string; text: string; emoji: string }> = {
  first_workout: {
    title: "Första passet!",
    text: "Det viktigaste är att du dök upp. Välkommen, Bea!",
    emoji: "🌱",
  },
  five_workouts: {
    title: "Fem pass klara",
    text: "Another day, another rep. Du bygger något fint.",
    emoji: "🔥",
  },
  ten_workouts: {
    title: "Tio pass!",
    text: "Beast mode activated! Tio pass i bagaget.",
    emoji: "💪",
  },
  four_weeks: {
    title: "Fyra veckor i rad",
    text: "Konsekvens slår perfektion. Fyra veckor, Bea!",
    emoji: "🌿",
  },
  first_pr: {
    title: "Nytt personbästa",
    text: "Bea, du är starkare än förra veckan.",
    emoji: "🏆",
  },
  first_5k: { title: "Första 5 km!", text: "Run Club-legend. Fem hela kilometer!", emoji: "🏃‍♀️" },
};

const MESSAGES = [
  "Beast mode activated!",
  "Bea, du är starkare än förra veckan.",
  "Another day, another rep.",
  "Det viktigaste är att du dök upp.",
  "Små steg, stora resultat.",
  "Stark är det nya vackert – och du är båda.",
];
export const dailyMessage = (d = new Date()) =>
  MESSAGES[(d.getDate() + d.getMonth()) % MESSAGES.length];

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 10) return "God morgon";
  if (h < 17) return "Hej";
  return "God kväll";
}
export const EQUIPMENT = [
  "Skivstång",
  "Hantlar",
  "Kabelmaskin",
  "Benpress",
  "Maskiner",
  "Kettlebell",
  "Gummiband",
  "Löpband",
];
