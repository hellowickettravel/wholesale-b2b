"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface SizeSelection {
  sizeId: string;
  setSizeId: (id: string) => void;
}

const Ctx = createContext<SizeSelection | null>(null);

/** Shares the chosen pack size between the product tile and the buy box on the product page. */
export function SizeSelectionProvider({ initialSizeId, children }: { initialSizeId: string; children: ReactNode }) {
  const [sizeId, setSizeId] = useState(initialSizeId);
  const value = useMemo(() => ({ sizeId, setSizeId }), [sizeId]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSizeSelection() {
  return useContext(Ctx);
}
