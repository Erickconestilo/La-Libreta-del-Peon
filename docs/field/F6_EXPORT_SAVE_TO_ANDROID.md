<!-- doc-status
estado: vivo
verificado: 2026-09-18
rol: field-evidence
-->

# F6: Guardado local de exportaciones Android

## Decisión

La pantalla de resumen mantiene el compartir manual y añade `Guardar CSV` y
`Guardar Excel`. El guardado usa el selector oficial de documentos de Android
(Storage Access Framework, SAF) para que el usuario elija una carpeta, con
`Download` como ubicación inicial. No se envía ningún archivo a un canal
externo ni se marca como entregado o revisado.

La aplicación pide permiso para la carpeta antes de descargar el binario. Si
el usuario cancela, no se hace la petición autenticada ni se crea un archivo.
Después se descarga la exportación autenticada, se crea el archivo con su MIME
correspondiente y se escribe en base64 sin guardar una copia como base64 en la
base de datos.

## Uso de verificación

En una ronda con permisos de escritura:

1. Abrir `Resumen de ronda`.
2. Pulsar `Guardar CSV` o `Guardar Excel`.
3. Elegir una carpeta en el selector de Android.
4. Confirmar el mensaje con el nombre seguro del archivo.
5. Extraer ambos archivos de esa carpeta y ejecutar:

```powershell
npm run verify:export-artifacts -- <ronda.csv> <ronda.xlsx>
```

El verificador comprueba cabeceras, filas normalizadas, fechas, números,
filtros, BOM UTF-8 y la primera fila congelada de XLSX.

## Validación estructurada con datos reales — 16-09-2026

Sin escribir en Supabase, el backend local leyó la ronda real ya documentada
`db3a59e3-3756-4d95-9890-f026379f33db` mediante la misma función de dominio que
usa el endpoint de exportación y generó un CSV y un XLSX fuera del repositorio.
Ambos contenían `15` filas. El verificador oficial devolvió literalmente:

```text
EXPORT_ARTIFACTS_OK csvRows=15 xlsxRows=15 worksheet=Auscultación utf8Bom=true
```

Esto cerró primero la paridad estructural del contrato con datos reales de
Supabase. Los dos artefactos read-only históricos conservados fuera del repo
siguen siendo evidencia separada: CSV `4.065` bytes, SHA-256
`945AE5909356397FCFB2EB5CDC398B72AE5BEBA041C266FF89FF4861F8A2B796`;
XLSX `8.152` bytes, SHA-256
`4C654481F2ECE079C89A0FA2ED401C3467158D07C5C72B9F1129DD1CE773E1DD`.

## Guardado SAF físico en v15 — 17/18-09-2026

Desde `Resumen de ronda` en el Galaxy se ejecutaron `Guardar CSV` y `Guardar
Excel` usando el selector SAF real de Android. Como Android no permite conceder
la raíz de `Download`, se creó y autorizó la carpeta
`Download/TopoField-F6-v15`. Los dos binarios se extrajeron después por ADB:

- CSV: `4.770` bytes, SHA-256
  `B4E1962532509B3A76CFFDAEA624FDEE1CB2385A08CCC6DC768671955C8E65BA`;
- XLSX: `8.338` bytes, SHA-256
  `CA50B19D664EC8A251F259144360BCA056A131405D641C2E2E4CE290B6611785`.

El verificador oficial sobre esos dos archivos físicos devolvió literalmente:

```text
EXPORT_ARTIFACTS_OK csvRows=15 xlsxRows=15 worksheet=Auscultación utf8Bom=true
```

Con esto queda cerrada la compuerta técnica de guardado SAF desde v15. La
**aceptación del formato por el flujo real de oficina sigue pendiente** y no se
sustituye por esta prueba técnica.

## Verificación local

La regresión dirigida cubre descarga autenticada, MIME, nombre seguro,
escritura base64 y cancelación del selector sin efectos secundarios:

```text
Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

La release v15 fue la utilizada para esta comprobación. `Guardar CSV` y
`Guardar Excel` ya se ejecutaron físicamente, ambos binarios fueron extraídos y
pasaron el verificador. La release instalada se incrementó después a v16 por un
bug independiente de replay F7; ese cambio no altera la evidencia SAF ya
obtenida. La aceptación de oficina permanece como comprobación humana separada.
