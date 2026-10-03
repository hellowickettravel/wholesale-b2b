/**
 * Split order lines into supplier orders. Stable: suppliers appear in order of first line,
 * lines keep their original order within a supplier.
 */
export interface SplittableLine {
  supplierId: string;
}

export interface SupplierGroup<L extends SplittableLine> {
  supplierId: string;
  lines: L[];
}

export function splitBySupplier<L extends SplittableLine>(lines: L[]): SupplierGroup<L>[] {
  const groups = new Map<string, L[]>();
  for (const line of lines) {
    if (!line.supplierId) throw new Error("every line needs a supplier");
    const g = groups.get(line.supplierId);
    if (g) g.push(line);
    else groups.set(line.supplierId, [line]);
  }
  return [...groups.entries()].map(([supplierId, ls]) => ({ supplierId, lines: ls }));
}
