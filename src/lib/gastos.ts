import { useCallback, useEffect, useState } from "react";

export const OBRAS = [
  "Edificio Vertiente Norte",
  "Torre Los Almendros",
  "Condominio Alto Mirador",
  "Edificio Costanera 1450",
] as const;

export type Obra = (typeof OBRAS)[number];
export type EstadoGasto = "Pendiente" | "Aprobado" | "Rechazado";
export const ESTADOS: EstadoGasto[] = ["Pendiente", "Aprobado", "Rechazado"];

export type Gasto = {
  id: string;
  fecha: string; // yyyy-mm-dd
  obra: string;
  proveedorRut: string;
  proveedorNombre: string;
  monto: number;
  glosa: string;
  estado: EstadoGasto;
  adjuntoNombre?: string;
  adjuntoDataUrl?: string;
  rendicionId?: string;
  creadoEn: string;
};

export type Rendicion = {
  id: string;
  folio: string;
  obra: string;
  responsable: string;
  creadaEn: string;
  gastoIds: string[];
};

const GASTOS_KEY = "cv_gastos_v0";
const RENDICIONES_KEY = "cv_rendiciones_v0";

/* ---------- utilidades ---------- */

export function formatCLP(monto: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(monto || 0);
}

export function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function hoyISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function limpiarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function formatRut(rut: string): string {
  const limpio = limpiarRut(rut);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}

export function validarRut(rut: string): boolean {
  const limpio = limpiarRut(rut);
  if (limpio.length < 8 || limpio.length > 9) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return dv === dvEsperado;
}

/* ---------- persistencia local ---------- */

function leer<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function escribir<T>(key: string, valor: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(valor));
  window.dispatchEvent(new CustomEvent("cv-store-change"));
}

export function useGastos() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [rendiciones, setRendiciones] = useState<Rendicion[]>([]);
  const [cargado, setCargado] = useState(false);

  const refrescar = useCallback(() => {
    setGastos(leer<Gasto>(GASTOS_KEY));
    setRendiciones(leer<Rendicion>(RENDICIONES_KEY));
  }, []);

  useEffect(() => {
    refrescar();
    setCargado(true);
    const handler = () => refrescar();
    window.addEventListener("cv-store-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("cv-store-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, [refrescar]);

  const agregarGasto = useCallback((gasto: Omit<Gasto, "id" | "creadoEn">) => {
    const nuevo: Gasto = {
      ...gasto,
      id: crypto.randomUUID(),
      creadoEn: new Date().toISOString(),
    };
    escribir(GASTOS_KEY, [nuevo, ...leer<Gasto>(GASTOS_KEY)]);
    return nuevo;
  }, []);

  const actualizarEstado = useCallback((id: string, estado: EstadoGasto) => {
    escribir(
      GASTOS_KEY,
      leer<Gasto>(GASTOS_KEY).map((g) => (g.id === id ? { ...g, estado } : g)),
    );
  }, []);

  const eliminarGasto = useCallback((id: string) => {
    escribir(
      GASTOS_KEY,
      leer<Gasto>(GASTOS_KEY).filter((g) => g.id !== id),
    );
  }, []);

  const crearRendicion = useCallback(
    (datos: { obra: string; responsable: string; gastoIds: string[] }) => {
      const actuales = leer<Rendicion>(RENDICIONES_KEY);
      const rendicion: Rendicion = {
        id: crypto.randomUUID(),
        folio: `R-${String(actuales.length + 1).padStart(4, "0")}`,
        obra: datos.obra,
        responsable: datos.responsable,
        creadaEn: new Date().toISOString(),
        gastoIds: datos.gastoIds,
      };
      escribir(RENDICIONES_KEY, [rendicion, ...actuales]);
      escribir(
        GASTOS_KEY,
        leer<Gasto>(GASTOS_KEY).map((g) =>
          datos.gastoIds.includes(g.id) ? { ...g, rendicionId: rendicion.id } : g,
        ),
      );
      return rendicion;
    },
    [],
  );

  const eliminarRendicion = useCallback((id: string) => {
    escribir(
      RENDICIONES_KEY,
      leer<Rendicion>(RENDICIONES_KEY).filter((r) => r.id !== id),
    );
    escribir(
      GASTOS_KEY,
      leer<Gasto>(GASTOS_KEY).map((g) =>
        g.rendicionId === id ? { ...g, rendicionId: undefined } : g,
      ),
    );
  }, []);

  return {
    gastos,
    rendiciones,
    cargado,
    agregarGasto,
    actualizarEstado,
    eliminarGasto,
    crearRendicion,
    eliminarRendicion,
  };
}

export function descargarCSV(nombre: string, gastos: Gasto[]) {
  const encabezado = ["Fecha", "Obra", "RUT Proveedor", "Proveedor", "Monto", "Glosa", "Estado"];
  const filas = gastos.map((g) => [
    formatFecha(g.fecha),
    g.obra,
    g.proveedorRut,
    g.proveedorNombre,
    String(g.monto),
    g.glosa.replace(/"/g, "'"),
    g.estado,
  ]);
  const csv = [encabezado, ...filas]
    .map((fila) => fila.map((c) => `"${c}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
