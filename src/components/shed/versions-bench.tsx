import { useEffect, useState, type FormEvent } from "react";
import { compareRefs, readGithub, readNpm } from "@/lib/shed/live";
import { cmpSemVer, parseSemVer, partsLabel, satisfiesRange } from "@/lib/shed/semver";
import { useStamps } from "@/lib/shed/stamps";
import type { CompareSnap, GithubResult, GithubSnap, NpmResult, NpmSnap } from "@/lib/shed/types";
import { Alert, BenchFrame, Button, Field, ReadmeLibrary, Well, when } from "@/components/shed/ui";

type Watch = {
  kind: "github" | "npm";
  target: string;
  baseline: string;
  moved: boolean;
  ticks: number;
};

const STEPS = [
  { id: "versions-read", tier: "Beginner", label: "Read a public repository" },
  { id: "versions-pkg", tier: "Operator", label: "Read a package's live version" },
  { id: "versions-god", tier: "God mode", label: "Compare two versions, or arm a live watch" },
];

export function VersionsBench() {
  const { mark } = useStamps();
  const [tab, setTab] = useState<"repo" | "pkg" | "semver">("repo");
  const [repo, setRepo] = useState("tanstack/router");
  const [pkgName, setPkgName] = useState("vite");
  const [base, setBase] = useState("");
  const [head, setHead] = useState("");
  const [left, setLeft] = useState("1.4.2");
  const [right, setRight] = useState("1.5.0-beta.1");
  const [range, setRange] = useState("^1.4.0");
  const [semverNote, setSemverNote] = useState("");
  const [snap, setSnap] = useState<GithubSnap | null>(null);
  const [pkg, setPkg] = useState<NpmSnap | null>(null);
  const [diff, setDiff] = useState<CompareSnap | null>(null);
  const [watch, setWatch] = useState<Watch | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function digest(res: GithubResult | NpmResult) {
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError("");
    if ("commits" in res) setSnap(res);
    if ("latest" in res) setPkg(res);
    setWatch((current) => {
      if (!current) return current;
      return {
        ...current,
        ticks: current.ticks + 1,
        moved: current.moved || res.mark !== current.baseline,
      };
    });
  }

  useEffect(() => {
    if (!watch || watch.ticks >= 8) return;
    let alive = true;
    const id = window.setTimeout(() => {
      void (async () => {
        const res =
          watch.kind === "github"
            ? await readGithub({ data: { repo: watch.target } })
            : await readNpm({ data: { name: watch.target } });
        if (!alive) return;
        digest(res);
      })();
    }, 18000);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [watch]);

  async function loadRepo(value: string) {
    setBusy(true);
    setError("");
    setDiff(null);
    try {
      const res = await readGithub({ data: { repo: value } });
      if (!res.ok) setError(res.error);
      else {
        setSnap(res);
        setRepo(res.fullName);
        if (!base) setBase(res.tags[0] ?? res.latestRelease?.tag ?? res.defaultBranch);
        if (!head) setHead(res.defaultBranch);
        mark("versions-read");
      }
    } catch {
      setError("The shed lost that request.");
    } finally {
      setBusy(false);
    }
  }

  async function loadPkg(value: string) {
    setBusy(true);
    setError("");
    try {
      const res = await readNpm({ data: { name: value } });
      if (!res.ok) setError(res.error);
      else {
        setPkg(res);
        setPkgName(res.name);
        mark("versions-pkg");
      }
    } catch {
      setError("The shed lost that request.");
    } finally {
      setBusy(false);
    }
  }

  async function onCompare(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await compareRefs({ data: { repo, base, head } });
      if (!res.ok) setError(res.error);
      else {
        setDiff(res);
        mark("versions-god");
      }
    } catch {
      setError("The shed lost that request.");
    } finally {
      setBusy(false);
    }
  }

  function readSemver(event: React.FormEvent) {
    event.preventDefault();
    const a = parseSemVer(left);
    const b = parseSemVer(right);
    if (!a || !b) {
      setSemverNote("Both versions need major.minor.patch. A leading v is fine. Prerelease and build tags are optional.");
      return;
    }
    const order = cmpSemVer(a, b);
    const which = order === 0 ? "They are the same version." : order < 0 ? `${a.raw} is older than ${b.raw}.` : `${a.raw} is newer than ${b.raw}.`;
    const band = satisfiesRange(a, range);
    const rangeLine = band ? `${a.raw} ${band.ok ? "satisfies" : "does not satisfy"} ${range}. ${band.reason}` : "";
    setSemverNote(`${partsLabel(a)}. ${which} ${rangeLine}`.trim());
    mark("versions-god");
  }

  async function lookNow() {
    if (!watch) return;
    setBusy(true);
    const res =
      watch.kind === "github"
        ? await readGithub({ data: { repo: watch.target } })
        : await readNpm({ data: { name: watch.target } });
    digest(res);
    setBusy(false);
  }

  return (
    <BenchFrame id="versions" steps={STEPS}>
      <p className="text-sm text-mute">
        Public repositories and the public npm registry. A live watch polls while this bench is open, then stops itself.
      </p>
      <div className="flex flex-wrap gap-2" role="tablist">
        {(
          [
            ["repo", "Repository"],
            ["pkg", "Package"],
            ["semver", "Semver"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-11 rounded-md px-4 text-sm font-semibold ring-1 ${tab === id ? "bg-gold text-soot ring-gold" : "text-bone ring-line"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "repo" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void loadRepo(repo);
          }}
        >
          <Field label="Repository" value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="owner/name" spellCheck={false} autoCapitalize="off" />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Reading…" : "Read repo"}
            </Button>
            <Button type="button" tone="ghost" disabled={busy} onClick={() => void loadRepo("tanstack/router")}>
              Try tanstack/router
            </Button>
          </div>
        </form>
      ) : null}

      {tab === "pkg" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void loadPkg(pkgName);
          }}
        >
          <Field label="Package" value={pkgName} onChange={(event) => setPkgName(event.target.value)} placeholder="vite" spellCheck={false} autoCapitalize="off" />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Reading…" : "Read package"}
            </Button>
            <Button type="button" tone="ghost" disabled={busy} onClick={() => void loadPkg("vite")}>
              Try vite
            </Button>
          </div>
        </form>
      ) : null}

      {tab === "semver" ? (
        <form className="grid gap-3" onSubmit={readSemver}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Version A" value={left} onChange={(event) => setLeft(event.target.value)} spellCheck={false} />
            <Field label="Version B" value={right} onChange={(event) => setRight(event.target.value)} spellCheck={false} />
            <Field label="Range for A" value={range} onChange={(event) => setRange(event.target.value)} spellCheck={false} />
          </div>
          <Button type="submit">Read the versions</Button>
          {semverNote ? <Well><p className="text-sm text-bone">{semverNote}</p></Well> : null}
          <p className="text-sm text-mute">Caret ^1.2.3 stays inside 1.x. Tilde ~1.2.3 stays inside 1.2.x. Build metadata is ignored.</p>
        </form>
      ) : null}

      {error ? <Alert>{error}</Alert> : null}

      {watch ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-soot px-3 py-3 ring-1 ring-gold">
          <span className="live-dot inline-block size-2 rounded-full bg-gold" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="text-gold">{watch.ticks >= 8 ? "Watch ended." : watch.moved ? "It moved." : "Holding still."}</p>
            <p className="truncate text-mute">
              Look {watch.ticks} of 8 · {watch.target}
            </p>
          </div>
          <Button type="button" tone="ghost" disabled={busy || watch.ticks >= 8} onClick={() => void lookNow()}>
            Look now
          </Button>
          <Button type="button" tone="ghost" onClick={() => setWatch(null)}>
            Stop
          </Button>
        </div>
      ) : null}

      {tab === "repo" && snap ? (
        <div className="flex flex-col gap-4">
          <Well>
            <p className="font-display text-2xl text-gold">{snap.fullName}</p>
            {snap.description ? <p className="mt-2 text-sm text-bone">{snap.description}</p> : null}
            <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["Stars", snap.stars.toLocaleString()],
                  ["Forks", snap.forks.toLocaleString()],
                  ["Issues", snap.openIssues.toLocaleString()],
                  ["Language", snap.language ?? "—"],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-md bg-ink px-3 py-3 ring-1 ring-line">
                  <dt className="text-xs text-mute">{label}</dt>
                  <dd className="font-display text-2xl text-gold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-mute">
              Stars are bookmarks, not a grade. The short hash is a fingerprint of the latest commit. If it changes, the code changed.
              {snap.license ? ` License: ${snap.license}.` : ""} Pushed {when(snap.pushedAt)}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a className="inline-flex min-h-11 items-center text-sm text-gold underline-offset-2 hover:underline" href={snap.htmlUrl} target="_blank" rel="noreferrer">
                Open on GitHub
              </a>
              <Button
                type="button"
                tone="ghost"
                onClick={() => {
                  setWatch({ kind: "github", target: snap.fullName, baseline: snap.mark, moved: false, ticks: 0 });
                  mark("versions-god");
                }}
              >
                Arm live watch
              </Button>
            </div>
          </Well>
          <Well>
            <p className="font-display text-lg text-gold">Latest release</p>
            {snap.latestRelease ? (
              <>
                <p className="mt-2 font-mono text-bone">{snap.latestRelease.tag}</p>
                <p className="text-sm text-mute">{snap.latestRelease.name} · {when(snap.latestRelease.publishedAt)}</p>
                {snap.latestRelease.body ? <p className="mt-2 text-sm text-bone">{snap.latestRelease.body}</p> : null}
              </>
            ) : (
              <p className="mt-2 text-sm text-mute">No GitHub release on this repo yet. Tags may still exist.</p>
            )}
          </Well>
          <Well>
            <p className="font-display text-lg text-gold">Recent commits</p>
            <ul className="mt-2">
              {snap.commits.map((commit) => (
                <li key={commit.sha} className="border-t border-line py-2">
                  <a className="font-mono text-sm text-gold" href={commit.url} target="_blank" rel="noreferrer">
                    {commit.sha}
                  </a>
                  <p className="text-sm text-bone">{commit.message}</p>
                  <p className="text-xs text-mute">
                    {commit.author} · {when(commit.date)}
                  </p>
                </li>
              ))}
            </ul>
          </Well>
          <form className="grid gap-3" onSubmit={(event) => void onCompare(event)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Base ref" value={base} onChange={(event) => setBase(event.target.value)} spellCheck={false} />
              <Field label="Head ref" value={head} onChange={(event) => setHead(event.target.value)} spellCheck={false} />
            </div>
            {snap.tags.length ? (
              <div className="flex flex-wrap gap-2">
                {snap.tags.map((tag) => (
                  <button key={tag} type="button" className="min-h-11 rounded-md px-3 font-mono text-xs text-bone ring-1 ring-line" onClick={() => setBase(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}
            <Button type="submit" disabled={busy}>
              Compare refs
            </Button>
          </form>
          {diff ? (
            <Well>
              <p className="font-display text-lg text-gold">{diff.status}</p>
              <p className="text-sm text-mute">
                Ahead {diff.ahead} · behind {diff.behind} · {diff.total} commits in the range
              </p>
              <ul className="mt-3">
                {diff.files.map((file) => (
                  <li key={file.name} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line py-2 text-sm">
                    <span className="min-w-0 break-all text-bone">{file.name}</span>
                    <span className="font-mono text-mute tabular-nums">
                      {file.status} +{file.additions} −{file.deletions}
                    </span>
                  </li>
                ))}
              </ul>
            </Well>
          ) : null}
        </div>
      ) : null}

      {tab === "pkg" && pkg ? (
        <Well>
          <p className="font-display text-2xl text-gold">{pkg.name}</p>
          {pkg.description ? <p className="mt-2 text-sm text-bone">{pkg.description}</p> : null}
          <p className="mt-3 font-mono text-lg text-gold">{pkg.latest}</p>
          <p className="text-sm text-mute">
            dist-tag latest. This is the version npm installs when you do not pin one. Published {when(pkg.publishedAt)}.
            {pkg.license ? ` License: ${pkg.license}.` : ""}
          </p>
          {pkg.homepage ? (
            <a className="mt-2 inline-flex min-h-11 items-center text-sm text-gold underline-offset-2 hover:underline" href={pkg.homepage} target="_blank" rel="noreferrer">
              Project page
            </a>
          ) : null}
          <ul className="mt-3">
            {pkg.recent.map((row) => (
              <li key={row.version} className="flex items-baseline justify-between gap-3 border-t border-line py-2 text-sm">
                <span className="font-mono text-gold">{row.version}</span>
                <span className="text-mute">{when(row.time)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Button
              type="button"
              tone="ghost"
              onClick={() => {
                setWatch({ kind: "npm", target: pkg.name, baseline: pkg.mark, moved: false, ticks: 0 });
                mark("versions-god");
              }}
            >
              Arm live watch
            </Button>
          </div>
        </Well>
      ) : null}

      <ReadmeLibrary />
    </BenchFrame>
  );
}
