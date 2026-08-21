import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileSpreadsheet, Printer, Trash2 } from "lucide-react";

import { EstadoBadge } from "@/components/EstadoBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { descargarCSV, formatCLP, formatFecha, useGastos } from "@/lib/gastos";

export const Route = createFileRoute("/rendiciones")({
  head: () => ({
    meta: [
      { title: "Rendiciones | Rendición de Gastos Vertiente" },
      {
        name: "description",
        content: "Reportes de rendición agrupados por obra, listos para revisión, impresión y pago.",
      },
      { property: "og:title", content: "Rendiciones | Rendición de Gastos Vertiente" },
      {
        property: "og:description",
        content: "Consulta, imprime y exporta las rendiciones generadas por obra.",
      },
    ],
  }),
  component: RendicionesPage,
});

function RendicionesPage() {
  const { rendiciones, gastos, eliminarRendicion } = useGastos();
  const [activa, setActiva] = useState<string | null>(null);
  const seleccionada = rendiciones.find((r) => r.id === (activa ?? rendiciones[0]?.id));
  const detalle = seleccionada
    ? gastos.filter((g) => seleccionada.gastoIds.includes(g.id))
    : [];
  const total = detalle.reduce((acc, g) => acc + g.monto, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 no-print">
        <h1 className="text-2xl font-semibold tracking-tight">Rendiciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reportes consolidados listos para revisión y pago.
        </p>
      </header>

      {rendiciones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aún no hay rendiciones. Genera una desde el consolidado de gastos.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-2 no-print">
            {rendiciones.map((r) => {
              const monto = gastos
                .filter((g) => r.gastoIds.includes(g.id))
                .reduce((acc, g) => acc + g.monto, 0);
              const activo = seleccionada?.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiva(r.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    activo
                      ? "border-primary bg-accent"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold">{r.folio}</span>
                    <span className="font-mono text-sm tabular-nums">{formatCLP(monto)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.obra}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.gastoIds.length} boletas · {new Date(r.creadaEn).toLocaleDateString("es-CL")}
                  </p>
                </button>
              );
            })}
          </div>

          {seleccionada && (
            <Card className="print-area">
              <CardHeader className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>Reporte de rendición {seleccionada.folio}</CardTitle>
                  <CardDescription>
                    {seleccionada.obra} · Responsable: {seleccionada.responsable} · Emitida el{" "}
                    {new Date(seleccionada.creadaEn).toLocaleDateString("es-CL")}
                  </CardDescription>
                </div>
                <div className="flex gap-2 no-print">
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="size-4" /> Imprimir
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => descargarCSV(`rendicion_${seleccionada.folio}`, detalle)}
                  >
                    <FileSpreadsheet className="size-4" /> CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar rendición"
                    onClick={() => {
                      eliminarRendicion(seleccionada.id);
                      setActiva(null);
                      toast.success("Rendición eliminada; las boletas quedan disponibles.");
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Glosa</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalle.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="whitespace-nowrap font-mono text-sm">
                          {formatFecha(g.fecha)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{g.proveedorNombre}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {g.proveedorRut}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{g.glosa}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCLP(g.monto)}
                        </TableCell>
                        <TableCell>
                          <EstadoBadge estado={g.estado} />
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">
                        Total rendición
                      </TableCell>
                      <TableCell className="text-right font-mono text-base font-semibold tabular-nums">
                        {formatCLP(total)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-muted-foreground">
                  <div className="border-t border-border pt-2 text-center">
                    Preparado por: {seleccionada.responsable}
                  </div>
                  <div className="border-t border-border pt-2 text-center">
                    Aprobado por (Administración)
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
