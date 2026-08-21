# Vertiente Expense Tracker

Brief de Proyecto: Sistema de Rendición de Gastos V0

1. Contexto y Problema

Empresa: Constructora Vertiente (edificación en altura, 4 obras simultáneas).

Usuario Principal: Equipo de Administración de Obras (Sonia Espinoza + 3 administrativas).

Problema Actual: Los jefes de obra envían fotografías de boletas por WhatsApp. El equipo administrativo debe transcribir manualmente cada dato hacia planillas. Este proceso es lento, propenso a errores de tipeo y genera retrasos graves en los reembolsos (ej. 2 semanas de demora por un dato mal cargado).

Restricciones: Desarrollo en 7 semanas utilizando herramientas no-code/low-code (Lovable).

2. Objetivos y Métricas Esperadas (Meta)

Eficiencia: Reducir el tiempo de procesamiento y registro por boleta a menos de 1 minuto.

Calidad: Disminuir la tasa de error de digitación y cuadratura al 0% mediante validaciones de campos (RUT, montos numéricos, fechas).

Consolidación: Generar reportes de rendición listos para revisión y pago de forma instantánea.

3. Alcance de la Versión V0 (MVP)

Para esta primera iteración, la aplicación será 100% de ingreso manual por parte del equipo administrativo o jefes de obra, dejando el procesamiento automatizado con IA (OCR de imágenes) para futuras versiones. La prioridad es estructurar el dato desde el inicio.

Funcionalidades Clave requeridas en Lovable:

Formulario de Ingreso de Boletas: Interfaz limpia para registrar cada documento.

Tabla de Consolidación (Dashboard): Vista donde se agrupan todos los gastos ingresados, permitiendo filtrar y ordenar.

Generación de Rendición: Botón para agrupar una serie de boletas bajo un mismo "Reporte de Rendición" y exportarlo (ej. vista imprimible o CSV).

4. Estructura de Datos (Modelo sugerido para la UI)

El formulario de ingreso debe contener los siguientes campos obligatorios para asegurar que el gasto sea aceptado y validado:

Fecha del Gasto: Selector de fecha (Calendario).

Obra / Centro de Costo: Menú desplegable (Dropdown) con las 4 obras activas.

Proveedor: Campo de texto (idealmente con formato RUT chileno para validación).

Monto Total: Campo numérico (sin decimales, formato moneda).

Glosa / Motivo: Campo de texto fundamental para justificar el gasto y determinar su aceptación.

Estado: Desplegable (Pendiente, Aprobado, Rechazado).

Archivo Adjunto (Opcional en V0): Botón para subir la foto de la boleta y tenerla de respaldo visual junto al registro.

5. Reglas de Interfaz (UI/UX)

Diseño: Profesional, limpio y de alta legibilidad (pensando en usuarias de perfil administrativo que procesan alto volumen de datos). Utilizar una paleta de colores sobria (grises, azules corporativos).

Validaciones en tiempo real: El formulario no debe permitir enviar el gasto si falta la glosa, si el monto es negativo, o si la fecha es futura.

Flujo de trabajo: Tras guardar un gasto, el formulario debe limpiarse rápidamente o mostrar un mensaje de éxito, manteniendo la obra seleccionada para facilitar el ingreso de boletas consecutivas del mismo centro de costo.

6. Fuera de Alcance (Para el Prompt de Lovable)

No incluir en esta generación: Integración con ERP contables, lectura de imágenes con OCR o IA (Mineru/Vision), manejo complejo de presupuestos o solicitudes formales de aumento de fondos al tesorero. El enfoque es puramente la digitalización del registro y la agrupación de las boletas.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0b9458ce-6406-4e85-b0f7-69faa10eb24d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
