export type SemVer = {
  major: number;
  minor: number;
  patch: number;
  pre: string[];
  build: string;
  raw: string;
};

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

export function parseSemVer(raw: string): SemVer | null {
  const match = raw.trim().match(SEMVER);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    pre: match[4] ? match[4].split(".") : [],
    build: match[5] ?? "",
    raw: raw.trim(),
  };
}

export function cmpSemVer(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  if (a.pre.length === 0 && b.pre.length === 0) return 0;
  if (a.pre.length === 0) return 1;
  if (b.pre.length === 0) return -1;
  const count = Math.max(a.pre.length, b.pre.length);
  for (let i = 0; i < count; i += 1) {
    const left = a.pre[i];
    const right = b.pre[i];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    const leftNum = /^\d+$/.test(left);
    const rightNum = /^\d+$/.test(right);
    if (leftNum && rightNum) {
      const delta = Number(left) - Number(right);
      if (delta !== 0) return delta;
    } else if (leftNum) return -1;
    else if (rightNum) return 1;
    else if (left !== right) return left < right ? -1 : 1;
  }
  return 0;
}

export function satisfiesRange(version: SemVer, rangeRaw: string): { ok: boolean; reason: string } | null {
  const range = rangeRaw.trim();
  if (!range) return null;
  const caret = range.startsWith("^");
  const tilde = range.startsWith("~");
  const base = parseSemVer(caret || tilde ? range.slice(1) : range);
  if (!base) return null;
  const order = cmpSemVer(version, base);
  if (!caret && !tilde) {
    return {
      ok: order === 0,
      reason: order === 0 ? "Exact match. Build metadata is ignored." : "Not the same version.",
    };
  }
  if (version.pre.length > 0 && base.pre.length === 0) {
    return { ok: false, reason: "A prerelease sits outside a range whose floor is a stable version." };
  }
  if (order < 0) return { ok: false, reason: "Older than the floor of the range." };
  if (tilde) {
    const inside = version.major === base.major && version.minor === base.minor;
    return {
      ok: inside,
      reason: inside ? "Inside the tilde band. Same major and minor." : "Tilde only keeps the same minor.",
    };
  }
  let inside = false;
  if (base.major > 0) inside = version.major === base.major;
  else if (base.minor > 0) inside = version.major === 0 && version.minor === base.minor;
  else inside = version.major === 0 && version.minor === 0 && version.patch === base.patch;
  return {
    ok: inside,
    reason: inside ? "Inside the caret band." : "Outside the caret band.",
  };
}

export function partsLabel(v: SemVer): string {
  const pre = v.pre.length ? `-${v.pre.join(".")}` : "";
  const build = v.build ? `+${v.build}` : "";
  return `major ${v.major}, minor ${v.minor}, patch ${v.patch}${pre ? `, prerelease ${pre}` : ""}${build ? `, build ${build}` : ""}`;
}
