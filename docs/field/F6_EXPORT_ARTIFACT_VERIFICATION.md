<!-- doc-status
estado: vivo
verificado: 2026-09-18
-->

# Verificación De Artefactos CSV/XLSX

## Propósito

El backend genera ambos formatos desde `RoundExportRow`. La prueba de Jest
comprueba el generador; este comando comprueba dos archivos concretos después
de descargarlos de una ronda real y evita aceptar una exportación solo porque
la petición HTTP devolvió `200`.

## Comando

Desde la raíz del repositorio:

```powershell
npm run build --workspace apps/backend
npm run verify:export-artifacts -- .\ronda.csv .\ronda.xlsx
```

El resultado correcto tiene esta forma, sin imprimir valores de lecturas:

```text
EXPORT_ARTIFACTS_OK csvRows=2 xlsxRows=2 worksheet=Auscultación utf8Bom=true
```

La ruta se puede sustituir por la ubicación donde se hayan guardado los dos
archivos. Si faltan argumentos, no existe la hoja `Auscultación`, cambian las
29 columnas, faltan filas, las filas difieren o el XLSX pierde el filtro y la
cabecera congelada, el comando termina con código distinto de cero.

## Qué comprueba

- Cabecera y orden de las 29 columnas de `RoundExportRow`, incluidas las cinco
  columnas del último resultado operativo del operario.
- CSV con BOM UTF-8.
- Una fila por lectura y por punto pendiente.
- Normalización consistente de fechas, números y celdas vacías.
- Hoja XLSX `Auscultación`.
- Primera fila congelada y filtro `A1:AC1`.
- Mismo número y contenido normalizado de filas en CSV y XLSX.

## Límite de la evidencia

Este verificador no descarga archivos, no llama a Render y no modifica
Supabase. La paridad de una pareja concreta solo queda demostrada cuando se le
entregan los dos archivos de la misma ronda. La evidencia Galaxy del 13-09-2026
solo había demostrado generación HTTP `200` y apertura del selector nativo;
esa limitación quedó resuelta después mediante el guardado SAF físico de v15.

## Evidencia read-only conservada — 16/17-09-2026

Para separar el contrato de exportación de la compuerta SAF, el backend local
leyó en modo read-only la misma ronda documentada y generó fuera del repo un
par CSV/XLSX mediante la misma función de dominio del endpoint. La revalidación
del 17-09-2026 mantiene literalmente:

```text
EXPORT_ARTIFACTS_OK csvRows=15 xlsxRows=15 worksheet=Auscultación utf8Bom=true
```

- CSV: `4.065` bytes, SHA-256
  `945AE5909356397FCFB2EB5CDC398B72AE5BEBA041C266FF89FF4861F8A2B796`.
- XLSX: `8.152` bytes, SHA-256
  `4C654481F2ECE079C89A0FA2ED401C3467158D07C5C72B9F1129DD1CE773E1DD`.

Esto prueba estructura y paridad del contrato con datos reales, pero sigue
siendo una pareja generada read-only y no sustituye la prueba física siguiente.

## Evidencia SAF física v15 — 17/18-09-2026

Los archivos guardados desde el Galaxy mediante `Guardar CSV` y `Guardar
Excel`, extraídos de `Download/TopoField-F6-v15`, fueron:

- CSV: `4.770` bytes, SHA-256
  `B4E1962532509B3A76CFFDAEA624FDEE1CB2385A08CCC6DC768671955C8E65BA`;
- XLSX: `8.338` bytes, SHA-256
  `CA50B19D664EC8A251F259144360BCA056A131405D641C2E2E4CE290B6611785`.

El mismo comando oficial devolvió:

```text
EXPORT_ARTIFACTS_OK csvRows=15 xlsxRows=15 worksheet=Auscultación utf8Bom=true
```

Por tanto, guardado SAF + extracción + paridad de artefactos están demostrados
para v15. Este verificador no decide si el formato satisface el flujo real de
oficina; esa aceptación continúa siendo una validación humana independiente.
