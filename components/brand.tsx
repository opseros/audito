import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 text-ink no-underline">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#2B4ACB" strokeWidth="2" aria-hidden="true">
        <circle cx="7" cy="7" r="4" />
        <circle cx="21" cy="7" r="4" />
        <circle cx="14" cy="21" r="4" />
        <path d="M10 9l3 8M18 9l-3 8M11 7h6" />
      </svg>
      <span className="font-display text-xl font-bold">AuditMesh</span>
    </Link>
  );
}

export function PublicHeader() {
  return (
    <header className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-8 py-[22px]">
      <Logo />
      <div className="flex flex-wrap gap-3">
        <Link href="/signin" className="btn">Sign in</Link>
        <Link href="/signup" className="btnp">Get started</Link>
      </div>
    </header>
  );
}
