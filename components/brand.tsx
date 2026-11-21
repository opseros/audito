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

export function Logo({ href = "/", tagline = false }: { href?: string; tagline?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 text-ink no-underline">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-bold">{SITE.name}</span>
        {tagline && <span className="mt-1 text-[9.5px] font-semibold tracking-[0.14em] text-muted">{SITE.tagline}</span>}
      </span>
    </Link>
  );
}

export function PublicHeader({ nav = false }: { nav?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/70">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-6 py-4 md:px-8">
        <Logo tagline />
        {nav && (
          <nav aria-label="Site" className="hidden items-center gap-7 text-sm font-semibold text-label lg:flex">
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
