import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Trash2 } from "lucide-react";

import { EstadoBadge } from "@/components/EstadoBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ESTADOS,
  OBRAS,
  descargarCSV,
  formatCLP,
  formatFecha,
  useGastos,
  type EstadoGasto,
} from "@/lib/gastos";

export const Route = createFileRoute("/gastos")({
  head: () => ({
    meta: [
      { title: "Consolidado de gastos | Rendición Vertiente" },
      {
        name: "description",
        content: "Filtra, ordena y agrupa las boletas de las obras para generar rendiciones.",
      },
      { property: "og:title", content: "Consolidado de gastos | Rendición Vertiente" },
      {
        property: "og:description",
        content: "Tabla consolidada de gastos por obra, proveedor y estado.",
      },
    ],
  }),
  component: GastosPage,
});

type OrdenCampo = "fecha" | "monto" | "obra";

function GastosPage() {
  const { gastos, actualizarEstado, eliminarGasto, crearRendicion } = useGastos();
  const [obra, setObra] = useState("todas");
  const [estado, setEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [orden, setOrden] = useState<OrdenCampo>("fecha");
  const [asc, setAsc] = useState(false);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [responsable, setResponsable] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = gastos.filter((g) => {
      if (obra !== "todas" && g.obra !== obra) return false;
      if (estado !== "todos" && g.estado !== estado) return false;
      if (desde && g.fecha < desde) return false;
      if (hasta && g.fecha > hasta) return false;
      if (
        q &&
        !`${g.proveedorNombre} ${g.proveedorRut} ${g.glosa}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    return lista.sort((a, b) => {
      const factor = asc ? 1 : -1;
      if (orden === "monto") return (a.monto - b.monto) * factor;
      if (orden === "obra") return a.obra.localeCompare(b.obra) * factor;
      return a.fecha.localeCompare(b.fecha) * factor;
    });
  }, [gastos, obra, estado, busqueda, desde, hasta, orden, asc]);

  const total = filtrados.reduce((acc, g) => acc + g.monto, 0);
  const seleccionados = filtrados.filter((g) => seleccion.includes(g.id));
  const totalSeleccion = seleccionados.reduce((acc, g) => acc + g.monto, 0);
  const obrasSeleccion = new Set(seleccionados.map((g) => g.obra));

  function toggle(id: string) {
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function generarRendicion() {
    if (seleccionados.length === 0) {
      toast.error("Selecciona al menos una boleta.");
      return;
    }
    if (obrasSeleccion.size > 1) {
      toast.error("Una rendición debe agrupar boletas de una sola obra.");
      return;
    }
    if (!responsable.trim()) {
      toast.error("Indica el responsable de la rendición.");
      return;
    }
    if (seleccionados.some((g) => g.rendicionId)) {
      toast.error("Hay boletas que ya pertenecen a una rendición.");
      return;
    }
    const r = crearRendicion({
      obra: seleccionados[0]!.obra,
      responsable: responsable.trim(),
      gastoIds: seleccionados.map((g) => g.id),
    });
    setSeleccion([]);
    setResponsable("");
    toast.success(`Rendición ${r.folio} generada`, {
      description: `${seleccionados.length} boletas · ${formatCLP(totalSeleccion)}`,
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Consolidado de gastos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtrados.length} boletas · Total filtrado{" "}
            <span className="font-mono font-medium text-foreground">{formatCLP(total)}</span>
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (filtrados.length === 0) {
              toast.error("No hay datos para exportar.");
              return;
            }
            descargarCSV("gastos_consolidado", filtrados);
          }}
        >
          <FileSpreadsheet className="size-4" /> Exportar CSV
        </Button>
      </header>

      <Card className="mb-6">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <Label>Obra</Label>
            <Select value={obra} onValueChange={setObra}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las obras</SelectItem>
                {OBRAS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="desde">Desde</Label>
            <Input
              id="desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="hasta">Hasta</Label>
            <Input
              id="hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="q">Buscar</Label>
            <Input
              id="q"
              placeholder="Proveedor, RUT o glosa"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-6">
          <div>
            <CardTitle className="text-base">Boletas</CardTitle>
            <CardDescription>
              Selecciona boletas de una misma obra para agruparlas en una rendición.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="resp" className="text-xs">
                Responsable
              </Label>
              <Input
                id="resp"
                placeholder="Sonia Espinoza"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="mt-1 h-9 w-48"
              />
            </div>
            <Button onClick={generarRendicion}>
              <Download className="size-4" /> Generar rendición ({seleccionados.length})
            </Button>
          </div>
        </div>
        <CardContent className="overflow-x-auto pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>
                  <BotonOrden campo="fecha" orden={orden} asc={asc} setOrden={setOrden} setAsc={setAsc}>
                    Fecha
                  </BotonOrden>
                </TableHead>
                <TableHead>
                  <BotonOrden campo="obra" orden={orden} asc={asc} setOrden={setOrden} setAsc={setAsc}>
                    Obra
                  </BotonOrden>
                </TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Glosa</TableHead>
                <TableHead className="text-right">
                  <BotonOrden campo="monto" orden={orden} asc={asc} setOrden={setOrden} setAsc={setAsc}>
                    Monto
                  </BotonOrden>
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No hay boletas que cumplan los filtros.
                  </TableCell>
                </TableRow>
              )}
              {filtrados.map((g) => (
                <TableRow key={g.id} className={g.rendicionId ? "bg-secondary/50" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={seleccion.includes(g.id)}
                      onCheckedChange={() => toggle(g.id)}
                      disabled={Boolean(g.rendicionId)}
                      aria-label="Seleccionar boleta"
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-sm">
                    {formatFecha(g.fecha)}
                  </TableCell>
                  <TableCell className="text-sm">{g.obra}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{g.proveedorNombre}</div>
                    <div className="font-mono text-xs text-muted-foreground">{g.proveedorRut}</div>
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">{g.glosa}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCLP(g.monto)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={g.estado}
                      onValueChange={(v) => actualizarEstado(g.id, v as EstadoGasto)}
                    >
                      <SelectTrigger className="h-8 w-[130px] border-none bg-transparent px-1 shadow-none">
                        <EstadoBadge estado={g.estado} />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map((e) => (
                          <SelectItem key={e} value={e}>
                            {e}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Eliminar boleta"
                      onClick={() => {
                        eliminarGasto(g.id);
                        toast.success("Boleta eliminada");
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function BotonOrden({
  campo,
  orden,
  asc,
  setOrden,
  setAsc,
  children,
}: {
  campo: OrdenCampo;
  orden: OrdenCampo;
  asc: boolean;
  setOrden: (c: OrdenCampo) => void;
  setAsc: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium hover:text-primary"
      onClick={() => {
        if (orden === campo) setAsc(!asc);
        else {
          setOrden(campo);
          setAsc(true);
        }
      }}
    >
      {children}
      <span className="text-xs">{orden === campo ? (asc ? "▲" : "▼") : ""}</span>
    </button>
  );
}
