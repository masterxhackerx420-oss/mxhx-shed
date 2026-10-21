const GLYPHS: Record<string, string[]> = {
  A: [" ### ", "#   #", "#####", "#   #", "#   #"],
  B: ["#### ", "#   #", "#### ", "#   #", "#### "],
  C: [" ### ", "#    ", "#    ", "#    ", " ### "],
  D: ["#### ", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "#### ", "#    ", "#####"],
  G: [" ### ", "#    ", "#  ##", "#   #", " ### "],
  H: ["#   #", "#   #", "#####", "#   #", "#   #"],
  I: [" ### ", "  #  ", "  #  ", "  #  ", " ### "],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", " ### "],
  P: ["#### ", "#   #", "#### ", "#    ", "#    "],
  R: ["#### ", "#   #", "#### ", "#  # ", "#   #"],
  S: [" ####", "#    ", " ### ", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", " ### "],
};

for (const [name, rows] of Object.entries(GLYPHS)) {
  if (rows.length !== 5 || rows.some((row) => row.length !== 5)) {
    throw new Error(`Bad glyph ${name}`);
  }
}

export function renderWord(word: string): string[] {
  const glyphs = word.toUpperCase().split("").map((ch) => {
    const glyph = GLYPHS[ch];
    if (!glyph) throw new Error(`No glyph for ${ch}`);
    return glyph;
  });
  const rows: string[] = [];
  for (let r = 0; r < 5; r += 1) {
    rows.push(glyphs.map((glyph) => glyph[r]).join(" "));
  }
  return rows;
}

export function banner(word: string, subtitle: string): string {
  const rows = renderWord(word);
  const inner = Math.max(subtitle.length, "MXHX".length, ...rows.map((row) => row.length));
  const fit = (value: string) => {
    const pad = inner - value.length;
    const left = Math.floor(pad / 2);
    return ` ${" ".repeat(left)}${value}${" ".repeat(pad - left)} `;
  };
  const rule = `+${"-".repeat(inner + 2)}+`;
  const box = (value: string) => `|${fit(value)}|`;
  return [rule, box("MXHX"), ...rows.map(box), box(""), box(subtitle), rule].join("\n");
}

export function githubFence(word: string, subtitle: string): string {
  return "```text\n" + banner(word, subtitle) + "\n```\n";
}

export const BENCHES = [
  {
    id: "versions",
    word: "GITHUB",
    subtitle: "live refs, tags, dist-tags",
    image: "/brand/versions.jpg",
    alt: "Leather ledger, brass telescope, and wax-sealed bundles",
  },
  {
    id: "scrape",
    word: "SCRAPE",
    subtitle: "one public page, no login",
    image: "/brand/scrape.jpg",
    alt: "Grappling hook and net hauling blank pages",
  },
  {
    id: "dns",
    word: "DNS",
    subtitle: "names, mail, and resolvers",
    image: "/brand/dns.jpg",
    alt: "Brass compass, dividers, and a dark chart",
  },
  {
    id: "phone",
    word: "PHONE",
    subtitle: "country, line, vanity keys",
    image: "/brand/phone.jpg",
    alt: "Brass candlestick telephone and a crimson cloth",
  },
  {
    id: "steno",
    word: "STENO",
    subtitle: "briefs, drills, hidden ink",
    image: "/brand/steno.jpg",
    alt: "Dip pen, crimson ink, and a wax seal",
  },
] as const;

export type BenchId = (typeof BENCHES)[number]["id"];
