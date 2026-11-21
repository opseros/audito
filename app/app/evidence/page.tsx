import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireKind } from "@/lib/context";
import { can } from "@/lib/permissions";
import { Card, PageTitle, Table } from "@/components/ui";
import { UploadForm } from "@/components/app/forms";

export const metadata = { title: "Evidence library" };

function size(n: number | null) {
  if (!n) return "";
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;
}

export default async function EvidencePage() {
  const ctx = await requireKind("organization");
  const rows = await db
    .select({ e: schema.evidence, code: schema.controls.code })
    .from(schema.evidence)
    .leftJoin(schema.controls, eq(schema.controls.id, schema.evidence.controlId))
    .where(eq(schema.evidence.tenantId, ctx.tenant.id))
    .orderBy(desc(schema.evidence.createdAt));
  const controls = await db
    .select({ id: schema.controls.id, code: schema.controls.code, name: schema.controls.name })
    .from(schema.controls)
    .where(eq(schema.controls.tenantId, ctx.tenant.id))
    .orderBy(schema.controls.code);
  const writable = can(ctx.role, ctx.tenant.type, "workspace.write");

  return (
    <>
      <PageTitle title="Evidence library" />
      {writable && (
        <Card className="max-w-xl">
          <UploadForm controls={controls} />
        </Card>
      )}
      <Table head={["Artifact", "Source", "Control", "Collected", "Shared with"]} minWidth={700}>
        {rows.map(({ e, code }) => (
          <tr key={e.id}>
            <td className="font-semibold">
              <a href={`/api/evidence/${e.id}`} className="text-ink hover:underline">{e.name}</a>{" "}
              <span className="text-xs font-normal text-muted">{size(e.size)}</span>
            </td>
            <td>{e.source}</td>
            <td className="text-muted">{code || "—"}</td>
            <td className="text-muted">{e.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
            <td>{e.sharedWith.length ? e.sharedWith.join(", ") : "Not shared"}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={5} className="text-muted">No evidence yet.</td></tr>
        )}
      </Table>
    </>
  );
}
