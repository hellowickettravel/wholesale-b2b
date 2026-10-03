import { AdminShell } from "@/components/shell/admin-shell";
import { Badge, Card, CardHeader, LinkButton, Money, PageHeader, Stat, Table, TD, TH, THead, TR } from "@/components/ui";

export default function AdminPreview() {
  return (
    <AdminShell userName="Nagaraju" badges={{ "/admin/approvals": 2, "/admin/payments": 3 }}>
      <PageHeader title="Good morning" description="Saturday 3 October" actions={<LinkButton href="#" size="sm">New order</LinkButton>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Owed to you" value={<Money pence={482350} />} hint="14 unpaid orders" tone="warning" />
        <Stat label="Owed to suppliers" value={<Money pence={391020} />} hint="9 supplier orders" />
        <Stat label="Chase today" value="3" hint="2 overdue" tone="danger" />
        <Stat label="Pending approvals" value="2" />
      </div>
      <Card className="mt-6">
        <CardHeader title="Chase today" description="Promised payment dates that are due or past" />
        <Table>
          <THead><tr><TH>Order</TH><TH>Customer</TH><TH>Promised</TH><TH>Status</TH><TH className="text-right">Outstanding</TH></tr></THead>
          <tbody>
            <TR><TD className="font-semibold">#1044</TD><TD>Tandoor House</TD><TD>29 Sep</TD><TD><Badge tone="danger">4 days overdue</Badge></TD><TD className="text-right"><Money pence={21480} /></TD></TR>
            <TR><TD className="font-semibold">#1047</TD><TD>Curry Leaf Kitchen</TD><TD>3 Oct</TD><TD><Badge tone="warning">Part paid</Badge></TD><TD className="text-right"><Money pence={8000} /></TD></TR>
          </tbody>
        </Table>
      </Card>
    </AdminShell>
  );
}
