import { useRef, useState } from "react";
import { toast } from "sonner";
import { Paperclip, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ESTADOS,
  OBRAS,
  formatCLP,
  formatRut,
  hoyISO,
  useGastos,
  validarRut,
  type EstadoGasto,
} from "@/lib/gastos";

type Errores = Partial<Record<"fecha" | "obra" | "rut" | "proveedor" | "monto" | "glosa", string>>;

export function GastoForm() {
  const { agregarGasto } = useGastos();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fecha, setFecha] = useState(hoyISO());
  const [obra, setObra] = useState<string>("");
  const [rut, setRut] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [monto, setMonto] = useState("");
  const [glosa, setGlosa] = useState("");
  const [estado, setEstado] = useState<EstadoGasto>("Pendiente");
  const [adjunto, setAdjunto] = useState<{ nombre: string; dataUrl: string } | null>(null);
  const [errores, setErrores] = useState<Errores>({});

  const montoNumero = Number(monto.replace(/\D/g, ""));

  function validar(): Errores {
    const e: Errores = {};
    if (!fecha) e.fecha = "Ingresa la fecha del gasto.";
    else if (fecha > hoyISO()) e.fecha = "La fecha no puede ser futura.";
    if (!obra) e.obra = "Selecciona la obra o centro de costo.";
    if (!rut.trim()) e.rut = "Ingresa el RUT del proveedor.";
    else if (!validarRut(rut)) e.rut = "RUT inválido (revisa el dígito verificador).";
    if (!proveedor.trim()) e.proveedor = "Ingresa el nombre del proveedor.";
    else if (proveedor.trim().length > 120) e.proveedor = "Máximo 120 caracteres.";
    if (!monto.trim() || montoNumero <= 0) e.monto = "El monto debe ser mayor a 0.";
    else if (montoNumero > 999999999) e.monto = "Monto fuera de rango.";
    if (!glosa.trim()) e.glosa = "La glosa es obligatoria para justificar el gasto.";
    else if (glosa.trim().length < 5) e.glosa = "Describe el motivo (mínimo 5 caracteres).";
    else if (glosa.trim().length > 300) e.glosa = "Máximo 300 caracteres.";
    return e;
  }

  function limpiarParcial() {
    setRut("");
    setProveedor("");
    setMonto("");
    setGlosa("");
    setEstado("Pendiente");
    setAdjunto(null);
    setFecha(hoyISO());
    if (fileRef.current) fileRef.current.value = "";
  }

  function onArchivo(file?: File) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("El archivo supera los 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAdjunto({ nombre: file.name, dataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) {
      toast.error("Revisa los campos marcados en rojo.");
      return;
    }
    agregarGasto({
      fecha,
      obra,
      proveedorRut: formatRut(rut),
      proveedorNombre: proveedor.trim(),
      monto: montoNumero,
      glosa: glosa.trim(),
      estado,
      ...(adjunto ? { adjuntoNombre: adjunto.nombre, adjuntoDataUrl: adjunto.dataUrl } : {}),
    });
    toast.success(`Boleta registrada por ${formatCLP(montoNumero)}`, {
      description: `${obra} · se mantiene la obra seleccionada`,
    });
    limpiarParcial();
  }

  const err = (msg?: string) =>
    msg ? <p className="mt-1 text-xs font-medium text-destructive">{msg}</p> : null;

  return (
    <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-2">
      <div>
        <Label htmlFor="fecha">Fecha del gasto</Label>
        <Input
          id="fecha"
          type="date"
          max={hoyISO()}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="mt-1.5"
        />
        {err(errores.fecha)}
      </div>

      <div>
        <Label>Obra / Centro de costo</Label>
        <Select value={obra} onValueChange={setObra}>
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue placeholder="Selecciona una obra" />
          </SelectTrigger>
          <SelectContent>
            {OBRAS.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {err(errores.obra)}
      </div>

      <div>
        <Label htmlFor="rut">RUT proveedor</Label>
        <Input
          id="rut"
          inputMode="text"
          placeholder="76.543.210-K"
          value={rut}
          onChange={(e) => setRut(e.target.value)}
          onBlur={() => rut && setRut(formatRut(rut))}
          maxLength={13}
          className="mt-1.5 font-mono"
        />
        {err(errores.rut)}
      </div>

      <div>
        <Label htmlFor="proveedor">Nombre proveedor</Label>
        <Input
          id="proveedor"
          placeholder="Ferretería Los Andes Ltda."
          value={proveedor}
          onChange={(e) => setProveedor(e.target.value)}
          maxLength={120}
          className="mt-1.5"
        />
        {err(errores.proveedor)}
      </div>

      <div>
        <Label htmlFor="monto">Monto total (CLP, sin decimales)</Label>
        <Input
          id="monto"
          inputMode="numeric"
          placeholder="45.900"
          value={monto ? new Intl.NumberFormat("es-CL").format(montoNumero) : ""}
          onChange={(e) => setMonto(e.target.value.replace(/\D/g, ""))}
          className="mt-1.5 text-right font-mono tabular-nums"
        />
        {err(errores.monto)}
      </div>

      <div>
        <Label>Estado</Label>
        <Select value={estado} onValueChange={(v) => setEstado(v as EstadoGasto)}>
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:col-span-2">
        <Label htmlFor="glosa">Glosa / Motivo del gasto</Label>
        <Textarea
          id="glosa"
          rows={3}
          maxLength={300}
          placeholder="Compra de fijaciones y silicona para terminaciones piso 8."
          value={glosa}
          onChange={(e) => setGlosa(e.target.value)}
          className="mt-1.5 resize-none"
        />
        <div className="mt-1 flex items-center justify-between">
          {err(errores.glosa) ?? <span />}
          <span className="text-xs text-muted-foreground">{glosa.length}/300</span>
        </div>
      </div>

      <div className="md:col-span-2">
        <Label htmlFor="adjunto">Respaldo de la boleta (opcional)</Label>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            id="adjunto"
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => onArchivo(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            <Paperclip className="size-4" /> Adjuntar foto
          </Button>
          {adjunto && (
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs">
              {adjunto.nombre}
              <button
                type="button"
                onClick={() => {
                  setAdjunto(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                aria-label="Quitar adjunto"
              >
                <X className="size-3.5" />
              </button>
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button type="submit">
          <Save className="size-4" /> Guardar boleta
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            limpiarParcial();
            setObra("");
            setErrores({});
          }}
        >
          Limpiar todo
        </Button>
        <p className="text-xs text-muted-foreground">
          La obra seleccionada se mantiene para cargar boletas consecutivas.
        </p>
      </div>
    </form>
  );
}
