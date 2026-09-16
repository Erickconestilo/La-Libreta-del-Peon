<!-- doc-status
estado: vivo
verificado: 2026-09-16
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

Esto cierra la paridad estructural del contrato con datos reales de Supabase.
No equivale a afirmar que v13 haya guardado esos archivos mediante SAF ni que
el formato haya sido aceptado por el flujo de oficina: esas dos comprobaciones
siguen pendientes de dispositivo/persona.

## Verificación local

La regresión dirigida cubre descarga autenticada, MIME, nombre seguro,
escritura base64 y cancelación del selector sin efectos secundarios:

```text
Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

Este cambio no altera backend, Supabase, Render, EAS ni la versión instalada
en el Galaxy. La release v7 sigue siendo la referencia física hasta generar
una nueva APK y probarla en el dispositivo.
