"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
    __tsLoading?: Promise<void>;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

function load() {
  if (window.turnstile) return Promise.resolve();
  window.__tsLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(s);
  });
  return window.__tsLoading;
}

/**
 * Cloudflare Turnstile. Writes the token into a hidden "cf-turnstile-response"
 * field of the surrounding form. `resetKey` changes after each submission so
 * a fresh (single-use) token is issued.
 */
export function Turnstile({ action, resetKey }: { action: string; resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    let gone = false;
    load()
      .then(() => {
        if (gone || !box.current || !window.turnstile || id.current) return;
        id.current = window.turnstile.render(box.current, {
          sitekey: SITE_KEY,
          action,
          theme: "light",
          size: "flexible",
          "response-field-name": "cf-turnstile-response",
        });
      })
      .catch(() => undefined);
    return () => {
      gone = true;
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
  }, [action]);

  useEffect(() => {
    if (id.current && window.turnstile && resetKey !== undefined) window.turnstile.reset(id.current);
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={box} className="min-h-[65px]" />;
}
