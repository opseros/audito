import { providersEnabled } from "@/lib/env";

/**
 * Google / Microsoft sign-in. These are plain links to the server-side start
 * route: the provider runs its own bot and risk checks, so Turnstile guards
 * only the forms AuditMesh processes itself (password, sign-up, reset).
 */
export function OAuthButtons({ next }: { next?: string }) {
  const list = [
    providersEnabled.google && { id: "google", label: "Continue with Google" },
    providersEnabled.microsoft && { id: "microsoft", label: "Continue with Microsoft" },
  ].filter(Boolean) as { id: string; label: string }[];
  if (!list.length) return null;
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="flex flex-col gap-2.5">
      {list.map((p) => (
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        <a key={p.id} href={`/api/auth/oauth/${p.id}/start${q}`} className="btn w-full">
          {p.label}
        </a>
      ))}
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
