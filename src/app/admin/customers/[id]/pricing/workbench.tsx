"use client";
import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Copy, Eye, EyeOff, Search, Undo2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { bpToInput, formatBp, formatPence, parsePercent, parsePounds, penceToInput } from "@/domain/money";
import { resolvePrice, type PricingRules, type ResolvedPrice } from "@/domain/pricing";
import { isProductVisible, type ProductRuleMode, type VisibilityRules } from "@/domain/visibility";
import { cn } from "@/lib/cn";
import { copyPricing, savePricing, type PricingResult } from "./actions";

export interface WorkbenchData {
  customerId: string;
  globalMarginBp: number;
  initial: {
    defaultMarginBp: number | null;
    access: string[];
    categoryMarginsBp: Record<string, number>;
    productRules: Record<string, ProductRuleMode>;
    overridesPence: Record<string, number>;
  };
  categories: { id: string; name: string; active: boolean; productCount: number }[];
  products: { id: string; name: string; categoryId: string; active: boolean; sizes: { id: string; label: string; costPence: number | null; active: boolean }[] }[];
  others: { id: string; name: string }[];
}

type Show = "all" | "visible" | "hidden" | "fixed" | "unpriced";
const PAGE = 25;
const control =
  "h-9 rounded-[var(--radius-sm)] border border-line-strong bg-raised px-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/15";

/** "" -> null; "12.5" -> 1250; invalid -> undefined. */
function marginInput(s: string): number | null | undefined {
  if (s.trim() === "") return null;
  const bp = parsePercent(s);
  return bp === null || bp < -10000 || bp > 100000 ? undefined : bp;
}
function priceInput(s: string): number | null | undefined {
  if (s.trim() === "") return null;
  const p = parsePounds(s);
  return p === null || p < 0 || p > 100_000_000 ? undefined : p;
}

function stateFrom(d: WorkbenchData) {
  return {
    defaultMargin: d.initial.defaultMarginBp === null ? "" : bpToInput(d.initial.defaultMarginBp),
    cats: Object.fromEntries(
      d.categories.map((c) => [c.id, { access: d.initial.access.includes(c.id), margin: d.initial.categoryMarginsBp[c.id] === undefined ? "" : bpToInput(d.initial.categoryMarginsBp[c.id]) }]),
    ) as Record<string, { access: boolean; margin: string }>,
    rules: { ...d.initial.productRules } as Record<string, ProductRuleMode>,
    prices: Object.fromEntries(Object.entries(d.initial.overridesPence).map(([k, v]) => [k, penceToInput(v)])) as Record<string, string>,
  };
}

export function PricingWorkbench({ data }: { data: WorkbenchData }) {
  const [s, setS] = useState(() => stateFrom(data));
  // After a save or copy the server sends the new saved rules: start again from them.
  const signature = JSON.stringify(data.initial);
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setS(stateFrom(data));
  }
  const [result, setResult] = useState<PricingResult>({});
  const [saving, startSave] = useTransition();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [show, setShow] = useState<Show>("all");
  const [page, setPage] = useState(1);
  const [copyFrom, setCopyFrom] = useState("");
  const [copying, startCopy] = useTransition();

  const catName = useMemo(() => new Map(data.categories.map((c) => [c.id, c.name])), [data.categories]);

  // ----- parse the editable state into pricing + visibility rules (the live preview)
  const defaultBp = marginInput(s.defaultMargin);
  const catMargins: Record<string, number> = {};
  const badCats = new Set<string>();
  for (const [id, c] of Object.entries(s.cats)) {
    const bp = marginInput(c.margin);
    if (bp === undefined) badCats.add(id);
    else if (bp !== null) catMargins[id] = bp;
  }
  const overrides: Record<string, number> = {};
  const badPrices = new Set<string>();
  for (const [id, v] of Object.entries(s.prices)) {
    const p = priceInput(v);
    if (p === undefined) badPrices.add(id);
    else if (p !== null) overrides[id] = p;
  }
  const pricing: PricingRules = {
    globalMarginBp: data.globalMarginBp,
    customerDefaultMarginBp: defaultBp ?? null,
    categoryMarginsBp: catMargins,
    overridesPence: overrides,
  };
  const visibility: VisibilityRules = {
    categoryIds: new Set(Object.entries(s.cats).filter(([, c]) => c.access).map(([id]) => id)),
    productRules: s.rules,
  };
  const invalid = defaultBp === undefined || badCats.size > 0 || badPrices.size > 0;

  // ----- what changed since the last save
  const ruleChanges: Record<string, ProductRuleMode | null> = {};
  for (const id of new Set([...Object.keys(data.initial.productRules), ...Object.keys(s.rules)])) {
    if ((data.initial.productRules[id] ?? null) !== (s.rules[id] ?? null)) ruleChanges[id] = s.rules[id] ?? null;
  }
  const priceChanges: Record<string, number | null> = {};
  for (const id of new Set([...Object.keys(data.initial.overridesPence), ...Object.keys(s.prices)])) {
    if (badPrices.has(id)) continue;
    const now = overrides[id] ?? null;
    if ((data.initial.overridesPence[id] ?? null) !== now) priceChanges[id] = now;
  }
  const catChanges = data.categories.filter((c) => {
    const now = s.cats[c.id];
    return now.access !== data.initial.access.includes(c.id) || (catMargins[c.id] ?? null) !== (data.initial.categoryMarginsBp[c.id] ?? null);
  }).length;
  const defaultChanged = (defaultBp ?? null) !== data.initial.defaultMarginBp && defaultBp !== undefined;
  const changes = (defaultChanged ? 1 : 0) + catChanges + Object.keys(ruleChanges).length + Object.keys(priceChanges).length;

  const effectiveDefault = defaultBp ?? data.globalMarginBp;

  // ----- product list
  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return data.products.filter((p) => {
      if (cat && p.categoryId !== cat) return false;
      const name = p.name.toLowerCase();
      if (!words.every((w) => name.includes(w))) return false;
      const visible = p.active && isProductVisible(p.id, p.categoryId, visibility);
      if (show === "visible") return visible;
      if (show === "hidden") return !visible;
      if (show === "fixed") return p.sizes.some((v) => overrides[v.id] !== undefined || s.prices[v.id]);
      if (show === "unpriced") return visible && p.sizes.some((v) => v.active && v.costPence === null && overrides[v.id] === undefined);
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed from the parsed state each render
  }, [data.products, q, cat, show, s]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pageCount);
  const visibleCount = data.products.filter((p) => p.active && isProductVisible(p.id, p.categoryId, visibility)).length;

  const save = () =>
    startSave(async () => {
      setResult({});
      const r = await savePricing(data.customerId, {
        defaultMarginBp: defaultBp ?? null,
        categories: data.categories.map((c) => ({ id: c.id, access: s.cats[c.id].access, marginBp: catMargins[c.id] ?? null })),
        productRules: ruleChanges,
        overrides: priceChanges,
      });
      setResult(r);
    });

  const sourceLabel = (r: ResolvedPrice, categoryId: string) => {
    if (!r.priced) return "No cost yet";
    if (r.source === "override") return `Fixed price${r.marginBp !== null ? `, ${formatBp(r.marginBp)} margin` : ""}`;
    if (r.source === "category") return `${catName.get(categoryId)} margin ${formatBp(r.marginBp!)}`;
    if (r.source === "customer") return `Their default ${formatBp(r.marginBp!)}`;
    return `Global margin ${formatBp(r.marginBp!)}`;
  };

  return (
    <div className="space-y-6 pb-24">
      {result.error ? <Alert tone="danger">{result.error}</Alert> : null}
      {result.notice ? <Alert tone="success">{result.notice}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0">
          <CardHeader
            title="Margins and categories"
            description={`A price comes from, in order: a fixed price for that size, the category margin, their default margin, then the global margin (${formatBp(data.globalMarginBp)}).`}
          />
          <CardBody className="space-y-5">
            <label className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-ink">Their default margin</span>
              <span className="inline-flex items-center gap-1.5">
                <input
                  className={cn(control, "w-24 tabular")}
                  inputMode="decimal"
                  value={s.defaultMargin}
                  placeholder={bpToInput(data.globalMarginBp)}
                  aria-invalid={defaultBp === undefined || undefined}
                  aria-label="Default margin per cent"
                  onChange={(e) => setS({ ...s, defaultMargin: e.target.value })}
                />
                <span className="text-sm text-ink-muted">%</span>
              </span>
              <span className="text-[13px] text-ink-muted">{s.defaultMargin ? "" : "Blank uses the global margin."}</span>
            </label>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <th className="py-2 pr-3">Shows</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="hidden py-2 pr-3 text-right sm:table-cell">Products</th>
                    <th className="py-2">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.map((c) => {
                    const st = s.cats[c.id];
                    return (
                      <tr key={c.id} className="border-b border-line last:border-0">
                        <td className="py-2 pr-3">
                          <input
                            type="checkbox"
                            className="size-4 accent-[var(--brand-primary)]"
                            checked={st.access}
                            aria-label={`Show ${c.name}`}
                            onChange={(e) => setS({ ...s, cats: { ...s.cats, [c.id]: { ...st, access: e.target.checked } } })}
                          />
                        </td>
                        <td className={cn("py-2 pr-3 font-medium", st.access ? "text-ink" : "text-ink-subtle")}>
                          {c.name} {c.active ? null : <Badge tone="neutral">Hidden on site</Badge>}
                        </td>
                        <td className="tabular hidden py-2 pr-3 text-right text-ink-muted sm:table-cell">{c.productCount}</td>
                        <td className="py-2">
                          <input
                            className={cn(control, "w-20 tabular sm:w-24")}
                            inputMode="decimal"
                            value={st.margin}
                            placeholder={bpToInput(effectiveDefault)}
                            aria-label={`${c.name} margin per cent`}
                            aria-invalid={badCats.has(c.id) || undefined}
                            onChange={(e) => setS({ ...s, cats: { ...s.cats, [c.id]: { ...st, margin: e.target.value } } })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="What they see" />
            <CardBody>
              <p className="tabular text-3xl font-bold text-ink">{visibleCount}</p>
              <p className="text-sm text-ink-muted">of {data.products.filter((p) => p.active).length} products on sale, with these settings.</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Copy from another restaurant" description="Replaces this restaurant's categories, rules, margins and fixed prices." />
            <CardBody className="space-y-3">
              {data.others.length ? (
                <>
                  <label className="block">
                    <span className="sr-only">Restaurant to copy from</span>
                    <select className={cn(control, "w-full")} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
                      <option value="">Choose a restaurant…</option>
                      {data.others.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </label>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!copyFrom}
                    loading={copying}
                    icon={<Copy className="size-4" aria-hidden="true" />}
                    onClick={() => {
                      const name = data.others.find((o) => o.id === copyFrom)?.name;
                      if (!window.confirm(`Replace this restaurant's catalogue and prices with ${name}'s? Unsaved changes here are lost.`)) return;
                      startCopy(async () => setResult(await copyPricing(data.customerId, copyFrom)));
                    }}
                  >
                    Copy prices
                  </Button>
                </>
              ) : (
                <p className="text-sm text-ink-muted">No other approved restaurants yet.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Products and fixed prices" description="Live preview: prices update as you type. A fixed price wins over every margin." />
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search products</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
              <input className={cn(control, "h-10 w-full pl-9")} type="search" placeholder="Search products" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            </label>
            <label>
              <span className="sr-only">Category</span>
              <select className={cn(control, "h-10 w-full lg:w-56")} value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }}>
                <option value="">All categories</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Show</span>
              <select className={cn(control, "h-10 w-full lg:w-48")} value={show} onChange={(e) => { setShow(e.target.value as Show); setPage(1); }}>
                <option value="all">All products</option>
                <option value="visible">Visible to them</option>
                <option value="hidden">Hidden from them</option>
                <option value="fixed">With a fixed price</option>
                <option value="unpriced">Visible, needs a cost</option>
              </select>
            </label>
          </div>
          <p className="tabular text-sm text-ink-muted" aria-live="polite">{rows.length} products</p>

          <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
            {rows.slice((current - 1) * PAGE, current * PAGE).map((p) => {
              const rule = s.rules[p.id];
              const inCat = s.cats[p.categoryId]?.access;
              const visible = p.active && isProductVisible(p.id, p.categoryId, visibility);
              return (
                <li key={p.id} className="p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className={cn("font-semibold", visible ? "text-ink" : "text-ink-subtle")}>
                        {visible ? <Eye className="mr-1.5 inline size-4 text-success" aria-label="Visible" /> : <EyeOff className="mr-1.5 inline size-4" aria-label="Hidden" />}
                        {p.name}
                      </p>
                      <p className="text-[13px] text-ink-muted">
                        {catName.get(p.categoryId)}
                        {p.active ? null : ", not on sale"}
                      </p>
                    </div>
                    <label className="shrink-0">
                      <span className="sr-only">Visibility of {p.name}</span>
                      <select
                        className={cn(control, "w-full sm:w-56")}
                        value={rule ?? "default"}
                        onChange={(e) => {
                          const next = { ...s.rules };
                          if (e.target.value === "default") delete next[p.id];
                          else next[p.id] = e.target.value as ProductRuleMode;
                          setS({ ...s, rules: next });
                        }}
                      >
                        <option value="default">As its category ({inCat ? "shown" : "hidden"})</option>
                        <option value="allow">Always show</option>
                        <option value="deny">Never show</option>
                      </select>
                    </label>
                  </div>
                  {p.sizes.length ? (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead>
                          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                            <th className="pb-1.5 pr-3 font-semibold">Size</th>
                            <th className="pb-1.5 pr-3 text-right font-semibold">Cost</th>
                            <th className="pb-1.5 pr-3 text-right font-semibold">Their price</th>
                            <th className="pb-1.5 pr-3 font-semibold">How</th>
                            <th className="pb-1.5 font-semibold">Fixed price £</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.sizes.map((v) => {
                            const r = resolvePrice({ variantId: v.id, categoryId: p.categoryId, costPence: v.costPence }, pricing);
                            return (
                              <tr key={v.id} className={cn("border-t border-line", !v.active && "opacity-60")}>
                                <td className="py-1.5 pr-3">{v.label}{v.active ? null : " (off sale)"}</td>
                                <td className="tabular py-1.5 pr-3 text-right text-ink-muted">{v.costPence === null ? "—" : formatPence(v.costPence)}</td>
                                <td className={cn("tabular py-1.5 pr-3 text-right font-semibold", visible ? "text-ink" : "text-ink-subtle")}>
                                  {r.priced ? formatPence(r.pricePence) : <Badge tone="warning">No price</Badge>}
                                </td>
                                <td className="py-1.5 pr-3 text-[13px] text-ink-muted">{sourceLabel(r, p.categoryId)}</td>
                                <td className="py-1.5">
                                  <input
                                    className={cn(control, "w-24 tabular")}
                                    inputMode="decimal"
                                    placeholder="—"
                                    value={s.prices[v.id] ?? ""}
                                    aria-label={`Fixed price for ${p.name} ${v.label}`}
                                    aria-invalid={badPrices.has(v.id) || undefined}
                                    onChange={(e) => setS({ ...s, prices: { ...s.prices, [v.id]: e.target.value } })}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-ink-muted">No sizes yet.</p>
                  )}
                </li>
              );
            })}
            {rows.length === 0 ? <li className="p-6 text-center text-sm text-ink-muted">No products match.</li> : null}
          </ul>
          {pageCount > 1 ? (
            <nav aria-label="Product pages" className="flex items-center justify-between gap-3">
              <Button size="sm" variant="secondary" disabled={current <= 1} onClick={() => setPage(current - 1)} icon={<ChevronLeft className="size-4" aria-hidden="true" />}>Previous</Button>
              <span className="tabular text-sm text-ink-muted">Page {current} of {pageCount}</span>
              <Button size="sm" variant="secondary" disabled={current >= pageCount} onClick={() => setPage(current + 1)}>
                Next <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </nav>
          ) : null}
        </CardBody>
      </Card>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-raised/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(24,33,29,0.25)] backdrop-blur transition-transform lg:left-[248px]",
          changes > 0 || saving ? "translate-y-0" : "invisible translate-y-full",
        )}
        aria-hidden={changes === 0 && !saving}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink">
            {invalid ? <span className="text-danger">Fix the highlighted values to save.</span> : `${changes} unsaved ${changes === 1 ? "change" : "changes"}`}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" icon={<Undo2 className="size-4" aria-hidden="true" />} disabled={saving} onClick={() => setS(stateFrom(data))}>Discard</Button>
            <Button size="sm" loading={saving} disabled={invalid || changes === 0} onClick={save}>Save changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
