import { useState } from "react";
import { scrapeUrl } from "@/lib/shed/live";
import { useStamps } from "@/lib/shed/stamps";
import type { ScrapeSnap } from "@/lib/shed/types";
import { Alert, BenchFrame, Button, Field, Well } from "@/components/shed/ui";

const STEPS = [
  { id: "scrape-read", tier: "Beginner", label: "Fetch one public page" },
  { id: "scrape-links", tier: "Operator", label: "Read its links and published strings" },
  { id: "scrape-god", tier: "God mode", label: "Run a CSS selector" },
];

export function ScrapeBench() {
  const { mark } = useStamps();
  const [url, setUrl] = useState("https://example.com");
  const [selector, setSelector] = useState("");
  const [snap, setSnap] = useState<ScrapeSnap | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(nextUrl: string, nextSelector = selector) {
    setBusy(true);
    setError("");
    try {
      const res = await scrapeUrl({ data: { url: nextUrl, selector: nextSelector } });
      if (!res.ok) setError(res.error);
      else {
        setSnap(res);
        setUrl(nextUrl);
        mark("scrape-read");
        if (res.links.length || res.emails.length || res.tels.length) mark("scrape-links");
        if (nextSelector.trim()) mark("scrape-god");
      }
    } catch {
      setError("The shed lost that request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BenchFrame id="scrape" steps={STEPS}>
      <p className="text-sm text-mute">One public page. No login, no private network, no crawl.</p>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(url);
        }}
      >
        <Field label="Page" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" spellCheck={false} autoCapitalize="off" />
        <Field label="CSS selector, optional" value={selector} onChange={(event) => setSelector(event.target.value)} placeholder="h1, a" spellCheck={false} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Fetching…" : "Fetch page"}
          </Button>
          <Button type="button" tone="ghost" disabled={busy} onClick={() => void run("https://example.com", selector)}>
            Try example.com
          </Button>
        </div>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      {snap ? (
        <div className="flex flex-col gap-4">
          <Well>
            <p className="text-xs text-mute">
              {snap.status} · {snap.contentType} · {snap.bytes.toLocaleString()} bytes
            </p>
            <p className="mt-1 font-display text-2xl text-gold">{snap.title}</p>
            <p className="mt-1 break-all text-sm text-mute">{snap.url}</p>
            {snap.description ? <p className="mt-2 text-sm text-bone">{snap.description}</p> : null}
            {snap.kinds.length ? <p className="mt-2 text-sm text-mute">Structured data: {snap.kinds.join(", ")}</p> : null}
          </Well>
          {snap.headings.length ? (
            <Well>
              <p className="font-display text-lg text-gold">Outline</p>
              <ul className="mt-2">
                {snap.headings.map((heading, index) => (
                  <li key={`${heading.text}-${index}`} className={`border-t border-line py-1 text-sm text-bone ${heading.level === 2 ? "pl-4" : heading.level === 3 ? "pl-8" : ""}`}>
                    {heading.text}
                  </li>
                ))}
              </ul>
            </Well>
          ) : null}
          {snap.links.length ? (
            <Well>
              <p className="font-display text-lg text-gold">Links</p>
              <ul className="mt-2">
                {snap.links.map((link) => (
                  <li key={link.href} className="border-t border-line py-2 text-sm">
                    <a className="break-all text-gold underline-offset-2 hover:underline" href={link.href} target="_blank" rel="noreferrer">
                      {link.text}
                    </a>
                  </li>
                ))}
              </ul>
            </Well>
          ) : null}
          {snap.emails.length || snap.tels.length ? (
            <Well>
              <p className="font-display text-lg text-gold">Strings this page publishes</p>
              <ul className="mt-2 text-sm text-bone">
                {snap.emails.map((mail) => (
                  <li key={mail} className="border-t border-line py-1 break-all">
                    {mail}
                  </li>
                ))}
                {snap.tels.map((tel) => (
                  <li key={tel} className="border-t border-line py-1">
                    {tel}
                  </li>
                ))}
              </ul>
            </Well>
          ) : null}
          {selector.trim() ? (
            <Well>
              <p className="font-display text-lg text-gold">Selector</p>
              {snap.matches.length ? (
                <ul className="mt-2">
                  {snap.matches.map((match, index) => (
                    <li key={`${match}-${index}`} className="border-t border-line py-2 text-sm text-bone">
                      {match}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-mute">No matches.</p>
              )}
            </Well>
          ) : null}
        </div>
      ) : null}
    </BenchFrame>
  );
}
