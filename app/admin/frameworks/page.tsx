import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { publishFrameworkAction } from "@/app/admin/actions";
import { Lead, PageTitle, Pill, Table } from "@/components/ui";

export const metadata = { title: "Framework catalog" };

export default async function FrameworksAdmin() {
  const rows = await db
    .select({
      f: schema.frameworks,
      tenants: sql<number>`(select count(*) from tenant_frameworks tf where tf.framework_code = ${schema.frameworks.code})`.mapWith(Number),
    })
    .from(schema.frameworks)
    .orderBy(schema.frameworks.code);
  return (
    <>
      <PageTitle title="Framework catalog" />
      <Lead>Master framework packages. Only published frameworks can be chosen by tenants.</Lead>
      <Table head={["Package", "Version", "Requirements", "Tenants using", "Status", ""]} minWidth={760}>
        {rows.map(({ f, tenants }) => (
          <tr key={f.code}>
            <td className="font-semibold">{f.name}</td>
            <td className="text-muted">{f.version}</td>
            <td>{f.requirements}</td>
            <td>{tenants}</td>
            <td><Pill status={f.published ? "published" : "draft"}>{f.published ? "Published" : "Draft"}</Pill></td>
            <td>
              {!f.published && (
                <form action={publishFrameworkAction}>
                  <input type="hidden" name="code" value={f.code} />
                  <button className="btnp bg-admin">Publish</button>
                </form>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
