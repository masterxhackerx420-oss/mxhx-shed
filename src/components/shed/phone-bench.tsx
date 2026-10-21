import { useState } from "react";
import { readPhone, type PhoneRead } from "@/lib/shed/phone";
import { useStamps } from "@/lib/shed/stamps";
import { Alert, BenchFrame, Button, Field, Well } from "@/components/shed/ui";

const STEPS = [
  { id: "phone-read", tier: "Beginner", label: "Clean a number" },
  { id: "phone-nanp", tier: "Operator", label: "Split a +1 number" },
  { id: "phone-god", tier: "God mode", label: "Turn vanity letters into digits" },
];

export function PhoneBench() {
  const { mark } = useStamps();
  const [value, setValue] = useState("+1 202 555 0104");
  const [read, setRead] = useState<PhoneRead | null>(null);
  const [error, setError] = useState("");

  function run(next: string) {
    setValue(next);
    const res = readPhone(next);
    if ("error" in res) {
      setError(res.error);
      setRead(null);
      return;
    }
    setError("");
    setRead(res);
    mark("phone-read");
    if (res.nanp) mark("phone-nanp");
    if (res.vanity) mark("phone-god");
  }

  return (
    <BenchFrame id="phone" steps={STEPS}>
      <p className="text-sm text-mute">Numbering plans only. This bench does not look up a person.</p>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          run(value);
        }}
      >
        <Field label="Number" value={value} onChange={(event) => setValue(event.target.value)} placeholder="+1 202 555 0104" spellCheck={false} autoCapitalize="off" />
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Read number</Button>
          <Button type="button" tone="ghost" onClick={() => run("+1 202 555 0104")}>
            Try +1
          </Button>
          <Button type="button" tone="ghost" onClick={() => run("+44 20 7946 0958")}>
            Try +44
          </Button>
          <Button type="button" tone="ghost" onClick={() => run("1-800-FLOWERS")}>
            Try vanity
          </Button>
        </div>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      {read ? (
        <Well>
          <p className="font-display text-2xl text-gold">{read.international}</p>
          <p className="mt-1 font-mono text-sm text-bone">{read.e164}</p>
          <dl className="mt-4 grid grid-cols-2 gap-2">
            {(
              [
                ["Region", read.countryName],
                ["Calling code", `+${read.callingCode}`],
                ["National", read.national],
                ["Line", read.line],
                ["Pattern", read.valid ? "Valid" : "Not a valid pattern"],
                ["Possible", read.possible ? "Yes" : "No"],
              ] as const
            ).map(([label, item]) => (
              <div key={label} className="rounded-md bg-ink px-3 py-3 ring-1 ring-line">
                <dt className="text-xs text-mute">{label}</dt>
                <dd className="text-sm text-bone">{item}</dd>
              </div>
            ))}
          </dl>
          {read.vanity ? (
            <p className="mt-3 text-sm text-bone">
              Letters became <span className="font-mono text-gold">{read.dial}</span>. 2 is ABC, 9 is WXYZ.
            </p>
          ) : null}
          {read.ext ? <p className="mt-2 text-sm text-mute">Extension {read.ext}</p> : null}
          {read.nanp ? (
            <div className="mt-4">
              <p className="font-display text-lg text-gold">North American split</p>
              <p className="mt-1 font-mono text-bone">
                {read.nanp.npa} · {read.nanp.nxx} · {read.nanp.line}
              </p>
              <p className="mt-1 text-sm text-mute">
                Area code, exchange, line. 555-01 numbers are reserved for fiction, so they often parse as possible and not valid.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-mute">Outside +1, the national number is not split into the North American area-code pattern.</p>
          )}
        </Well>
      ) : null}
    </BenchFrame>
  );
}
