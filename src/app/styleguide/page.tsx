import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ProductImage } from "@/components/brand/product-image";
import { PlateMessage } from "@/components/brand/plate-message";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Field,
  Input,
  LinkButton,
  Money,
  PageHeader,
  Select,
  Skeleton,
  Spinner,
  Stat,
  Table,
  TD,
  TH,
  THead,
  TR,
  Textarea,
} from "@/components/ui";
import { DemoInteractive } from "./demo-interactive";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };

const swatches = [
  ["Cardamom (primary)", "bg-primary"],
  ["Cardamom deep", "bg-primary-strong"],
  ["Cardamom mist", "bg-primary-soft"],
  ["Turmeric (fill only)", "bg-accent"],
  ["Turmeric mist", "bg-accent-soft"],
  ["Chilli (mark, danger)", "bg-mark"],
  ["Clove (ink, dark)", "bg-ink"],
  ["Cumin (muted ink)", "bg-ink-muted"],
  ["Flour (page)", "bg-surface"],
  ["Enamel (raised)", "bg-raised"],
  ["Kraft (sunken)", "bg-sunken"],
  ["Paper (photo mat)", "bg-paper"],
  ["Hessian (decoration)", "bg-hessian"],
  ["Parchment (line)", "bg-line"],
  ["Leaf (success)", "bg-success"],
  ["Cumin gold (warning)", "bg-warning"],
  ["Indigo (info)", "bg-info"],
];

/** Shelf grounds: one per category, they only ever sit behind a plate. */
const shelves = [
  ["rice", "Rice"],
  ["pulses-nuts-and-groceries", "Pulses, nuts and groceries"],
  ["whole-spices", "Whole spices"],
  ["powders-and-ground-masala", "Powders and masala"],
  ["flours-atta-and-rava", "Flours, atta and rava"],
  ["tea-powders-and-milk-mix", "Tea and milk mix"],
  ["sauces", "Sauces"],
  ["food-colours", "Food colours"],
  ["restaurant-groceries", "Restaurant groceries"],
  ["drinks", "Drinks"],
  ["restaurant-packing-and-cleaning", "Packing and cleaning"],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="border-b border-line pb-2 text-xl">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <main id="main" className="mx-auto w-full min-w-0 max-w-5xl space-y-12 px-4 py-10 sm:px-6">
      <PageHeader
        title="Design system"
        description="Enamel and Spice: colours, type and components. Brand values come from src/config/brand.ts and src/app/tokens.css."
        actions={
          <>
            <LinkButton href="/styleguide/shop" variant="secondary" size="sm">Shop shell</LinkButton>
            <LinkButton href="/styleguide/admin" variant="secondary" size="sm">Admin shell</LinkButton>
            <LinkButton href="/styleguide/supplier" variant="secondary" size="sm">Supplier shell</LinkButton>
            <LinkButton href="/styleguide/driver" variant="secondary" size="sm">Driver shell</LinkButton>
          </>
        }
      />

      <Section title="Brand">
        <div className="flex flex-wrap items-center gap-6">
          <Logo />
          <div className="rounded-[var(--radius-md)] bg-dark p-3"><Logo inverted /></div>
        </div>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {swatches.map(([name, cls]) => (
            <li key={name} className="overflow-hidden rounded-[var(--radius-md)] border border-line bg-raised text-xs">
              <div className={`h-12 ${cls}`} />
              <div className="px-2 py-1.5 text-ink-muted">{name}</div>
            </li>
          ))}
        </ul>
        <h3 className="pt-2 text-lg">Shelf grounds</h3>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shelves.map(([slug, name]) => (
            <li key={slug} data-ground={slug} className="weave grid h-24 place-items-center rounded-[var(--radius-md)] p-3">
              <span className="plate grid size-full place-items-center px-2 text-center font-display text-sm leading-tight">{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type">
        <div className="space-y-3">
          <p className="font-display text-[clamp(2.125rem,1.4rem+3.6vw,3.75rem)] leading-[1.05]">Young Serif, one weight</p>
          <h1 className="text-[clamp(1.875rem,1.4rem+2vw,2.75rem)] leading-[1.1]">Heading 1 for the page</h1>
          <h2 className="text-2xl">Heading 2 for a section</h2>
          <h3 className="text-xl">Heading 3 for a card</h3>
          <p className="text-base">Body 17 in Mukta. Basmati rice, toor dal, garam masala and 330 ml × 24 cans.</p>
          <p className="text-sm text-ink-muted">Secondary 15 for meta and helper text.</p>
          <p className="text-xs text-ink-muted">Small 13 is the floor.</p>
          <p className="tabular text-base font-bold">Prices in Mukta 700, tabular: £1,234.56 £98.70 £12.00</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm" icon={<Plus className="size-4" aria-hidden="true" />}>Small</Button>
          <Button size="lg">Large</Button>
        </div>
        <DemoInteractive />
      </Section>

      <Section title="Form fields">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Business name" required hint="As it appears on your invoices">
            {(p) => <Input {...p} placeholder="Spice Route Ltd" />}
          </Field>
          <Field label="Postcode" required error="Enter a valid UK postcode">
            {(p) => <Input {...p} defaultValue="E1 ABC" />}
          </Field>
          <Field label="Pack size">
            {(p) => (
              <Select {...p} defaultValue="20">
                <option value="5">5 kg</option>
                <option value="10">10 kg</option>
                <option value="20">20 kg</option>
              </Select>
            )}
          </Field>
          <Field label="Order note" hint="Shown to the supplier's driver">
            {(p) => <Textarea {...p} placeholder="Back door after 10am" />}
          </Field>
          <Checkbox label="Remember me on this device" />
        </div>
      </Section>

      <Section title="Badges and alerts">
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent" dot>Placed</Badge>
          <Badge tone="info" dot>Confirmed</Badge>
          <Badge tone="primary" dot>Out for delivery</Badge>
          <Badge tone="success" dot>Delivered</Badge>
          <Badge tone="warning">Needs price</Badge>
          <Badge tone="danger">Overdue</Badge>
          <Badge>Waiting</Badge>
        </div>
        <div className="grid gap-3">
          <Alert tone="info" title="Add £38.00 more for free delivery">Orders under £150.00 have a £12.00 delivery charge.</Alert>
          <Alert tone="success" title="Account approved" />
          <Alert tone="warning" title="3 orders to chase today" />
          <Alert tone="danger" title="Could not place order">One item is no longer available. Remove it and try again.</Alert>
        </div>
      </Section>

      <Section title="Stats">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Owed to you" value={<Money pence={482350} />} hint="14 unpaid orders" tone="warning" />
          <Stat label="Owed to suppliers" value={<Money pence={391020} />} hint="9 supplier orders" />
          <Stat label="Chase today" value="3" hint="£1,240.00 promised" tone="danger" />
          <Stat label="Profit this month" value={<Money pence={84210} />} tone="success" />
        </div>
      </Section>

      <Section title="Card and table">
        <Card>
          <CardHeader title="Latest orders" description="Across all customers" action={<Link href="#" className="text-sm font-semibold text-primary">View all</Link>} />
          <Table>
            <THead>
              <tr><TH>Order</TH><TH>Customer</TH><TH>Delivery</TH><TH>Status</TH><TH className="text-right">Total</TH></tr>
            </THead>
            <tbody>
              {[
                ["#1051", "Spice Route Ltd", "Tue 6 Oct", "Sent to supplier", 18240],
                ["#1050", "Curry Leaf Kitchen", "Mon 5 Oct", "Delivered", 42015],
                ["#1049", "Tandoor House", "Mon 5 Oct", "Placed", 9870],
              ].map(([o, c, d, s, t]) => (
                <TR key={o as string}>
                  <TD className="font-semibold">{o}</TD>
                  <TD>{c}</TD>
                  <TD className="text-ink-muted">{d}</TD>
                  <TD><Badge tone={s === "Delivered" ? "success" : s === "Placed" ? "accent" : "info"} dot>{s}</Badge></TD>
                  <TD className="text-right"><Money pence={t as number} /></TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      </Section>

      <Section title="Product tiles">
        <p className="max-w-prose text-sm text-ink-muted">
          Without a photo, a product is an enamel plate on its shelf colour, with the pack size on the lower rim. Rows and baskets use the small plate.
        </p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Basant Basmati Rice", "rice", "20 kg"],
            ["Toor Dal", "pulses-nuts-and-groceries", "5 kg"],
            ["MDH Garam Masala", "powders-and-ground-masala", "100 g"],
            ["Foil Container 9x9", "restaurant-packing-and-cleaning", "100 pcs"],
          ].map(([n, slug, size]) => (
            <li key={n} className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised">
              <ProductImage name={n} alt={n} categorySlug={slug} sizeLabel={size} className="aspect-[4/3]" />
              <div className="p-3">
                <p className="text-sm font-semibold">{n}</p>
                <p className="text-xs text-ink-muted">3 sizes</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex gap-3">
          {[["rice", "20 kg"], ["whole-spices", "1 kg"], ["drinks", "24 x 330 ml"], ["sauces", "700 g"]].map(([slug, size]) => (
            <ProductImage key={slug} variant="thumb" name={size} alt="" categorySlug={slug} sizeLabel={size} className="size-16 rounded-[var(--radius-md)]" />
          ))}
        </div>
      </Section>

      <Section title="Loading and empty states">
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-3"><Spinner label="Loading" /> <span className="text-sm text-ink-muted">Loading orders…</span></div>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardBody>
        </Card>
        <PlateMessage title="No orders yet" fit="full" ground="default" className="rounded-[var(--radius-xl)]" actions={<LinkButton href="#">Start shopping</LinkButton>}>
          <p>When you place an order it will appear here with its delivery status and invoice.</p>
        </PlateMessage>
      </Section>
    </main>
  );
}
