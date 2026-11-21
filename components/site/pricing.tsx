"use client";

import Link from "next/link";
import { useState } from "react";
import { PRICING, SITE } from "@/lib/site";

function Tick() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-[3px] flex-none">
      <path d="M3.5 8.5l3 3 6-7" stroke="#0F6B5C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Pricing() {
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [seg, setSeg] = useState(PRICING[0].key);
  const segment = PRICING.find((s) => s.key === seg)!;
  // Show the currency switch only once a paid price is published.
  const anyPrice = PRICING.some((s) => s.tiers.some((t) => t.price && t.price.INR !== "Free"));
  const cols = segment.tiers.length === 1 ? "max-w-[440px]" : segment.tiers.length === 2 ? "max-w-[820px] md:grid-cols-2" : "md:grid-cols-3";

  return (
    <div className="flex flex-col items-center gap-6">
      {anyPrice && (
        <div role="radiogroup" aria-label="Currency" className="flex rounded-lg border border-line bg-white p-1">
          {(["INR", "USD"] as const).map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={currency === c}
              onClick={() => setCurrency(c)}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${currency === c ? "bg-[#0B1437] text-white" : "text-muted"}`}
            >
              {c === "INR" ? "₹ INR" : "$ USD"}
            </button>
          ))}
        </div>
      )}
      <div role="tablist" aria-label="Plans for" className="flex flex-wrap justify-center rounded-xl border border-line bg-white p-1">
        {PRICING.map((s) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={seg === s.key}
            onClick={() => setSeg(s.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${seg === s.key ? "bg-org text-white shadow-sm" : "text-label hover:text-ink"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div key={seg} className={`grid w-full animate-fade-up gap-5 ${cols}`}>
        {segment.tiers.map((t) => (
          <div
            key={t.name}
            className={`relative flex h-full flex-col rounded-2xl border bg-white p-7 ${
              t.highlight && segment.tiers.length > 1 ? "border-org shadow-[0_20px_50px_-24px_rgba(43,74,203,0.55)]" : "border-line"
            }`}
          >
            {t.highlight && segment.tiers.length > 1 && (
              <span className="pill absolute -top-3 left-1/2 -translate-x-1/2 bg-org text-white">Most popular</span>
            )}
            <h3 className="text-xl font-bold">{t.name}</h3>
            <p className="m-0 mt-1 min-h-[20px] text-sm text-muted">{t.audience}</p>
            <div className="mt-5 flex min-h-[44px] items-baseline gap-1.5">
              <span className="font-display text-[34px] font-bold leading-none">{t.price ? t.price[currency] : "Custom"}</span>
              <span className="text-xs text-muted">{t.price ? t.unit : "pricing"}</span>
            </div>
            <p className="m-0 mt-3 text-sm font-semibold">{t.limit}</p>
            <div className="mt-5 flex-1">
              {t.intro && <p className="m-0 mb-3 text-sm font-semibold">{t.intro}</p>}
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {t.features.map((f) => (
                  <li key={f.title} className="flex gap-2 text-sm">
                    <Tick />
                    <span>
                      <span className="font-semibold">{f.title}</span>
                      {f.detail && <span className="text-muted"> · {f.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-7 flex flex-col gap-2">
              {t.cta.href.startsWith("mailto:") ? (
                <a href={t.cta.href} className="btnp bg-[#0B1437]">{t.cta.label}</a>
              ) : (
                <Link href={t.cta.href} className={t.highlight && segment.tiers.length > 1 ? "btnp bg-[#FACC15] text-[#0B1437]" : "btnp bg-[#0B1437]"}>
                  {t.cta.label}
                </Link>
              )}
              <span className="flex h-4 items-center justify-center text-xs">
                {t.price?.INR === "Free" ? (
                  <span className="text-muted">No card required</span>
                ) : t.price ? (
                  <span className="text-muted">Billed monthly · cancel any time</span>
                ) : (
                  <a href={`mailto:${SITE.contactEmail}?subject=${encodeURIComponent(`AuditOps ${t.name} pricing`)}`} className="font-semibold text-org hover:underline">
                    Get a quote
                  </a>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="m-0 max-w-[720px] text-center text-xs text-muted">
        Creating a workspace is free. Paid plans are quoted per organization, firm seat or managed client.{" "}
        {anyPrice && "Prices exclude GST / taxes. "}Need something else?{" "}
        <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-org hover:underline">Talk to us</a>.
      </p>
    </div>
  );
}
