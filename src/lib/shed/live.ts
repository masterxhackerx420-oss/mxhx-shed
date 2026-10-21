import { createServerFn } from "@tanstack/react-start";
import type {
  CertResult,
  CompareResult,
  DnsResult,
  Fail,
  GithubResult,
  HeadResult,
  NpmResult,
  RdapResult,
  RobotsResult,
  RouteResult,
  ScrapeResult,
} from "@/lib/shed/types";

const hits: number[] = [];

function cooled(): string | null {
  const now = Date.now();
  while (hits.length && now - hits[0] > 60_000) hits.shift();
  if (hits.length >= 45) return "The shed is cooling off. Give it a few seconds.";
  hits.push(now);
  return null;
}

function fail(error: string): Fail {
  return { ok: false, error };
}

function hostBlocked(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "metadata.google.internal"
  ) {
    return "Private and local hosts stay outside the shed.";
  }
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const n = v4.slice(1).map(Number);
    if (n.some((part) => part > 255)) return "That address is not public.";
    const [a, b] = n;
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    ) {
      return "Private and reserved addresses are not fetched.";
    }
  }
  if (host.includes(":") && (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80"))) {
    return "Private and reserved addresses are not fetched.";
  }
  return null;
}

function parseRepo(raw: string): { owner: string; repo: string } | null {
  let value = raw.trim();
  if (!value) return null;
  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const url = new URL(value);
      if (!/(^|\.)github\.com$/i.test(url.hostname)) return null;
      value = url.pathname;
    }
  } catch {
    return null;
  }
  value = value.replace(/^\/+/, "").replace(/\.git$/, "").replace(/\/+$/, "");
  const [owner, repo] = value.split("/");
  if (!owner || !repo) return null;
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
  if (owner.includes("..") || repo.includes("..")) return null;
  return { owner, repo };
}

function parsePkg(raw: string): string | null {
  let value = raw.trim().replace(/\/$/, "");
  value = value.replace(/^https?:\/\/(www\.)?npmjs\.com\/package\//i, "");
  if (!/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i.test(value)) return null;
  if (value.length > 214) return null;
  return value;
}

function parseRef(raw: string): string | null {
  const value = raw.trim();
  if (!value || value.length > 120) return null;
  if (!/^[\w./-]+$/.test(value) || value.includes("..")) return null;
  return value;
}

function firstLine(value: string): string {
  return (value.split("\n")[0] ?? "").slice(0, 140);
}

async function gh<T>(path: string): Promise<{ status: number; data: T | null }> {
  try {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "MXHX-Shed",
        "x-github-api-version": "2022-11-28",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 204) return { status: 204, data: null };
    const text = await res.text();
    try {
      return { status: res.status, data: JSON.parse(text) as T };
    } catch {
      return { status: res.status, data: null };
    }
  } catch {
    return { status: 0, data: null };
  }
}

type GhRepo = {
  full_name?: string;
  description?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  language?: string | null;
  license?: { name?: string } | null;
  default_branch?: string;
  pushed_at?: string | null;
  html_url?: string;
};

type GhRelease = { tag_name?: string; name?: string | null; published_at?: string | null; body?: string | null };
type GhTag = { name?: string };
type GhCommit = {
  sha?: string;
  html_url?: string;
  author?: { login?: string } | null;
  commit?: { message?: string; author?: { name?: string; date?: string } };
};

function repoIn(input: unknown): { repo: string } {
  if (!input || typeof input !== "object" || !("repo" in input)) return { repo: "" };
  const repo = (input as { repo?: unknown }).repo;
  return { repo: typeof repo === "string" ? repo : "" };
}

function npmIn(input: unknown): { name: string } {
  if (!input || typeof input !== "object" || !("name" in input)) return { name: "" };
  const name = (input as { name?: unknown }).name;
  return { name: typeof name === "string" ? name : "" };
}

function compareIn(input: unknown): { repo: string; base: string; head: string } {
  const bag = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    repo: typeof bag.repo === "string" ? bag.repo : "",
    base: typeof bag.base === "string" ? bag.base : "",
    head: typeof bag.head === "string" ? bag.head : "",
  };
}

function scrapeIn(input: unknown): { url: string; selector: string } {
  const bag = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    url: typeof bag.url === "string" ? bag.url : "",
    selector: typeof bag.selector === "string" ? bag.selector : "",
  };
}

function dnsIn(input: unknown): { host: string; type: string; fanout: boolean } {
  const bag = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    host: typeof bag.host === "string" ? bag.host : "",
    type: typeof bag.type === "string" ? bag.type : "A",
    fanout: bag.fanout === true,
  };
}

export const readGithub = createServerFn({ method: "POST" })
  .validator(repoIn)
  .handler(async ({ data }): Promise<GithubResult> => {
    const limited = cooled();
    if (limited) return fail(limited);
    const parsed = parseRepo(data.repo);
    if (!parsed) return fail("Use owner/name, or a github.com URL.");
    const { owner, repo } = parsed;
    const repoRes = await gh<GhRepo>(`/repos/${owner}/${repo}`);
    if (repoRes.status === 0) return fail("GitHub did not answer.");
    if (repoRes.status === 404) return fail("No public repository by that name.");
    if (repoRes.status === 403) {
      return fail("GitHub is resting unauthenticated reads from this network. Try a package, or come back in a minute.");
    }
    if (!repoRes.data?.full_name || repoRes.status >= 400) {
      return fail(`GitHub returned ${repoRes.status || "nothing"}.`);
    }
    const [releases, tags, commits] = await Promise.all([
      gh<GhRelease[]>(`/repos/${owner}/${repo}/releases?per_page=1`),
      gh<GhTag[]>(`/repos/${owner}/${repo}/tags?per_page=8`),
      gh<GhCommit[]>(`/repos/${owner}/${repo}/commits?per_page=6`),
    ]);
    const release = Array.isArray(releases.data) ? releases.data[0] : undefined;
    const tagNames = Array.isArray(tags.data)
      ? tags.data.map((tag) => tag.name).filter((name): name is string => Boolean(name)).slice(0, 8)
      : [];
    const commitRows = Array.isArray(commits.data)
      ? commits.data.slice(0, 6).map((commit) => ({
          sha: (commit.sha ?? "").slice(0, 7),
          message: firstLine(commit.commit?.message ?? ""),
          date: commit.commit?.author?.date ?? null,
          author: commit.author?.login ?? commit.commit?.author?.name ?? "unknown",
          url: commit.html_url ?? `https://github.com/${owner}/${repo}`,
        }))
      : [];
    const sha = commitRows[0]?.sha ?? "none";
    const tag = release?.tag_name ?? "";
    return {
      ok: true,
      fullName: repoRes.data.full_name,
      description: repoRes.data.description ?? null,
      stars: repoRes.data.stargazers_count ?? 0,
      forks: repoRes.data.forks_count ?? 0,
      openIssues: repoRes.data.open_issues_count ?? 0,
      language: repoRes.data.language ?? null,
      license: repoRes.data.license?.name ?? null,
      defaultBranch: repoRes.data.default_branch ?? "main",
      pushedAt: repoRes.data.pushed_at ?? null,
      htmlUrl: repoRes.data.html_url ?? `https://github.com/${owner}/${repo}`,
      mark: `${sha}:${tag}`,
      latestRelease: release?.tag_name
        ? {
            tag: release.tag_name,
            name: release.name || release.tag_name,
            publishedAt: release.published_at ?? null,
            body: firstLine(release.body ?? ""),
          }
        : null,
      tags: tagNames,
      commits: commitRows,
    };
  });

export const readNpm = createServerFn({ method: "POST" })
  .validator(npmIn)
  .handler(async ({ data }): Promise<NpmResult> => {
    const limited = cooled();
    if (limited) return fail(limited);
    const name = parsePkg(data.name);
    if (!name) return fail("Use a public package name, like vite or @tanstack/react-start.");
    const path = name.replace("/", "%2F");
    try {
      const res = await fetch(`https://registry.npmjs.org/${path}`, {
        headers: { accept: "application/json", "user-agent": "MXHX-Shed" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 404) return fail("No package by that name on the public registry.");
      if (!res.ok) return fail(`The registry returned ${res.status}.`);
      const doc = (await res.json()) as {
        name?: string;
        description?: string;
        "dist-tags"?: { latest?: string };
        time?: Record<string, string>;
        license?: unknown;
        homepage?: unknown;
      };
      const latest = doc["dist-tags"]?.latest;
      if (!latest) return fail("That package has no latest tag.");
      const time = doc.time ?? {};
      const recent = Object.entries(time)
        .filter(([key, value]) => key !== "created" && key !== "modified" && typeof value === "string")
        .sort((a, b) => Date.parse(b[1]) - Date.parse(a[1]))
        .slice(0, 6)
        .map(([version, stamp]) => ({ version, time: stamp }));
      let license: string | null = null;
      if (typeof doc.license === "string") license = doc.license;
      else if (doc.license && typeof doc.license === "object" && "type" in doc.license) {
        const kind = (doc.license as { type?: unknown }).type;
        if (typeof kind === "string") license = kind;
      }
      return {
        ok: true,
        name: doc.name ?? name,
        description: doc.description ?? null,
        latest,
        license,
        homepage: typeof doc.homepage === "string" ? doc.homepage : null,
        publishedAt: time[latest] ?? null,
        mark: `${latest}@${time[latest] ?? ""}`,
        recent,
      };
    } catch {
      return fail("The package registry did not answer.");
    }
  });

export const compareRefs = createServerFn({ method: "POST" })
  .validator(compareIn)
  .handler(async ({ data }): Promise<CompareResult> => {
    const limited = cooled();
    if (limited) return fail(limited);
    const parsed = parseRepo(data.repo);
    const base = parseRef(data.base);
    const head = parseRef(data.head);
    if (!parsed) return fail("Name the repository before comparing refs.");
    if (!base || !head) return fail("Both refs need to be tags or branch names.");
    const res = await gh<{
      status?: string;
      ahead_by?: number;
      behind_by?: number;
      total_commits?: number;
      commits?: { sha?: string; commit?: { message?: string; author?: { date?: string } } }[];
      files?: { filename?: string; status?: string; additions?: number; deletions?: number }[];
    }>(`/repos/${parsed.owner}/${parsed.repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`);
    if (res.status === 404) return fail("Those refs are not both on the public repo.");
    if (res.status === 403) return fail("GitHub is resting. Try the compare again in a minute.");
    if (!res.data || res.status >= 400 || res.status === 0) return fail("GitHub could not compare those refs.");
    return {
      ok: true,
      status: res.data.status ?? "unknown",
      ahead: res.data.ahead_by ?? 0,
      behind: res.data.behind_by ?? 0,
      total: res.data.total_commits ?? 0,
      commits: (res.data.commits ?? []).slice(-8).map((commit) => ({
        sha: (commit.sha ?? "").slice(0, 7),
        message: firstLine(commit.commit?.message ?? ""),
        date: commit.commit?.author?.date ?? null,
      })),
      files: (res.data.files ?? []).slice(0, 20).map((file) => ({
        name: file.filename ?? "",
        status: file.status ?? "",
        additions: file.additions ?? 0,
        deletions: file.deletions ?? 0,
      })),
    };
  });

async function readBounded(res: Response, max: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const dec = new TextDecoder();
  let out = "";
  let size = 0;
  while (size < max) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    out += dec.decode(value, { stream: true });
  }
  out += dec.decode();
  await reader.cancel().catch(() => undefined);
  return out.slice(0, max);
}

async function fetchPublic(raw: string): Promise<{ url: string; status: number; type: string; body: string } | Fail> {
  let current: URL;
  const seeded = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    current = new URL(seeded);
  } catch {
    return fail("That does not look like a URL.");
  }
  for (let hop = 0; hop < 3; hop += 1) {
    if (current.protocol !== "http:" && current.protocol !== "https:") {
      return fail("Only public http and https pages.");
    }
    if (current.username || current.password) return fail("Drop the username and password from the URL.");
    if (current.port && current.port !== "80" && current.port !== "443") {
      return fail("The shed only fetches the usual web ports.");
    }
    const blocked = hostBlocked(current.hostname);
    if (blocked) return fail(blocked);
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        headers: {
          accept: "text/html,application/xhtml+xml,text/plain,application/json;q=0.8,*/*;q=0.1",
          "user-agent": "MXHX-Shed/1.0 (single public page read)",
        },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      return fail("That host took too long, or did not answer.");
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return fail("The redirect had nowhere to go.");
      current = new URL(loc, current);
      continue;
    }
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (type && !/html|xml|json|text|javascript/.test(type)) {
      await res.body?.cancel().catch(() => undefined);
      return fail(`That address returned ${type}, not a text page.`);
    }
    const body = await readBounded(res, 400_000);
    return { url: current.href, status: res.status, type: type || "text/plain", body };
  }
  return fail("Too many redirects.");
}

function namedEntity(name: string): string {
  if (name === "nbsp") return " ";
  if (name === "amp") return "&";
  if (name === "lt") return "<";
  if (name === "gt") return ">";
  if (name === "quot") return '"';
  if (name === "apos") return "'";
  return "";
}

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    const token = body.toLowerCase();
    if (token.startsWith("#x")) {
      const code = Number.parseInt(token.slice(2), 16);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    if (token.startsWith("#")) {
      const code = Number(token.slice(1));
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    return namedEntity(token) || whole;
  });
}

function visibleText(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function tagAttr(tag: string, name: string): string {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`, "i"));
  return decodeEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function metaContent(html: string, key: string, attrName: "name" | "property"): string {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (tagAttr(tag, attrName).toLowerCase() !== key) continue;
    const content = tagAttr(tag, "content");
    if (content) return content;
  }
  return "";
}

function selectSimple(html: string, selector: string): string[] {
  const parts = selector.split(",").map((part) => part.trim()).filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    const spec = part.match(/^(?:([a-z][\w-]*)|\*)?(?:#([\w-]+))?(?:\.([\w-]+))?$/i);
    if (!spec || part.includes(" ") || (!spec[1] && !spec[2] && !spec[3])) {
      return ["Simple selectors only: a tag, #id, .class, or a comma list."];
    }
    const tag = (spec[1] ?? "").toLowerCase();
    const id = spec[2] ?? "";
    const cls = spec[3] ?? "";
    const open = /<([a-zA-Z][\w-]*)\b([^>]*)>/g;
    let hit: RegExpExecArray | null;
    while ((hit = open.exec(html)) && out.length < 12) {
      const name = hit[1].toLowerCase();
      if (tag && name !== tag) continue;
      if (id && tagAttr(hit[0], "id") !== id) continue;
      if (cls && !tagAttr(hit[0], "class").split(/\s+/).includes(cls)) continue;
      const rest = html.slice(hit.index + hit[0].length, hit.index + hit[0].length + 500);
      const text = visibleText(rest.split(/<\/?[a-z]/i)[0] ?? rest).slice(0, 180);
      if (text) out.push(text);
    }
  }
  return out;
}

function collectTypes(data: unknown, out: string[]) {
  if (!data || out.length >= 8) return;
  if (Array.isArray(data)) {
    for (const item of data) collectTypes(item, out);
    return;
  }
  if (typeof data === "object") {
    const kind = (data as { "@type"?: unknown })["@type"];
    const list = Array.isArray(kind) ? kind : [kind];
    for (const item of list) {
      if (typeof item === "string" && !out.includes(item) && out.length < 8) out.push(item);
    }
  }
}

export const scrapeUrl = createServerFn({ method: "POST" })
  .validator(scrapeIn)
  .handler(async ({ data }): Promise<ScrapeResult> => {
    const limited = cooled();
    if (limited) return fail(limited);
    const selector = data.selector.trim().slice(0, 80);
    if (data.url.trim().length < 3 || data.url.length > 500) return fail("Enter one public page URL.");
    const fetched = await fetchPublic(data.url.trim());
    if ("ok" in fetched) return fetched;
    const isHtml = fetched.type.includes("html") || /^\s*</.test(fetched.body);
    if (!isHtml) {
      let title = "Text";
      let description = fetched.body.replace(/\s+/g, " ").trim().slice(0, 280);
      const kinds: string[] = [];
      if (fetched.type.includes("json") || fetched.body.trim().startsWith("{") || fetched.body.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(fetched.body) as unknown;
          if (Array.isArray(parsed)) {
            title = "JSON array";
            description = `${parsed.length} items`;
            kinds.push("Array");
          } else if (parsed && typeof parsed === "object") {
            title = "JSON object";
            description = Object.keys(parsed).slice(0, 12).join(", ");
            kinds.push("Object");
          }
        } catch {
          title = "Text";
        }
      }
      return {
        ok: true,
        url: fetched.url,
        status: fetched.status,
        contentType: fetched.type,
        title,
        description,
        headings: [],
        links: [],
        emails: [],
        tels: [],
        kinds,
        matches: selector ? ["Selectors run on HTML pages."] : [],
        bytes: fetched.body.length,
      };
    }
    const kinds: string[] = [];
    for (const block of fetched.body.matchAll(
      /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    )) {
      try {
        collectTypes(JSON.parse(block[1] ?? ""), kinds);
      } catch {
        /* skip broken blocks */
      }
    }
    const title = visibleText(
      metaContent(fetched.body, "og:title", "property") || (fetched.body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""),
    ).slice(0, 160);
    const description = visibleText(
      metaContent(fetched.body, "og:description", "property") || metaContent(fetched.body, "description", "name"),
    ).slice(0, 280);
    const stripped = fetched.body.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
    const headings: { level: number; text: string }[] = [];
    for (const heading of stripped.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
      if (headings.length >= 24) break;
      const text = visibleText(heading[2] ?? "").slice(0, 160);
      if (!text) continue;
      headings.push({ level: Number(heading[1]) || 1, text });
    }
    const links: { href: string; text: string }[] = [];
    const seen = new Set<string>();
    const emails = new Set<string>();
    const tels = new Set<string>();
    for (const anchor of stripped.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const href = tagAttr(`<a ${anchor[1] ?? ""}>`, "href");
      if (!href) continue;
      if (href.toLowerCase().startsWith("mailto:")) {
        const mail = href.slice(7).split("?")[0]?.trim();
        if (mail) emails.add(mail.slice(0, 80));
        continue;
      }
      if (href.toLowerCase().startsWith("tel:")) {
        tels.add(href.slice(4).slice(0, 40));
        continue;
      }
      if (links.length >= 30) continue;
      let abs: URL;
      try {
        abs = new URL(href, fetched.url);
      } catch {
        continue;
      }
      if (abs.protocol !== "http:" && abs.protocol !== "https:") continue;
      abs.hash = "";
      if (seen.has(abs.href)) continue;
      seen.add(abs.href);
      const text = visibleText(anchor[2] ?? "").slice(0, 80);
      links.push({ href: abs.href, text: text || abs.href });
    }
    const text = visibleText(stripped);
    for (const match of text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []) {
      if (emails.size >= 12) break;
      emails.add(match.slice(0, 80));
    }
    for (const match of text.match(/\+\d[\d().\-\s]{8,}\d/g) ?? []) {
      if (tels.size >= 8) break;
      tels.add(match.replace(/\s+/g, " ").trim().slice(0, 40));
    }
    return {
      ok: true,
      url: fetched.url,
      status: fetched.status,
      contentType: fetched.type,
      title: title || "Untitled page",
      description,
      headings,
      links,
      emails: [...emails],
      tels: [...tels],
      kinds,
      matches: selector ? selectSimple(stripped, selector) : [],
      bytes: fetched.body.length,
    };
  });

const DNS_TYPES = new Set(["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "CAA", "PTR"]);

function cleanHost(raw: string): string | null {
  let value = raw.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0] ?? "";
  value = value.replace(/\.$/, "");
  if (value.includes(":") && /^\d+$/.test(value.split(":")[1] ?? "x") && value.split(":").length === 2) {
    value = value.split(":")[0] ?? "";
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return value;
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)) return null;
  return value;
}

function reverseIp(ip: string): string | null {
  const match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return null;
  return `${parts.reverse().join(".")}.in-addr.arpa`;
}

const RESOLVERS = [
  {
    label: "Cloudflare",
    href: (name: string, type: string) =>
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`,
  },
  {
    label: "Google",
    href: (name: string, type: string) =>
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`,
  },
  {
    label: "Quad9",
    href: (name: string, type: string) =>
      `https://dns.quad9.net/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`,
  },
];

async function askResolver(url: string): Promise<{ status: string; answers: { data: string; ttl: number }[]; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return { status: "HTTP", answers: [], error: `Resolver returned ${res.status}.` };
    const data = (await res.json()) as { Status?: number; Answer?: { data?: string; TTL?: number }[] };
    const names = ["NOERROR", "FORMERR", "SERVFAIL", "NXDOMAIN", "NOTIMP", "REFUSED"];
    const status = names[data.Status ?? -1] ?? String(data.Status ?? "UNKNOWN");
    const quote = '"';
    const answers = (data.Answer ?? []).slice(0, 12).map((row) => ({
      data: String(row.data ?? "").split(`${quote} ${quote}`).join("").split(quote).join("").slice(0, 300),
      ttl: Number(row.TTL ?? 0),
    }));
    return { status, answers };
  } catch {
    return { status: "DOWN", answers: [], error: "Resolver did not answer." };
  }
}

export const lookupDns = createServerFn({ method: "POST" })
  .validator(dnsIn)
  .handler(async ({ data }): Promise<DnsResult> => {
    const limited = cooled();
    if (limited) return fail(limited);
    const host = cleanHost(data.host);
    if (!host) return fail("Enter a public host name, or an IPv4 address for a reverse lookup.");
    const blocked = hostBlocked(host);
    if (blocked) return fail(blocked);
    let type = data.type.toUpperCase();
    if (!DNS_TYPES.has(type)) type = "A";
    let queried = host;
    let note = "";
    const reversed = reverseIp(host);
    if (reversed && (type === "A" || type === "PTR")) {
      queried = reversed;
      type = "PTR";
      note = "That is an IPv4 address, so the shed asked for the reverse name (PTR).";
    }
    const chosen = data.fanout ? RESOLVERS : RESOLVERS.slice(0, 1);
    const rows = await Promise.all(
      chosen.map(async (resolver) => {
        const row = await askResolver(resolver.href(queried, type));
        return { resolver: resolver.label, ...row };
      }),
    );
    return { ok: true, queried, type, note, rows };
  });

function hostIn(input: unknown): { host: string } {
  const bag = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return { host: typeof bag.host === "string" ? bag.host : "" };
}

function urlIn(input: unknown): { url: string } {
  const bag = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return { url: typeof bag.url === "string" ? bag.url : "" };
}

function domainOnly(raw: string): string | null {
  const host = cleanHost(raw);
  if (!host || reverseIp(host)) return null;
  return host;
}

async function fetchJson(url: string, max = 220_000): Promise<{ status: number; data: unknown } | Fail> {
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "MXHX-Shed/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    const text = await readBounded(res, max);
    if (res.status === 404) return fail("Nothing public came back for that.");
    if (res.status === 429) return fail("That public index is busy. Try again in a minute.");
    if (!res.ok || res.status === 0) return fail(`The public index returned ${res.status}.`);
    try {
      return { status: res.status, data: JSON.parse(text) as unknown };
    } catch {
      return fail("The public index did not return readable JSON.");
    }
  } catch {
    return fail("That public index took too long.");
  }
}

function vcardName(entity: { vcardArray?: unknown; handle?: string }): string {
  const card = entity.vcardArray;
  if (Array.isArray(card) && Array.isArray(card[1])) {
    for (const row of card[1]) {
      if (Array.isArray(row) && row[0] === "fn" && typeof row[3] === "string") return row[3].slice(0, 120);
    }
  }
  return (entity.handle ?? "").slice(0, 80);
}

export const readRdap = createServerFn({ method: "POST" })
  .validator(hostIn)
  .handler(async ({ data }): Promise<RdapResult> => {
    const limited = cooled();
    if (limited) return fail(limited);
    const host = domainOnly(data.host);
    if (!host) return fail("Enter a public domain, not an address.");
    const fetched = await fetchJson(`https://rdap.org/domain/${encodeURIComponent(host)}`);
    if ("ok" in fetched) return fetched;
    const body = fetched.data;
    if (!body || typeof body !== "object") return fail("RDAP returned an empty record.");
    const record = body as {
      ldhName?: string;
      status?: string[];
      nameservers?: { ldhName?: string }[];
      events?: { eventAction?: string; eventDate?: string }[];
      entities?: { roles?: string[]; vcardArray?: unknown; handle?: string }[];
      errorCode?: number;
      title?: string;
    };
    if (record.errorCode) return fail(record.title || "No public registration for that name.");
    const want = new Set(["registration", "expiration", "last changed", "last update of rdap database", "registrar expiration"]);
    const registrar = (record.entities ?? []).find((entity) => (entity.roles ?? []).some((role) => role.toLowerCase() === "registrar"));
    return {
      ok: true,
      name: record.ldhName || host,
      statuses: (record.status ?? []).slice(0, 8),
      registrar: registrar ? vcardName(registrar) || "Registrar listed, name withheld" : "No registrar in the public record",
      events: (record.events ?? [])
        .filter((event) => event.eventAction && want.has(event.eventAction.toLowerCase()))
        .slice(0, 6)
        .map((event) => ({ action: event.eventAction ?? "", date: (event.eventDate ?? "").slice(0, 25) })),
      nameservers: (record.nameservers ?? [])
        .map((ns) => ns.ldhName ?? "")
        .filter(Boolean)
        .slice(0, 8),
    };
  });

export const readHeaders = createServerFn({ method: "POST" })
  .validator(urlIn)
  .handler(async ({ data }): Promise<HeadResult> => {
    const limited = cooled();
    if (limited) return fail(limited);
    let current: URL;
    const seeded = /^[a-z][a-z0-9+.-]*:\/\//i.test(data.url.trim()) ? data.url.trim() : `https://${data.url.trim()}`;
    try {
      current = new URL(seeded);
    } catch {
      return fail("That does not look like a URL.");
    }
    let hops = 0;
    for (let hop = 0; hop < 4; hop += 1) {
      if (current.protocol !== "http:" && current.protocol !== "https:") return fail("Only public http and https.");
      if (current.username || current.password) return fail("Drop the username and password from the URL.");
      if (current.port && current.port !== "80" && current.port !== "443") return fail("The shed only reads the usual web ports.");
      const blocked = hostBlocked(current.hostname);
      if (blocked) return fail(blocked);
      let res: Response;
      try {
        res = await fetch(current, {
          method: "HEAD",
          redirect: "manual",
          headers: { accept: "*/*", "user-agent": "MXHX-Shed/1.0 (header read)" },
          signal: AbortSignal.timeout(8000),
        });
        if (res.status === 405 || res.status === 501) {
          await res.body?.cancel().catch(() => undefined);
          res = await fetch(current, {
            method: "GET",
            redirect: "manual",
            headers: { accept: "*/*", "user-agent": "MXHX-Shed/1.0 (header read)" },
            signal: AbortSignal.timeout(8000),
          });
        }
      } catch {
        return fail("That host took too long, or did not answer.");
      }
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        await res.body?.cancel().catch(() => undefined);
        if (!loc) return fail("The redirect had nowhere to go.");
        current = new URL(loc, current);
        hops += 1;
        continue;
      }
      const keep = [
        "server",
        "content-type",
        "strict-transport-security",
        "content-security-policy",
        "x-frame-options",
        "x-content-type-options",
        "referrer-policy",
        "permissions-policy",
        "cache-control",
      ];
      const headers = keep
        .map((name) => {
          const value = res.headers.get(name);
          return value ? { name, value: value.slice(0, 180) } : null;
        })
        .filter((row): row is { name: string; value: string } => Boolean(row));
      const rawCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
      const cookies = rawCookies
        .map((cookie) => (cookie.split("=")[0] ?? "").trim())
        .filter(Boolean)
        .slice(0, 8);
      await res.body?.cancel().catch(() => undefined);
      const has = (name: string) => headers.some((row) => row.name === name);
      const notes = [
        current.protocol === "https:" ? "The final address is HTTPS." : "The final address is plain HTTP.",
        has("strict-transport-security") ? "HSTS is published." : "No HSTS header on this response.",
        has("content-security-policy") ? "A content security policy is published." : "No content security policy on this response.",
        hops ? `Followed ${hops} redirect${hops === 1 ? "" : "s"}.` : "No redirect.",
      ];
      return { ok: true, url: current.href, status: res.status, hops, headers, cookies, notes };
    }
    return fail("Too many redirects.");
  });

function issuerShort(raw: string): string {
  const org = raw.match(/O=([^,]+)/);
  return (org?.[1] ?? raw).replace(/\\,/g, ",").slice(0, 80);
}

export const readCerts = createServerFn({ method: "POST" })
  .validator(hostIn)
  .handler(async ({ data }): Promise<CertResult> => {
    const limited = cooled();
    if (limited) return fail(limited);
    const host = domainOnly(data.host);
    if (!host) return fail("Enter a public domain, not an address.");
    const spot = await fetchJson(
      `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(host)}&include_subdomains=false&expand=dns_names&expand=issuer`,
    );
    if (!("ok" in spot) && Array.isArray(spot.data)) {
      const rows = spot.data.slice(0, 8).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as { dns_names?: string[]; issuer?: { friendly_name?: string }; not_before?: string; not_after?: string };
        const names = (row.dns_names ?? []).filter((name) => typeof name === "string").slice(0, 6);
        return [
          {
            name: (names[0] || host).slice(0, 120),
            names,
            issuer: (row.issuer?.friendly_name ?? "").slice(0, 80),
            notBefore: (row.not_before ?? "").slice(0, 25),
            notAfter: (row.not_after ?? "").slice(0, 25),
          },
        ];
      });
      return { ok: true, query: host, rows, extra: Math.max(0, spot.data.length - rows.length) };
    }
    const fetched = await fetchJson(`https://crt.sh/?q=${encodeURIComponent(host)}&output=json`, 400_000);
    if ("ok" in fetched) return spot && "ok" in spot ? spot : fetched;
    if (!Array.isArray(fetched.data)) return fail("The certificate index returned an unexpected shape.");
    const seen = new Set<string>();
    const rows: { name: string; names: string[]; issuer: string; notBefore: string; notAfter: string }[] = [];
    for (const item of fetched.data) {
      if (!item || typeof item !== "object") continue;
      const row = item as { common_name?: string; name_value?: string; issuer_name?: string; not_before?: string; not_after?: string };
      const name = (row.common_name || host).slice(0, 120);
      const key = `${name}|${row.not_after ?? ""}|${row.issuer_name ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (rows.length >= 8) continue;
      const names = Array.from(
        new Set(
          String(row.name_value ?? "")
            .split("\n")
            .map((part) => part.trim())
            .filter(Boolean),
        ),
      ).slice(0, 6);
      rows.push({
        name,
        names,
        issuer: issuerShort(row.issuer_name ?? ""),
        notBefore: (row.not_before ?? "").slice(0, 25),
        notAfter: (row.not_after ?? "").slice(0, 25),
      });
    }
    return { ok: true, query: host, rows, extra: Math.max(0, seen.size - rows.length) };
  });

export const readRoute = createServerFn({ method: "POST" })
  .validator(hostIn)
  .handler(async ({ data }): Promise<RouteResult> => {
    const limited = cooled();
    if (limited) return fail(limited);
    const host = cleanHost(data.host);
    if (!host) return fail("Enter a public domain or an IPv4 address.");
    const blocked = hostBlocked(host);
    if (blocked) return fail(blocked);
    let address = host;
    if (!reverseIp(host)) {
      const looked = await askResolver(RESOLVERS[0].href(host, "A"));
      const found = looked.answers.map((row) => row.data.trim()).find((item) => /^\d{1,3}(\.\d{1,3}){3}$/.test(item));
      if (!found) return fail("No public IPv4 address came back for that name.");
      const denied = hostBlocked(found);
      if (denied) return fail(denied);
      address = found;
    }
    const fetched = await fetchJson(`https://stat.ripe.net/data/prefix-overview/data.json?resource=${encodeURIComponent(address)}`);
    if ("ok" in fetched) return fetched;
    const record = fetched.data as {
      data?: {
        announced?: boolean;
        resource?: string;
        asns?: { asn?: number; holder?: string }[];
        block?: { resource?: string };
      };
    };
    const first = record.data?.asns?.[0];
    return {
      ok: true,
      query: host,
      address,
      prefix: record.data?.resource || record.data?.block?.resource || "No covering prefix published",
      asn: first?.asn ? `AS${first.asn}` : "No ASN on that prefix",
      holder: (first?.holder ?? "No holder name published").slice(0, 160),
      announced: Boolean(record.data?.announced),
    };
  });

async function fetchNoted(url: string): Promise<{ status: number; body: string }> {
  try {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { accept: "text/plain", "user-agent": "MXHX-Shed/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status >= 300 && res.status < 400) {
      await res.body?.cancel().catch(() => undefined);
      return { status: res.status, body: "That file redirected. The shed does not follow it." };
    }
    const body = await readBounded(res, 12_000);
    return { status: res.status, body: body.split("\n").slice(0, 40).join("\n").slice(0, 4000) };
  } catch {
    return { status: 0, body: "" };
  }
}

export const readRobots = createServerFn({ method: "POST" })
  .validator(hostIn)
  .handler(async ({ data }): Promise<RobotsResult> => {
    const limited = cooled();
    if (limited) return fail(limited);
    const host = domainOnly(data.host);
    if (!host) return fail("Enter a public domain, not an address.");
    const blocked = hostBlocked(host);
    if (blocked) return fail(blocked);
    const [robots, security] = await Promise.all([
      fetchNoted(`https://${host}/robots.txt`),
      fetchNoted(`https://${host}/.well-known/security.txt`),
    ]);
    if (robots.status === 0 && security.status === 0) return fail("That host took too long, or did not answer.");
    return {
      ok: true,
      host,
      robotsStatus: robots.status,
      robots: robots.body || (robots.status === 404 ? "No robots.txt." : ""),
      securityStatus: security.status,
      security: security.body || (security.status === 404 ? "No security.txt." : ""),
    };
  });

