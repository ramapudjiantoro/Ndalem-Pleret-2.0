import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

// ─── Password input helper ────────────────────────────────────────────────────
export function PasswordInput({ value, onChange, placeholder, autoFocus, id }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; autoFocus?: boolean; id?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} className="pr-10"
        placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus} />
      <button type="button" tabIndex={-1} onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
