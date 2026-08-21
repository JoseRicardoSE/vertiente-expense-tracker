import type { EstadoGasto } from "@/lib/gastos";
import { cn } from "@/lib/utils";

const estilos: Record<EstadoGasto, string> = {
  Pendiente: "bg-warning/15 text-warning-foreground border-warning/40",
  Aprobado: "bg-success/12 text-success border-success/40",
  Rechazado: "bg-destructive/10 text-destructive border-destructive/40",
};

export function EstadoBadge({ estado }: { estado: EstadoGasto }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        estilos[estado],
      )}
    >
      {estado}
    </span>
  );
}
