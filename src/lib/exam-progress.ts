export type ExamProgress = {
  answers: Record<number, string>;
  current: number;
  remaining: number;
  savedAt: number;
};

export function progressKey(program: string, subject: string, year: string) {
  return `khlangsob:exam:${program}:${subject}:${year}`;
}

export function loadProgress(key: string): ExamProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ExamProgress>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      answers: parsed.answers && typeof parsed.answers === "object" ? (parsed.answers as Record<number, string>) : {},
      current: typeof parsed.current === "number" ? parsed.current : 0,
      remaining: typeof parsed.remaining === "number" ? parsed.remaining : 0,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveProgress(key: string, value: Omit<ExamProgress, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ ...value, savedAt: Date.now() }));
  } catch {
    /* storage unavailable */
  }
}

export function clearProgress(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

export function formatSavedAt(ts: number) {
  return new Date(ts).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}
