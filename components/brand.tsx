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
          <span className={`mt-1 hidden text-[9.5px] font-semibold tracking-[0.14em] sm:block ${dark ? "text-[#9DB0F5]" : "text-muted"}`}>{SITE.tagline}</span>
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
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/70">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-6 py-3">
        <Logo />
        <nav aria-label="Site" className="hidden items-center gap-6 text-[13px] font-semibold text-label lg:flex">
          {links.map(([h, l]) => (
            <a key={h} href={h} className="transition hover:text-ink">{l}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/signin" className="btn whitespace-nowrap">Log in</Link>
          <Link href="/signup" className="btnp whitespace-nowrap">Start free</Link>
        </div>
      </div>
    </header>
  );
}

/** Header for sign-in, sign-up and recovery pages. */
export function PublicHeader() {
  return (
    <header className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-6 py-5 md:px-8">
      <Logo />
      <div className="flex flex-wrap gap-3">
        <Link href="/signin" className="btn">Log in</Link>
        <Link href="/signup" className="btnp">Start free</Link>
      </div>
    </header>
  );
}
