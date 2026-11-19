/**
 * Design-system data maps. Every class name is written literally so the
 * Tailwind build keeps it — never build these names at runtime.
 */

export const LIFE_AREA_TONES = [
  "sage",
  "clay",
  "sky",
  "plum",
  "sand",
  "slate",
  "rose",
  "moss",
  "indigo",
  "ember",
];

const DOT = {
  sage: "bg-area-sage",
  clay: "bg-area-clay",
  sky: "bg-area-sky",
  plum: "bg-area-plum",
  sand: "bg-area-sand",
  slate: "bg-area-slate",
  rose: "bg-area-rose",
  moss: "bg-area-moss",
  indigo: "bg-area-indigo",
  ember: "bg-area-ember",
};

const SOFT = {
  sage: "bg-area-sage/12 text-area-sage",
  clay: "bg-area-clay/12 text-area-clay",
  sky: "bg-area-sky/12 text-area-sky",
  plum: "bg-area-plum/12 text-area-plum",
  sand: "bg-area-sand/12 text-area-sand",
  slate: "bg-area-slate/12 text-area-slate",
  rose: "bg-area-rose/12 text-area-rose",
  moss: "bg-area-moss/12 text-area-moss",
  indigo: "bg-area-indigo/12 text-area-indigo",
  ember: "bg-area-ember/12 text-area-ember",
};

const TEXT = {
  sage: "text-area-sage",
  clay: "text-area-clay",
  sky: "text-area-sky",
  plum: "text-area-plum",
  sand: "text-area-sand",
  slate: "text-area-slate",
  rose: "text-area-rose",
  moss: "text-area-moss",
  indigo: "text-area-indigo",
  ember: "text-area-ember",
};

const BORDER = {
  sage: "border-area-sage/40",
  clay: "border-area-clay/40",
  sky: "border-area-sky/40",
  plum: "border-area-plum/40",
  sand: "border-area-sand/40",
  slate: "border-area-slate/40",
  rose: "border-area-rose/40",
  moss: "border-area-moss/40",
  indigo: "border-area-indigo/40",
  ember: "border-area-ember/40",
};

export const areaDot = (tone) => DOT[tone] || DOT.slate;
export const areaSoft = (tone) => SOFT[tone] || SOFT.slate;
export const areaText = (tone) => TEXT[tone] || TEXT.slate;
export const areaBorder = (tone) => BORDER[tone] || BORDER.slate;

export const PRIORITY_GROUPS = [
  { id: "must", label: "Must do", hint: "Today, no question", rank: 1 },
  { id: "should", label: "Should do", hint: "Matters this week", rank: 2 },
  { id: "could", label: "Could do", hint: "If the day allows", rank: 3 },
  { id: "quick", label: "Quick wins", hint: "Under 10 minutes", rank: 4 },
  { id: "waiting", label: "Waiting on", hint: "Someone else's move", rank: 5 },
  { id: "future", label: "Future", hint: "Parked for later", rank: 6 },
];

export const priorityLabel = (id) =>
  PRIORITY_GROUPS.find((p) => p.id === id)?.label || "Unsorted";

export const ENERGY_LEVELS = [
  { id: "very_low", label: "Very low", description: "Barely any capacity" },
  { id: "low", label: "Low", description: "Small, gentle steps" },
  { id: "moderate", label: "Moderate", description: "Steady and ordinary" },
  { id: "high", label: "High", description: "Good energy available" },
  { id: "deep", label: "Deep focus", description: "Protect this window" },
];

export const energyLabel = (id) =>
  ENERGY_LEVELS.find((e) => e.id === id)?.label || "Moderate";

/** Life area icons available to the user (keys are stored on the record). */
export const AREA_ICONS = [
  "circle",
  "user",
  "users",
  "home",
  "briefcase",
  "heart-pulse",
  "brain",
  "wallet",
  "book-open",
  "scale",
  "sparkles",
  "dumbbell",
  "message-circle",
  "palette",
  "church",
  "party-popper",
  "plane",
  "sprout",
];

export const COGNITIVE_ACTIVITIES = [
  { id: "breathing", title: "Guided breathing", minutes: 3, prompt: "Slow, steady breaths. Nothing to solve." },
  { id: "gratitude", title: "Three good things", minutes: 2, prompt: "Name three small things that went right recently." },
  { id: "recall", title: "Goal recall", minutes: 3, prompt: "Without looking, name your top three priorities this week." },
  { id: "words", title: "Word association", minutes: 2, prompt: "Pick one word from your day and free-associate for a minute." },
  { id: "math", title: "Mental math", minutes: 3, prompt: "Double numbers down from 100, then back up." },
  { id: "pattern", title: "Pattern spotting", minutes: 4, prompt: "What has repeated in your week? What is it telling you?" },
];