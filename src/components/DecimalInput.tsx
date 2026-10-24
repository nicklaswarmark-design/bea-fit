import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

/** Parse Swedish or English decimal ("7,5" / "7.5"). Empty → 0. */
export function parseDecimal(s: string): number {
  const n = Number(s.replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function fmtDecimal(n: number): string {
  return n ? String(n).replace(".", ",") : "";
}

type Props = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number;
  onValueChange: (n: number) => void;
  integer?: boolean;
};

/** Text input that never shows a forced 0 and accepts comma decimals. */
export function DecimalInput({ value, onValueChange, integer, ...rest }: Props) {
  const [text, setText] = useState(fmtDecimal(value));
  useEffect(() => {
    if (parseDecimal(text) !== value) setText(fmtDecimal(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Input
      {...rest}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      autoComplete="off"
      value={text}
      onChange={(e) => {
        const re = integer ? /^\d*$/ : /^\d*([.,]\d{0,2})?$/;
        const v = e.target.value;
        if (!re.test(v)) return;
        setText(v);
        onValueChange(integer ? Math.round(parseDecimal(v)) : parseDecimal(v));
      }}
    />
  );
}
