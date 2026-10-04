import { Select } from "@/components/ui/field";
import { bpToInput } from "@/domain/money";

const RATES = [
  { bp: 0, label: "0% (zero-rated)" },
  { bp: 500, label: "5% (reduced)" },
  { bp: 2000, label: "20% (standard)" },
];

/** UK VAT rate picker; keeps a non-standard stored rate selectable rather than losing it. */
export function VatSelect({ name, value, ...rest }: { name: string; value: number; id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean; className?: string }) {
  const options = RATES.some((r) => r.bp === value) ? RATES : [...RATES, { bp: value, label: `${bpToInput(value)}%` }];
  return (
    <Select name={name} defaultValue={bpToInput(value)} {...rest}>
      {options.map((r) => (
        <option key={r.bp} value={bpToInput(r.bp)}>{r.label}</option>
      ))}
    </Select>
  );
}
