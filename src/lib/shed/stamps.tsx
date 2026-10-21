import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const KEY = "mxhx-shed-stamps-v1";

export const RANKS = [
  { id: "beginner", label: "Beginner", min: 0 },
  { id: "deckhand", label: "Deckhand", min: 3 },
  { id: "operator", label: "Operator", min: 7 },
  { id: "quartermaster", label: "Quartermaster", min: 11 },
  { id: "god", label: "God mode", min: 15 },
] as const;

export function rankFor(count: number) {
  let current: (typeof RANKS)[number] = RANKS[0];
  for (const rank of RANKS) if (count >= rank.min) current = rank;
  return current;
}

type StampApi = {
  stamps: string[];
  ready: boolean;
  has: (id: string) => boolean;
  mark: (id: string) => void;
  clear: () => void;
};

const StampContext = createContext<StampApi | null>(null);

export function StampProvider({ children }: { children: ReactNode }) {
  const [stamps, setStamps] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) setStamps(parsed.filter((item) => typeof item === "string"));
      }
    } catch {
      /* keep the empty book */
    }
    setReady(true);
  }, []);

  const api = useMemo<StampApi>(() => {
    return {
      stamps,
      ready,
      has: (id) => stamps.includes(id),
      mark: (id) => {
        setStamps((prev) => {
          if (prev.includes(id)) return prev;
          const next = [...prev, id];
          localStorage.setItem(KEY, JSON.stringify(next));
          return next;
        });
      },
      clear: () => {
        localStorage.removeItem(KEY);
        setStamps([]);
      },
    };
  }, [ready, stamps]);

  return <StampContext.Provider value={api}>{children}</StampContext.Provider>;
}

export function useStamps() {
  const ctx = useContext(StampContext);
  if (!ctx) throw new Error("Stamps are only available inside the shed.");
  return ctx;
}
