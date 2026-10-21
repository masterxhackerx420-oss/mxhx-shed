import { useState } from "react";
import { lookupDns } from "@/lib/shed/live";
import { useStamps } from "@/lib/shed/stamps";
import type { DnsSnap } from "@/lib/shed/types";
import { Alert, BenchFrame, Button, Field, Well } from "@/components/shed/ui";

const TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "CAA"] as const;

const ABOUT: Record<string, string> = {
  A: "An A record is the IPv4 address a name points at.",
  AAAA: "AAAA is the IPv6 address. Same idea, longer number.",
  MX: "MX is where mail for the name should go, with a preference number in front.",
  TXT: "TXT is a note. Sites use it to publish SPF and to prove they control the name.",
  NS: "NS names the server that is supposed to know the rest of the answers.",
  CNAME: "CNAME is an alias. The name points at another name, not an address.",
  SOA: "SOA is the start of authority: the primary server and a few timers.",
  CAA: "CAA says which certificate companies may mint HTTPS certs for the name.",
  PTR: "PTR is the reverse question, from an address back toward a name.",
};

const STEPS = [
  { id: "dns-read", tier: "Beginner", label: "Ask for an address" },
  { id: "dns-mx", tier: "Operator", label: "Read MX or TXT" },
  { id: "dns-god", tier: "God mode", label: "Ask three resolvers" },
];

export function DnsBench() {
  const { mark } = useStamps();
  const [host, setHost] = useState("cloudflare.com");
  const [type, setType] = useState<(typeof TYPES)[number] | "PTR">("A");
  const [snap, setSnap] = useState<DnsSnap | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(nextHost: string, nextType: string, fanout: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await lookupDns({ data: { host: nextHost, type: nextType, fanout } });
      if (!res.ok) setError(res.error);
      else {
        setSnap(res);
        setHost(nextHost);
        if (res.type === "PTR") setType("PTR");
        mark("dns-read");
        if (res.type === "MX" || res.type === "TXT") mark("dns-mx");
        if (fanout) mark("dns-god");
      }
    } catch {
      setError("The shed lost that request.");
    } finally {
      setBusy(false);
    }
  }

  const signatures = snap?.rows.filter((row) => !row.error).map((row) => `${row.status}:${row.answers.map((item) => item.data).sort().join("|")}`) ?? [];
  const agreement =
    signatures.length < 2 ? "" : signatures.every((item) => item === signatures[0]) ? "These resolvers agree." : "These resolvers do not match. Cache, a recent change, or a split view can do that.";

  return (
    <BenchFrame id="dns" steps={STEPS}>
      <p className="text-sm text-mute">Public resolvers only. Cloudflare, Google, and Quad9.</p>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(host, type, false);
        }}
      >
        <Field label="Host" value={host} onChange={(event) => setHost(event.target.value)} placeholder="cloudflare.com" spellCheck={false} autoCapitalize="off" />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Record type">
          {TYPES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={type === item}
              onClick={() => setType(item)}
              className={`min-h-11 rounded-md px-3 font-mono text-sm ring-1 ${type === item ? "bg-gold text-soot ring-gold" : "text-bone ring-line"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Asking…" : "Ask Cloudflare"}
          </Button>
          <Button type="button" tone="ghost" disabled={busy} onClick={() => void run("cloudflare.com", "A", false)}>
            Try cloudflare.com
          </Button>
          <Button type="button" tone="ghost" disabled={busy} onClick={() => { setType("MX"); void run(host, "MX", false); }}>
            Mail records
          </Button>
          <Button type="button" tone="ghost" disabled={busy} onClick={() => void run(host, type, true)}>
            Three resolvers
          </Button>
        </div>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      {snap ? (
        <Well>
          <p className="font-mono text-sm text-gold">
            {snap.type} {snap.queried}
          </p>
          {snap.note ? <p className="mt-2 text-sm text-bone">{snap.note}</p> : null}
          <p className="mt-2 text-sm text-mute">{ABOUT[snap.type] ?? "A DNS answer from a public resolver."}</p>
          {agreement ? <p className="mt-2 text-sm text-bone">{agreement}</p> : null}
          <ul className="mt-3">
            {snap.rows.map((row) => (
              <li key={row.resolver} className="border-t border-line py-3">
                <p className="text-sm text-gold">
                  {row.resolver} · {row.status}
                </p>
                {row.error ? <p className="text-sm text-mute">{row.error}</p> : null}
                {row.answers.length ? (
                  <ul className="mt-1">
                    {row.answers.map((answer, index) => (
                      <li key={`${answer.data}-${index}`} className="break-all font-mono text-sm text-bone">
                        {answer.data}
                        <span className="text-mute"> · ttl {answer.ttl}</span>
                      </li>
                    ))}
                  </ul>
                ) : row.error ? null : (
                  <p className="text-sm text-mute">No answer in this section.</p>
                )}
              </li>
            ))}
          </ul>
        </Well>
      ) : null}
    </BenchFrame>
  );
}
