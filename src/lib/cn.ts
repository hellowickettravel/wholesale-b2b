import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge resolves conflicts, so a caller's class wins over a component's default (`aspect-[4/3]` over
// `aspect-square`) without `!important`. Our named shadows (globals.css @theme) are taught here; colours and
// the type scale use Tailwind's own names and need nothing.
const merge = extendTailwindMerge({ extend: { theme: { shadow: ["rest", "lift", "plate", "pop"] } } });

export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
