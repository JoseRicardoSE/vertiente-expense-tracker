import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, ReceiptText, Wallet } from "lucide-react";

import { GastoForm } from "@/components/GastoForm";
import { EstadoBadge } from "@/components/EstadoBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCLP, formatFecha, useGastos } from "@/lib/gastos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ingreso de boletas | Rendición de Gastos Vertiente" },
      {
        name: "description",
        content:
          "Registra boletas de obra con validación de RUT, montos y fechas en menos de un minuto.",
      },
      { property: "og:title", content: "Ingreso de boletas | Rendición de Gastos Vertiente" },
      {
        property: "og:description",
        content: "Formulario validado para digitalizar boletas de las obras de Constructora Vertiente.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { gastos, cargado } = useGastos();
  const recientes = gastos.slice(0, 5);
  const totalMes = gastos
    .filter((g) => g.fecha.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((acc, g) => acc + g.monto, 0);
  const pendientes = gastos.filter((g) => g.estado === "Pendiente").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Ingreso de boletas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro manual estructurado. Todos los campos se validan en tiempo real.
        </p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Indicador
          icono={<ReceiptText className="size-4" />}
          titulo="Boletas registradas"
          valor={cargado ? String(gastos.length) : "—"}
        />
        <Indicador
          icono={<Wallet className="size-4" />}
          titulo="Gasto del mes"
          valor={cargado ? formatCLP(totalMes) : "—"}
        />
        <Indicador
          icono={<FileText className="size-4" />}
          titulo="Pendientes de aprobación"
          valor={cargado ? String(pendientes) : "—"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Nueva boleta</CardTitle>
            <CardDescription>
              Fecha, obra, proveedor, monto y glosa son obligatorios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GastoForm />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Últimos ingresos</CardTitle>
            <CardDescription>Verificación rápida de lo recién cargado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recientes.length === 0 && (
              <p className="text-sm text-muted-foreground">Aún no hay boletas registradas.</p>
            )}
            {recientes.map((g) => (
              <div key={g.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{g.proveedorNombre}</span>
                  <span className="font-mono text-sm tabular-nums">{formatCLP(g.monto)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{g.glosa}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {formatFecha(g.fecha)} · {g.obra}
                  </span>
                  <EstadoBadge estado={g.estado} />
                </div>
              </div>
            ))}
            <Link
              to="/gastos"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver consolidado <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Indicador({
  icono,
  titulo,
  valor,
}: {
  icono: React.ReactNode;
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icono}
        {titulo}
      </div>
      <p className="mt-2 font-mono text-xl font-semibold tabular-nums">{valor}</p>
    </div>
  );
}
