"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export type NavItem = { href: string; label: string };

export function SideNav({ title, items, tint, ink }: { title: string; items: NavItem[]; tint: string; ink: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="box-border flex max-w-full flex-[1_1_220px] flex-col gap-0.5 border-r border-line bg-white px-3 py-5 md:max-w-[260px]">
      <span className="px-3 pb-3 text-xs font-semibold text-muted">{title}</span>
      {items.map((n) => {
        const on = path === n.href || path.startsWith(`${n.href}/`);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={cx("block rounded-lg px-3 py-2.5 text-sm", on ? "font-semibold" : "text-label hover:bg-hair")}
            style={on ? { background: tint, color: ink } : undefined}
          >
            <span className="flex items-center justify-between gap-2">
              {n.label}
              <Pending />
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function WorkspaceSwitcher({
  options,
  current,
  action,
}: {
  options: { value: string; label: string }[];
  current: string;
  action: (form: FormData) => void;
}) {
  return (
    <form action={action} className="flex items-center gap-2 text-[13px] font-semibold text-muted">
      <label htmlFor="ws">Workspace</label>
      <select
        id="ws"
        name="tenantId"
        defaultValue={current}
        className="input w-auto py-2"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <noscript>
        <button className="btn btn-sm">Go</button>
      </noscript>
    </form>
  );
}

/** Instant feedback while the next page renders on the server. */
function Pending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cx("h-2 w-2 rounded-full bg-current transition-opacity", pending ? "animate-pulse opacity-60" : "opacity-0")}
    />
  );
}

