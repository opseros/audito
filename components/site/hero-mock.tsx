"use client";

import { useEffect, useState } from "react";

/** Compact animated product mock for the hero: readiness climbs as checks pass. */
const ITEMS = [
  ["AC-01", "MFA enforced for all users"],
  ["CR-01", "Encryption at rest"],
  ["HR-03", "Security awareness training"],
  ["SC-01", "Payment page script integrity"],
] as const;

export function HeroMock() {
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(2);
      return;
    }
    const t = window.setInterval(() => setDone((d) => (d >= ITEMS.length ? 0 : d + 1)), 1600);
    return () => window.clearInterval(t);
  }, []);
  const soc = 44 + done * 14;
  const iso = 44 + done * 12;
  return (
    <div className="relative w-full max-w-[560px] animate-float" aria-hidden="true">
      <div className="absolute -inset-6 -z-10 rounded-[32px] bg-[radial-gradient(closest-side,rgba(250,204,21,0.18),transparent)]" />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white text-left text-ink shadow-[0_40px_90px_-30px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]" />
            <span className="ml-2 rounded bg-[#FACC15] px-1.5 py-0.5 text-[10px] font-bold text-[#0B1437]">Northwind Labs</span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-auditor-ink">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-auditor" /> Live demo
          </span>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1.15fr]">
          <div className="flex flex-col gap-2.5">
            <div className="text-xs font-bold">Audit readiness</div>
            {[["SOC 2", soc, "bg-auditor"], ["ISO 27001", iso, "bg-org"]].map(([l, v, c]) => (
              <div key={l as string} className="rounded-lg border border-line p-2.5">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span>{l}</span>
                  <span className="font-display text-sm tabular-nums">{Math.min(100, v as number)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-line">
                  <div className={`h-1.5 rounded transition-[width] duration-700 ${c}`} style={{ width: `${Math.min(100, v as number)}%` }} />
                </div>
              </div>
            ))}
            <div className="rounded-lg bg-auditor-soft p-2.5 text-[10px] text-auditor-ink">
              <strong>Ledgerline CPA</strong> · fieldwork · 9 requests to review
            </div>
          </div>
          <div className="rounded-lg border border-line p-2.5">
            <div className="mb-1.5 text-[11px] font-bold">Controls</div>
            {ITEMS.map(([code, name], i) => {
              const ok = i < done;
              return (
                <div key={code} className="flex items-center gap-2 border-t border-hair py-1.5 first:border-0">
                  <span className="w-9 text-[10px] text-muted">{code}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{name}</span>
                  <span className={`pill px-1.5 py-0.5 text-[9px] transition-colors ${ok ? "bg-auditor-tint text-auditor-ink" : "bg-danger-tint text-danger"}`}>
                    {ok ? "Passing" : "Failing"}
                  </span>
                </div>
              );
            })}
            <span className="mt-2 block w-full rounded-md bg-org py-1.5 text-center text-[11px] font-semibold text-white">Submit evidence to auditor</span>
          </div>
        </div>
      </div>
    </div>
  );
}
