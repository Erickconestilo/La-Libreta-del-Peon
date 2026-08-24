<!-- doc-status
estado: vivo
verificado: 2026-08-24
-->

# F5: contrato de exportacion de rondas

## Objetivo

La exportacion permite entregar el mismo contenido operativo que se ve en
una ronda de TopoField para revision en oficina. No es un informe certificado
ni sustituye la validacion tecnica del equipo responsable.

## Endpoint

```text
GET /api/v1/rounds/:roundId/export?format=csv|xlsx
```

Solo pueden usarlo `admin` y `topografo`. El backend comprueba que la ronda
pertenece a una obra dentro del alcance del actor autenticado. Visitante no
puede leer lecturas de auscultacion.

`format` acepta `csv` y `xlsx`; si se omite, el formato es `csv`. Cualquier
otro valor devuelve un error de validacion.

## Contrato canonico

El contrato compartido `RoundExportRow` en `shared/types.ts` es la unica
fuente de columnas para ambos formatos. Cada fila representa una lectura.
Los puntos sin lectura tambien generan una fila con los campos de lectura
vacios, para que una ronda incompleta no parezca completa al exportarla.

Las columnas son:

```text
obra_codigo, obra_nombre, ronda_nombre, ronda_fecha, ronda_estado,
codigo_punto, nombre_punto, pk, zona, tramo, seccion, lado, instrumento,
estado_punto, fecha_lectura, valor_numerico, valor_texto, unidad, notas,
operador, estado_lectura, delta, estado_umbral, adjuntos
```

`delta` y `estado_umbral` se recalculan con la misma regla de umbrales del
backend; no se persisten como columnas nuevas. Cuando no hay lectura previa,
`delta` queda vacio. Cuando no existe umbral aplicable, el estado requiere
revision y no debe interpretarse como normal.

## Formatos

- CSV: UTF-8 con BOM, cabecera estable, CRLF y escape RFC 4180 para comas,
  comillas y saltos de linea.
- XLSX: tipos numericos y fechas reales, filtros en la cabecera, primera fila
  congelada y formato de fecha/hora legible.
- Ambos formatos se generan desde las mismas filas canonicas, evitando que
  una exportacion diverja de la otra.

## Dependencia y riesgo

El backend usa `exceljs@4.4.0`. La auditoria de produccion del workspace
mantiene dos vulnerabilidades moderadas transitorias relacionadas con
`uuid`; `npm audit fix --force` propone degradar ExcelJS a una version mayor
con cambio incompatible, por lo que no se aplica automaticamente. Debe
revisarse antes de un despliegue de produccion.

## Verificacion

```powershell
npm run build --workspace apps/backend
npm test --workspace apps/backend
```

La prueba unitaria verifica el orden de 24 columnas, escape CSV y que XLSX
se genera como un archivo ZIP valido.
