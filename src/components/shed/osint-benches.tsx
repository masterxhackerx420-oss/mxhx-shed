import { useState } from "react";
import { readCerts, readHeaders, readRdap, readRobots, readRoute } from "@/lib/shed/live";
import { useStamps } from "@/lib/shed/stamps";
import type { CertSnap, HeadSnap, RdapSnap, RobotsSnap, RouteSnap } from "@/lib/shed/types";
import { Alert, BenchFrame, Button, Field, Well } from "@/components/shed/ui";

const RDAP_STEPS = [
  { id: "rdap-read", tier: "Beginner", label: "Read a public registration" },
  { id: "rdap-ns", tier: "Operator", label: "See the nameservers" },
  { id: "rdap-god", tier: "God mode", label: "Catch an expiration date" },
];

const HEAD_STEPS = [
  { id: "head-read", tier: "Beginner", label: "Read response headers" },
  { id: "head-secure", tier: "Operator", label: "Find HSTS or a content policy" },
  { id: "head-god", tier: "God mode", label: "Follow a redirect" },
];

const CERT_STEPS = [
  { id: "cert-read", tier: "Beginner", label: "Find a public certificate" },
  { id: "cert-names", tier: "Operator", label: "See more than one name" },
  { id: "cert-god", tier: "God mode", label: "Read the issuer" },
];

const ROUTE_STEPS = [
  { id: "route-read", tier: "Beginner", label: "Read a prefix" },
  { id: "route-asn", tier: "Operator", label: "Name the ASN" },
  { id: "route-god", tier: "God mode", label: "Start from a domain" },
];

const ROBOT_STEPS = [
  { id: "robots-read", tier: "Beginner", label: "Read robots.txt" },
  { id: "robots-sec", tier: "Operator", label: "Find security.txt" },
  { id: "robots-god", tier: "God mode", label: "See both files" },
];

export function RdapBench() {
  const { mark } = useStamps();
  const [host, setHost] = useState("example.com");
  const [snap, setSnap] = useState<RdapSnap | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(next: string) {
    setBusy(true);
    setError("");
    try {
      const res = await readRdap({ data: { host: next } });
      if (!res.ok) setError(res.error);
      else {
        setSnap(res);
        setHost(next);
        mark("rdap-read");
        if (res.nameservers.length) mark("rdap-ns");
        if (res.events.some((event) => /expir/i.test(event.action))) mark("rdap-god");
      }
    } catch {
      setError("The shed lost that request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BenchFrame id="rdap" steps={RDAP_STEPS}>
      <p className="text-sm text-mute">Public registration only. Registrar, dates, status, and nameservers. Not the people behind the name.</p>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(host);
        }}
      >
        <Field label="Domain" value={host} onChange={(event) => setHost(event.target.value)} placeholder="example.com" spellCheck={false} autoCapitalize="off" />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Reading…" : "Read RDAP"}
          </Button>
          <Button type="button" tone="ghost" disabled={busy} onClick={() => void run("iana.org")}>
            Try iana.org
          </Button>
        </div>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      {snap ? (
        <Well>
          <p className="font-mono text-sm text-gold">{snap.name}</p>
          <p className="mt-2 text-sm text-bone">Registrar · {snap.registrar}</p>
          {snap.statuses.length ? <p className="mt-2 text-sm text-mute">{snap.statuses.join(" · ")}</p> : null}
          <ul className="mt-3">
            {snap.events.map((event) => (
              <li key={`${event.action}-${event.date}`} className="border-t border-line py-2 text-sm">
                <span className="text-gold">{event.action}</span> <span className="text-bone">{event.date}</span>
              </li>
            ))}
          </ul>
          {snap.nameservers.length ? (
            <ul className="mt-2">
              {snap.nameservers.map((ns) => (
                <li key={ns} className="font-mono text-sm text-bone">
                  {ns}
                </li>
              ))}
            </ul>
          ) : null}
        </Well>
      ) : null}
    </BenchFrame>
  );
}

export function HeadBench() {
  const { mark } = useStamps();
  const [url, setUrl] = useState("https://example.com");
  const [snap, setSnap] = useState<HeadSnap | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(next: string) {
    setBusy(true);
    setError("");
    try {
      const res = await readHeaders({ data: { url: next } });
      if (!res.ok) setError(res.error);
      else {
        setSnap(res);
        setUrl(next);
        mark("head-read");
        if (res.headers.some((row) => row.name === "strict-transport-security" || row.name === "content-security-policy")) mark("head-secure");
        if (res.hops > 0) mark("head-god");
      }
    } catch {
      setError("The shed lost that request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BenchFrame id="head" steps={HEAD_STEPS}>
      <p className="text-sm text-mute">Headers only. Cookie values stay on the server that set them. Names, if any, are enough.</p>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(url);
        }}
      >
        <Field label="Public URL" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" spellCheck={false} autoCapitalize="off" />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Reading…" : "Read headers"}
          </Button>
          <Button type="button" tone="ghost" disabled={busy} onClick={() => void run("https://github.com")}>
            Try github.com
          </Button>
        </div>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      {snap ? (
        <Well>
          <p className="font-mono text-sm text-gold">
            {snap.status} · {snap.url}
          </p>
          <ul className="mt-2">
            {snap.notes.map((note) => (
              <li key={note} className="text-sm text-bone">
                {note}
              </li>
            ))}
          </ul>
          <ul className="mt-3">
            {snap.headers.map((row) => (
              <li key={row.name} className="border-t border-line py-2">
                <p className="font-mono text-xs text-gold">{row.name}</p>
                <p className="break-all font-mono text-sm text-bone">{row.value}</p>
              </li>
            ))}
          </ul>
          {snap.cookies.length ? <p className="mt-2 text-sm text-mute">Cookie names · {snap.cookies.join(", ")}</p> : null}
        </Well>
      ) : null}
    </BenchFrame>
  );
}

export function CertBench() {
  const { mark } = useStamps();
  const [host, setHost] = useState("example.com");
  const [snap, setSnap] = useState<CertSnap | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(next: string) {
    setBusy(true);
    setError("");
    try {
      const res = await readCerts({ data: { host: next } });
      if (!res.ok) setError(res.error);
      else {
        setSnap(res);
        setHost(next);
        if (res.rows.length) mark("cert-read");
        if (res.rows.some((row) => row.names.length > 1)) mark("cert-names");
        if (res.rows.some((row) => row.issuer)) mark("cert-god");
      }
    } catch {
      setError("The shed lost that request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BenchFrame id="cert" steps={CERT_STEPS}>
      <p className="text-sm text-mute">Names already published in the certificate transparency log. Not a private key, not a scan.</p>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(host);
        }}
      >
        <Field label="Domain" value={host} onChange={(event) => setHost(event.target.value)} placeholder="example.com" spellCheck={false} autoCapitalize="off" />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Searching…" : "Search certs"}
          </Button>
          <Button type="button" tone="ghost" disabled={busy} onClick={() => void run("cloudflare.com")}>
            Try cloudflare.com
          </Button>
        </div>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      {snap ? (
        <Well>
          <p className="text-sm text-mute">
            {snap.rows.length} shown{snap.extra ? ` · ${snap.extra} more in the index` : ""} · {snap.query}
          </p>
          <ul>
            {snap.rows.map((row) => (
              <li key={`${row.name}-${row.notAfter}-${row.issuer}`} className="border-t border-line py-3">
                <p className="font-mono text-sm text-gold">{row.name}</p>
                <p className="text-sm text-bone">{row.issuer || "Issuer not listed"}</p>
                <p className="text-sm text-mute">
                  {row.notBefore} → {row.notAfter}
                </p>
                {row.names.length ? <p className="break-all font-mono text-xs text-mute">{row.names.join(" · ")}</p> : null}
              </li>
            ))}
          </ul>
          {snap.rows.length === 0 ? <p className="text-sm text-bone">No public certificates indexed for that exact name.</p> : null}
        </Well>
      ) : null}
    </BenchFrame>
  );
}

export function RouteBench() {
  const { mark } = useStamps();
  const [host, setHost] = useState("1.1.1.1");
  const [snap, setSnap] = useState<RouteSnap | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(next: string) {
    setBusy(true);
    setError("");
    try {
      const res = await readRoute({ data: { host: next } });
      if (!res.ok) setError(res.error);
      else {
        setSnap(res);
        setHost(next);
        mark("route-read");
        if (res.asn.startsWith("AS")) mark("route-asn");
        if (res.query !== res.address) mark("route-god");
      }
    } catch {
      setError("The shed lost that request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BenchFrame id="route" steps={ROUTE_STEPS}>
      <p className="text-sm text-mute">Public routing data. A domain is resolved first, then the prefix and the network that announces it.</p>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(host);
        }}
      >
        <Field label="Domain or IPv4" value={host} onChange={(event) => setHost(event.target.value)} placeholder="1.1.1.1" spellCheck={false} autoCapitalize="off" />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Tracing…" : "Read route"}
          </Button>
          <Button type="button" tone="ghost" disabled={busy} onClick={() => void run("cloudflare.com")}>
            Try cloudflare.com
          </Button>
        </div>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      {snap ? (
        <Well>
          <p className="font-mono text-sm text-gold">{snap.asn}</p>
          <p className="mt-1 text-sm text-bone">{snap.holder}</p>
          <p className="mt-2 font-mono text-sm text-mute">
            {snap.query} → {snap.address} · {snap.prefix}
          </p>
          <p className="mt-1 text-sm text-mute">{snap.announced ? "This prefix is announced." : "No announcement flag on this answer."}</p>
        </Well>
      ) : null}
    </BenchFrame>
  );
}

export function RobotsBench() {
  const { mark } = useStamps();
  const [host, setHost] = useState("example.com");
  const [snap, setSnap] = useState<RobotsSnap | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(next: string) {
    setBusy(true);
    setError("");
    try {
      const res = await readRobots({ data: { host: next } });
      if (!res.ok) setError(res.error);
      else {
        setSnap(res);
        setHost(next);
        if (res.robotsStatus === 200) mark("robots-read");
        if (res.securityStatus === 200) mark("robots-sec");
        if (res.robotsStatus === 200 && res.securityStatus === 200) mark("robots-god");
      }
    } catch {
      setError("The shed lost that request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BenchFrame id="robots" steps={ROBOT_STEPS}>
      <p className="text-sm text-mute">Two files sites publish on purpose. robots.txt for crawlers. security.txt for people who find a bug.</p>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(host);
        }}
      >
        <Field label="Domain" value={host} onChange={(event) => setHost(event.target.value)} placeholder="example.com" spellCheck={false} autoCapitalize="off" />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Fetching…" : "Read both"}
          </Button>
          <Button type="button" tone="ghost" disabled={busy} onClick={() => void run("github.com")}>
            Try github.com
          </Button>
        </div>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      {snap ? (
        <div className="grid gap-3">
          <Well>
            <p className="font-mono text-sm text-gold">robots.txt · {snap.robotsStatus || "down"}</p>
            <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap text-bone">{snap.robots || "Empty."}</pre>
          </Well>
          <Well>
            <p className="font-mono text-sm text-gold">security.txt · {snap.securityStatus || "down"}</p>
            <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap text-bone">{snap.security || "Empty."}</pre>
          </Well>
        </div>
      ) : null}
    </BenchFrame>
  );
}
