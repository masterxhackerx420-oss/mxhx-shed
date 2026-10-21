import { useEffect, useState } from "react";
import { hideInImage, hideText, inkCount, revealImage, revealText, showInk } from "@/lib/shed/ink";
import { DRILLS, briefEntries, fromBrief, sameBrief, toBrief } from "@/lib/shed/steno";
import { useStamps } from "@/lib/shed/stamps";
import { Alert, BenchFrame, Button, TextArea, Well } from "@/components/shed/ui";

const STEPS = [
  { id: "steno-brief", tier: "Beginner", label: "Brief a sentence" },
  { id: "steno-drill", tier: "Operator", label: "Pass a timed drill" },
  { id: "steno-god", tier: "God mode", label: "Hide a note and read it back" },
];

export function StenoBench() {
  const { mark } = useStamps();
  const [mode, setMode] = useState<"briefs" | "ink">("briefs");
  const [english, setEnglish] = useState(DRILLS[0]);
  const [briefs, setBriefs] = useState("");
  const [back, setBack] = useState("");
  const [drill, setDrill] = useState(DRILLS[0]);
  const [attempt, setAttempt] = useState("");
  const [started, setStarted] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [verdict, setVerdict] = useState("");
  const [cover, setCover] = useState("The tide chart is on the bench.");
  const [secret, setSecret] = useState("god mode is just practice");
  const [packed, setPacked] = useState("");
  const [revealed, setRevealed] = useState("");
  const [sealed, setSealed] = useState("");
  const [pictureUrl, setPictureUrl] = useState("");
  const [pictureNote, setPictureNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [started]);

  const elapsed = started ? Math.max(0, (now || started) - started) : 0;

  function briefIt(text = english) {
    const next = toBrief(text);
    setEnglish(text);
    setBriefs(next);
    setBack(fromBrief(next));
    setError("");
    if (next) mark("steno-brief");
  }

  function loadDrill() {
    const next = DRILLS[Math.floor(Math.random() * DRILLS.length)] ?? DRILLS[0];
    setDrill(next);
    setAttempt("");
    setVerdict("");
    setStarted(Date.now());
    setNow(Date.now());
  }

  function checkDrill() {
    const expected = toBrief(drill);
    if (sameBrief(attempt, expected)) {
      const words = drill.split(/\s+/).length;
      const minutes = Math.max(elapsed, 1000) / 60000;
      const wpm = Math.round(words / minutes);
      setVerdict(`Clean. ${wpm} words a minute.`);
      mark("steno-drill");
    } else {
      setVerdict(`Not yet. The shed brief is: ${expected}`);
    }
  }

  function hideNote() {
    try {
      const out = hideText(cover, secret);
      setPacked(out);
      setSealed(secret);
      setRevealed("");
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not hide that note.");
    }
  }

  function readNote() {
    try {
      const got = revealText(packed);
      setRevealed(got);
      setError("");
      if (sealed && got === sealed) mark("steno-god");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read that ink.");
    }
  }

  async function pressImage(file: File | undefined) {
    if (!file) return;
    try {
      const result = await hideInImage(file, secret);
      setPictureUrl(result.url);
      setPictureNote(`${result.used} bytes written. This picture can hold about ${result.capacity} bytes.`);
      setSealed(secret);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not press that picture.");
    }
  }

  async function readImage(file: File | undefined) {
    if (!file) return;
    try {
      const got = await revealImage(file);
      setRevealed(got);
      setError("");
      if (sealed && got === sealed) mark("steno-god");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read that picture.");
    }
  }

  return (
    <BenchFrame id="steno" steps={STEPS}>
      <p className="text-sm text-mute">
        Briefs are MXHX shorthand. Hidden ink is the sibling trick: a note that does not look like a note.
      </p>
      <div className="flex flex-wrap gap-2" role="tablist">
        {(
          [
            ["briefs", "Briefs"],
            ["ink", "Hidden ink"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={`min-h-11 rounded-md px-4 text-sm font-semibold ring-1 ${mode === id ? "bg-gold text-soot ring-gold" : "text-bone ring-line"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? <Alert>{error}</Alert> : null}

      {mode === "briefs" ? (
        <div className="flex flex-col gap-4">
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              briefIt();
            }}
          >
            <TextArea label="Longhand" value={english} onChange={(event) => setEnglish(event.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Brief it</Button>
              <Button type="button" tone="ghost" onClick={() => briefIt(DRILLS[1])}>
                Load a line
              </Button>
            </div>
          </form>
          {briefs ? (
            <Well>
              <p className="text-xs text-mute">Brief</p>
              <p className="mt-1 font-mono text-sm text-gold">{briefs}</p>
              <p className="mt-3 text-xs text-mute">Read back</p>
              <p className="mt-1 text-sm text-bone">{back}</p>
              <p className="mt-2 text-sm text-mute">A star means the word is not briefed yet, so it is fingerspelled.</p>
            </Well>
          ) : null}
          <Well>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-lg text-gold">Drill</p>
              <p className="font-mono text-sm text-mute tabular-nums">{(elapsed / 1000).toFixed(1)}s</p>
            </div>
            <p className="mt-2 text-sm text-bone">{started ? drill : "Start when you want the clock."}</p>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-mute">Your briefs</span>
              <textarea
                value={attempt}
                onChange={(event) => setAttempt(event.target.value)}
                className="min-h-24 w-full rounded-md bg-ink px-3 py-3 font-mono text-sm text-bone ring-1 ring-line outline-none focus:ring-gold"
                spellCheck={false}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" onClick={loadDrill}>
                {started ? "New drill" : "Start drill"}
              </Button>
              <Button type="button" tone="ghost" onClick={checkDrill} disabled={!started}>
                Check
              </Button>
            </div>
            {verdict ? <p className="mt-3 text-sm text-bone">{verdict}</p> : null}
          </Well>
          <details className="rounded-md ring-1 ring-line">
            <summary className="min-h-11 px-3 py-3 text-sm text-bone">Brief dictionary</summary>
            <ul className="grid max-h-64 grid-cols-2 gap-x-3 overflow-auto px-3 pb-3 sm:grid-cols-3">
              {briefEntries().map(([word, brief]) => (
                <li key={word} className="flex justify-between gap-2 border-t border-line py-1 text-sm">
                  <span className="text-bone">{word}</span>
                  <span className="font-mono text-gold">{brief}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Well>
            <p className="font-display text-lg text-gold">Zero-width ink</p>
            <p className="mt-1 text-sm text-mute">The cover line looks unchanged. The note rides in invisible marks after it.</p>
            <div className="mt-3 grid gap-3">
              <TextArea label="Cover" value={cover} onChange={(event) => setCover(event.target.value)} />
              <TextArea label="Secret" value={secret} onChange={(event) => setSecret(event.target.value)} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" onClick={hideNote}>
                Hide in the line
              </Button>
              <Button type="button" tone="ghost" onClick={readNote} disabled={!packed}>
                Read it back
              </Button>
            </div>
            {packed ? (
              <div className="mt-3">
                <p className="text-xs text-mute">{inkCount(packed)} invisible marks</p>
                <textarea readOnly value={packed} className="mt-1 min-h-20 w-full rounded-md bg-ink px-3 py-3 text-sm text-bone ring-1 ring-line" />
                <details className="mt-2">
                  <summary className="min-h-11 text-sm text-mute">Show the marks</summary>
                  <p className="font-mono text-sm break-all text-gold">{showInk(packed)}</p>
                </details>
              </div>
            ) : null}
          </Well>
          <Well>
            <p className="font-display text-lg text-gold">Picture ink</p>
            <p className="mt-1 text-sm text-mute">
              Least-significant red bits, then a PNG. Read the downloaded file, not the original. JPEG would erase the ink.
            </p>
            <label className="mt-3 block text-sm text-mute">
              Picture to press
              <input
                className="mt-1 block w-full text-sm text-bone file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-gold file:px-4 file:text-sm file:font-semibold file:text-soot"
                type="file"
                accept="image/*"
                onChange={(event) => void pressImage(event.target.files?.[0])}
              />
            </label>
            {pictureUrl ? (
              <div className="mt-3">
                <img src={pictureUrl} alt="Picture with a hidden note" className="max-h-52 rounded-md ring-1 ring-line" />
                <p className="mt-2 text-sm text-mute">{pictureNote}</p>
                <a className="mt-2 inline-flex min-h-11 items-center text-sm text-gold underline-offset-2 hover:underline" href={pictureUrl} download="mxhx-ink.png">
                  Download PNG
                </a>
              </div>
            ) : null}
            <label className="mt-4 block text-sm text-mute">
              Picture to read
              <input
                className="mt-1 block w-full text-sm text-bone file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-panel-2 file:px-4 file:text-sm file:font-semibold file:text-bone"
                type="file"
                accept="image/png,image/*"
                onChange={(event) => void readImage(event.target.files?.[0])}
              />
            </label>
          </Well>
          {revealed ? (
            <Well>
              <p className="text-xs text-mute">Recovered note</p>
              <p className="mt-1 text-bone">{revealed}</p>
            </Well>
          ) : null}
        </div>
      )}
    </BenchFrame>
  );
}
