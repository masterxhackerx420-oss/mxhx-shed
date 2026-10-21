import { parsePhoneNumberFromString } from "libphonenumber-js";

const KEY: Record<string, string> = {};
for (const [letters, digit] of [
  ["ABC", "2"],
  ["DEF", "3"],
  ["GHI", "4"],
  ["JKL", "5"],
  ["MNO", "6"],
  ["PQRS", "7"],
  ["TUV", "8"],
  ["WXYZ", "9"],
] as const) {
  for (const ch of letters) KEY[ch] = digit;
}

export type PhoneRead = {
  input: string;
  dial: string;
  vanity: boolean;
  e164: string;
  international: string;
  national: string;
  country: string;
  countryName: string;
  callingCode: string;
  valid: boolean;
  possible: boolean;
  line: string;
  ext: string | null;
  nanp: null | { npa: string; nxx: string; line: string };
};

export function readPhone(raw: string): PhoneRead | { error: string } {
  const trimmed = raw.trim();
  if (trimmed.length < 3 || trimmed.length > 48) {
    return { error: "Enter a phone number, or vanity letters like 1-800-FLOWERS." };
  }
  let vanity = false;
  const dial = trimmed.toUpperCase().replace(/[A-Z]/g, (ch) => {
    const digit = KEY[ch];
    if (!digit) return ch;
    vanity = true;
    return digit;
  });
  const phone = parsePhoneNumberFromString(dial, "US");
  if (!phone || !phone.isPossible()) {
    return { error: "That does not look like a possible phone number." };
  }
  const country = phone.country ?? "";
  let countryName = country || "Unknown region";
  if (country) {
    try {
      countryName = new Intl.DisplayNames(["en"], { type: "region" }).of(country) ?? country;
    } catch {
      countryName = country;
    }
  }
  const national = String(phone.nationalNumber);
  const nanp =
    phone.countryCallingCode === "1" && national.length === 10
      ? { npa: national.slice(0, 3), nxx: national.slice(3, 6), line: national.slice(6) }
      : null;
  const kind = phone.getType();
  return {
    input: trimmed,
    dial,
    vanity,
    e164: phone.number,
    international: phone.formatInternational(),
    national: phone.formatNational(),
    country,
    countryName,
    callingCode: phone.countryCallingCode,
    valid: phone.isValid(),
    possible: phone.isPossible(),
    line: kind ? kind.toLowerCase().replaceAll("_", " ") : "unknown",
    ext: phone.ext || null,
    nanp,
  };
}
