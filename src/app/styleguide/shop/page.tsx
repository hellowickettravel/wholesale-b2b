import { Search } from "lucide-react";
import { ProductImage } from "@/components/brand/product-image";
import { ShopShell } from "@/components/shell/shop-shell";
import { Alert, Button, Input, Money, PageHeader, Select } from "@/components/ui";

const items = [
  { name: "Basant Basmati Rice", slug: "rice", sizes: ["5 kg", "10 kg", "20 kg"], price: 3150, vat: "0% VAT" },
  { name: "TRS Toor Dal", slug: "pulses-nuts-and-groceries", sizes: ["2 kg", "5 kg"], price: 1290, vat: "0% VAT" },
  { name: "MDH Garam Masala", slug: "powders-and-ground-masala", sizes: ["100 g", "500 g", "1 kg"], price: 845, vat: "0% VAT" },
  { name: "Mango Drink", slug: "drinks", sizes: ["330 ml × 24"], price: 1560, vat: "20% VAT" },
  { name: "Foil Container No. 6a", slug: "restaurant-packing-and-cleaning", sizes: ["Pack of 100"], price: 690, vat: "20% VAT" },
  { name: "Rooh Afza", slug: "sauces", sizes: ["800 ml"], price: 420, vat: "20% VAT" },
];

export default function ShopPreview() {
  return (
    <ShopShell businessName="Spice Route Ltd" basketCount={3} homeHref="/styleguide/shop">
      <PageHeader title="Your catalogue" description="Prices agreed for Spice Route Ltd. All prices exclude VAT." />
      <div className="mb-5 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
          <Input aria-label="Search products" placeholder="Search rice, dal, masala…" className="pl-9" />
        </div>
      </div>
      <Alert tone="info" className="mb-5" title="Add £38.00 more for free delivery" />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <li key={it.name} className="flex gap-3 rounded-[var(--radius-lg)] border border-line bg-raised p-3 sm:flex-col sm:p-0">
            <ProductImage name={it.name} alt={it.name} categorySlug={it.slug} sizeLabel={it.sizes[it.sizes.length - 1]} className="w-24 shrink-0 rounded-[var(--radius-md)] sm:aspect-[4/3] sm:w-full sm:rounded-none sm:rounded-t-[var(--radius-lg)]" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:p-4">
              <div>
                <p className="font-semibold leading-snug">{it.name}</p>
                <p className="text-xs text-ink-muted">{it.vat}</p>
              </div>
              <Select aria-label={`Size for ${it.name}`} defaultValue={it.sizes[it.sizes.length - 1]} disabled={it.sizes.length === 1}>
                {it.sizes.map((s) => <option key={s}>{s}</option>)}
              </Select>
              <div className="mt-auto flex items-center justify-between gap-2">
                <Money pence={it.price} className="text-lg font-bold" />
                <Button size="sm">Add</Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </ShopShell>
  );
}
