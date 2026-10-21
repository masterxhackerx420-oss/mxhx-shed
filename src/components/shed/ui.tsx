import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { BENCHES, type BenchId, banner, githubFence } from "@/lib/shed/ascii";
import { useStamps } from "@/lib/shed/stamps";

export function when(iso: string | null): string {
  if (!iso) return "unknown time";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown time";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function Button({
  tone = "gold",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "gold" | "ghost" }) {
  const toneClass =
    tone === "gold"
      ? "bg-gold text-soot hover:bg-bone"
      : "bg-transparent text-bone ring-1 ring-line hover:ring-gold";
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold disabled:opacity-50 ${toneClass} ${className}`}
    />
  );
}

export function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const id = props.id ?? auto;
  return (
    <label className="block min-w-0 text-sm" htmlFor={id}>
      <span className="mb-1 block text-mute">{label}</span>
      <input
        {...props}
        id={id}
        suppressHydrationWarning
        className="h-12 w-full rounded-md bg-soot px-3 text-bone ring-1 ring-line outline-none placeholder:text-mute focus:ring-gold"
      />
    </label>
  );
}

export function TextArea({ label, ...props }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const id = props.id ?? auto;
  return (
    <label className="block min-w-0 text-sm" htmlFor={id}>
      <span className="mb-1 block text-mute">{label}</span>
      <textarea
        {...props}
        id={id}
        suppressHydrationWarning
        className="min-h-28 w-full rounded-md bg-soot px-3 py-3 text-bone ring-1 ring-line outline-none placeholder:text-mute focus:ring-gold"
      />
    </label>
  );
}

export function Well({ children }: { children: ReactNode }) {
  return <div className="rounded-md bg-soot p-4 ring-1 ring-line">{children}</div>;
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="border-l-2 border-blood pl-3 text-sm text-bone">
      {children}
    </p>
  );
}

export function Path({ steps }: { steps: { id: string; tier: string; label: string }[] }) {
  const { has } = useStamps();
  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      {steps.map((step) => {
        const done = has(step.id);
        return (
          <li key={step.id} className={`rounded-md px-3 py-3 ring-1 ${done ? "bg-panel-2 ring-gold" : "bg-ink ring-line"}`}>
            <p className="font-display text-xs tracking-widest text-gold">{done ? `${step.tier} · stamped` : step.tier}</p>
            <p className="mt-1 text-sm text-bone">{step.label}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function SectionArt({ src, alt }: { src: string; alt: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <img
      src={src}
      alt={alt}
      className="h-40 w-full rounded-md object-cover ring-1 ring-line sm:h-52"
      onError={() => setHidden(true)}
    />
  );
}

export function AsciiHeader({ word, subtitle }: { word: string; subtitle: string }) {
  const lines = banner(word, subtitle).split("\n");
  const last = lines.length - 1;
  const [copied, setCopied] = useState(false);

  async function copy() {
    const payload = githubFence(word, subtitle);
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      const area = document.createElement("textarea");
      area.value = payload;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="min-w-0">
      <h2 className="sr-only">
        MXHX {word}. {subtitle}
      </h2>
      <div className="overflow-x-auto">
        <pre aria-hidden="true" className="font-mono text-xs leading-none whitespace-pre text-gold sm:text-sm">
          {lines.map((line, index) => (
            <div
              key={index}
              className={
                index === 0 || index === 1 || index === last
                  ? "whitespace-pre text-blood"
                  : index === last - 1
                    ? "whitespace-pre text-bone"
                    : "whitespace-pre text-gold"
              }
            >
              {line}
            </div>
          ))}
        </pre>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="button" tone="ghost" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy README block"}
        </Button>
        <p className="text-sm text-mute">Fenced for GitHub, so the hash marks stay marks.</p>
      </div>
    </div>
  );
}

export function BenchFrame({
  id,
  steps,
  children,
}: {
  id: BenchId;
  steps: { id: string; tier: string; label: string }[];
  children: ReactNode;
}) {
  const bench = BENCHES.find((item) => item.id === id);
  if (!bench) return null;
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <SectionArt src={bench.image} alt={bench.alt} />
      <AsciiHeader word={bench.word} subtitle={bench.subtitle} />
      <Path steps={steps} />
      {children}
    </section>
  );
}

export function ReadmeLibrary() {
  return (
    <details className="rounded-md bg-panel ring-1 ring-line">
      <summary className="min-h-11 px-4 py-3 text-sm text-bone">README marks for every bench</summary>
      <div className="flex flex-col gap-6 px-4 pb-4">
        <p className="text-sm text-mute">
          One header each, made to paste into a GitHub README. The copy includes the fence.
        </p>
        {BENCHES.map((bench) => (
          <AsciiHeader key={bench.id} word={bench.word} subtitle={bench.subtitle} />
        ))}
      </div>
    </details>
  );
}
