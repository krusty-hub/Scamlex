import { Braces, ShieldCheck } from "lucide-react";

export function ScamlexBrand({ inverted = false }: { inverted?: boolean }) {
  return (
    <a href="#top" className="group inline-flex items-center gap-2.5" aria-label="Scamlex home">
      <span
        className={`grid size-9 place-items-center rounded-md ${inverted ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"}`}
      >
        <ShieldCheck className="size-5" strokeWidth={2.25} />
      </span>
      <span className={`font-display text-xl font-bold ${inverted ? "text-primary-foreground" : "text-foreground"}`}>
        Scam<span className={inverted ? "text-brand-lime" : "text-primary"}>lex</span>
      </span>
      <Braces className={`size-3.5 opacity-40 ${inverted ? "text-primary-foreground" : "text-foreground"}`} />
    </a>
  );
}