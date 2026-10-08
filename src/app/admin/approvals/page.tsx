import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { FilterBar, FilterDates, FilterSearch, FilterSelect } from "@/components/admin/filter-bar";
import { Card } from "@/components/ui/card";
import { EmptyNote } from "@/components/admin/empty-note";
import { PageHeader } from "@/components/ui/page-header";
import { formatTimestamp } from "@/domain/dates";
import { likePattern, searchWords } from "@/lib/catalogue/query";
import { choiceParam, dateParam, dayRange, textParam } from "@/lib/list-params";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Approvals" };

const SORTS = [
  { value: "oldest", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
  { value: "name", label: "Name A to Z" },
] as const;

export default async function ApprovalsPage({ searchParams }: PageProps<"/admin/approvals">) {
  await requireRole("admin");
  const sp = await searchParams;
  const q = textParam(sp);
  const from = dateParam(sp, "from");
  const to = dateParam(sp, "to");
  const sort = choiceParam(sp, "sort", SORTS.map((s) => s.value));
  const filtered = Boolean(q || from || to || sort !== "oldest");
  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id, business_name, contact_name, email, phone, address_line1, city, postcode, created_at")
    .eq("status", "pending")
    .limit(200);
  for (const w of searchWords(q)) query = query.or(`business_name.ilike.${likePattern(w)},contact_name.ilike.${likePattern(w)},email.ilike.${likePattern(w)},postcode.ilike.${likePattern(w)},city.ilike.${likePattern(w)}`);
  const range = dayRange(from, to);
  if (range.gte) query = query.gte("created_at", range.gte);
  if (range.lte) query = query.lte("created_at", range.lte);
  query = sort === "name" ? query.order("business_name") : query.order("created_at", { ascending: sort === "oldest" });
  const { data } = await query;
  const pending = data ?? [];

  return (
    <>
      <PageHeader title="Registration approvals" description="Restaurants that registered and are waiting for you. Open one to approve it, choose its categories and set its prices." />
      <FilterBar action="/admin/approvals" clearHref="/admin/approvals" active={filtered}>
        <FilterSearch id="approvals-q" label="Search" defaultValue={q} placeholder="Business, contact, email, town or postcode" />
        <FilterDates idPrefix="approvals" label="Registered" from={from} to={to} />
        <FilterSelect id="approvals-sort" name="sort" label="Sort" defaultValue={sort} options={SORTS} />
      </FilterBar>
      {pending.length === 0 ? (
        <Card>
          {filtered ? (
            <EmptyNote title="No registrations match">Try another search or date range.</EmptyNote>
          ) : (
            <EmptyNote title="Nobody is waiting">New registrations appear here and in the sidebar badge.</EmptyNote>
          )}
        </Card>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {pending.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/customers/${c.id}`} className="group flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-raised p-5 transition-colors hover:border-primary">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-ink group-hover:text-primary">{c.business_name}</h2>
                    <p className="text-sm text-ink-muted">{c.contact_name ?? "No contact name"}, registered {formatTimestamp(c.created_at)}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
                    Review <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>
                <ul className="grid gap-1.5 text-sm text-ink-muted sm:grid-cols-2">
                  {c.email ? <li className="flex min-w-0 items-center gap-2"><Mail className="size-4 shrink-0" aria-hidden="true" /><span className="truncate">{c.email}</span></li> : null}
                  {c.phone ? <li className="flex items-center gap-2"><Phone className="size-4 shrink-0" aria-hidden="true" />{c.phone}</li> : null}
                  {c.address_line1 || c.postcode ? (
                    <li className="flex min-w-0 items-center gap-2 sm:col-span-2"><MapPin className="size-4 shrink-0" aria-hidden="true" /><span className="truncate">{[c.address_line1, c.city, c.postcode].filter(Boolean).join(", ")}</span></li>
                  ) : null}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
