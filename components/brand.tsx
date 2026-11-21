import Link from "next/link";
import { SITE } from "@/lib/site";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="7" fill="#2B4ACB" />
      <path d="M8 14.5l3.8 3.8L20 10" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", tagline = false, dark = false }: { href?: string; tagline?: boolean; dark?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-2.5 no-underline ${dark ? "text-white" : "text-ink"}`}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-bold">{SITE.name}</span>
        {tagline && (
          <span className={`mt-1 hidden text-[9.5px] font-semibold tracking-[0.14em] sm:block ${dark ? "text-[#FACC15]" : "text-muted"}`}>{SITE.tagline}</span>
        )}
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const links = [
    ["#who", "Who it's for"],
    ["#demo", "Live demo"],
    ["#features", "Features"],
    ["#how", "How it works"],
    ["#security", "Security"],
    ["#pricing", "Pricing"],
    ["#faq", "FAQ"],
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1437]/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-6 py-3">
        <Logo tagline dark />
        <nav aria-label="Site" className="hidden items-center gap-6 text-[13px] font-medium text-slate-300 lg:flex">
          {links.map(([h, l]) => (
            <a key={h} href={h} className="transition hover:text-white">{l}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/signin" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">Log in</Link>
          <Link href="/signup" className="whitespace-nowrap rounded-lg bg-[#FACC15] px-4 py-2 text-sm font-bold text-[#0B1437] hover:brightness-95">Start free</Link>
        </div>
      </div>
    </header>
  );
}

export function PublicHeader({ nav = false }: { nav?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/70">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-6 py-4 md:px-8">
        <Logo tagline />
        {nav && (
          <nav aria-label="Site" className="hidden items-center gap-7 text-sm font-semibold text-label lg:flex">
            <a href="#demo" className="hover:text-ink">Live demo</a>
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#security" className="hover:text-ink">Security</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
        )}
        <div className="flex flex-wrap gap-3">
          <Link href="/signin" className="btn">Sign in</Link>
          <Link href="/signup" className="btnp">Get started</Link>
        </div>
      </div>
    </header>
  );
}
