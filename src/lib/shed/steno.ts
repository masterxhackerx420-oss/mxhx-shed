const BRIEFS: Record<string, string> = {
  a: "A",
  if: "IF",
  you: "U",
  want: "WNT",
  to: "TO",
  learn: "LERN",
  this: "TH",
  will: "L",
  need: "NED",
  time: "TAIM",
  and: "SKP",
  practice: "PRAK",
  we: "WE",
  can: "K",
  read: "RED",
  the: "-T",
  live: "LIV",
  version: "VER",
  see: "Z",
  what: "WHA",
  changed: "CHJ",
  call: "KAUL",
  me: "ME",
  when: "WHN",
  know: "NO",
  how: "HOU",
  find: "FAIND",
  work: "WRK",
  do: "DO",
  not: "NOT",
  write: "WRAIT",
  that: "THA",
  before: "B4",
  understand: "UND",
  it: "IT",
  they: "THEY",
  help: "H",
  build: "BLD",
  test: "TES",
  of: "OF",
  in: "IN",
  is: "S",
  for: "FOR",
  with: "W",
  on: "ON",
  your: "UR",
  my: "MAI",
  now: "NAU",
  code: "KOD",
  page: "PAJ",
  name: "NAIM",
  host: "HOE",
  number: "NUM",
  note: "NOET",
  hide: "HAID",
  back: "BAK",
  public: "PUB",
  please: "PLZ",
};

const REVERSE: Record<string, string> = {};
for (const [word, brief] of Object.entries(BRIEFS)) REVERSE[brief] = word;

export const DRILLS = [
  "if you want to learn this you will need time and practice",
  "we can read the live version and see what changed",
  "call me when you know how to find the work",
  "do not write that before you understand it",
  "they will help you build and test the work",
];

export function briefEntries(): [string, string][] {
  return Object.entries(BRIEFS).sort(([a], [b]) => a.localeCompare(b));
}

export function toBrief(text: string): string {
  const tokens = text.match(/[A-Za-z0-9']+|[^\sA-Za-z0-9']+/g);
  if (!tokens) return "";
  return tokens
    .map((token) => {
      if (/^[A-Za-z0-9']+$/.test(token)) {
        return BRIEFS[token.toLowerCase()] ?? `*${token}`;
      }
      return token;
    })
    .join(" ")
    .replace(/\s+([.,!?;:])/g, "$1");
}

export function fromBrief(text: string): string {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  return tokens
    .map((token) => {
      const punct = token.match(/^(.+?)([.,!?;:]+)$/);
      const core = punct?.[1] ?? token;
      const tail = punct?.[2] ?? "";
      if (core.startsWith("*")) return `${core.slice(1)}${tail}`;
      return `${REVERSE[core.toUpperCase()] ?? core}${tail}`;
    })
    .join(" ");
}

export function sameBrief(a: string, b: string): boolean {
  const norm = (value: string) => value.trim().toUpperCase().replace(/\s+/g, " ");
  return norm(a) === norm(b);
}
