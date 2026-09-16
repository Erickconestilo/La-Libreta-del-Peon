<!-- doc-status
estado: vivo
verificado: 2026-09-16
-->

# Estado y siguiente paso — bloque P0

## Estado actual

La reconciliación de 019–026 ya se ejecutó con autorización explícita. Las ocho
migraciones, que ya existían funcionalmente en el esquema, quedaron registradas
en `public.schema_migrations` sin reejecutar sus SQL. La relectura posterior
mostró `ledger: PRESENTE` para 019–026 y cero candidatas pendientes.

El informe deja dos límites explícitos:

- 015 es un baseline documental legacy y se ha movido a
  `apps/backend/migrations/deprecated/`, junto con la explicación en su
  README; no debe ejecutarse ni registrarse como aplicada.
- 020 está aplicada: las nueve tablas tienen RLS activo y la política
  `legacy deny all` está presente en cada una.
- 021 y 024 también están aplicadas; en 024 queda únicamente la comparación de
  `name`, `default_unit` e `is_active` de los cinco códigos.

Antes y después del registro se comprobaron los objetos/columnas esperados; 024
mantiene los cinco códigos y `name`, `default_unit` e `is_active` sin
diferencias. Una comprobación read-only adicional confirmó las definiciones
críticas de RLS/policies, índice 021, checks 022/026, constraints de partes y
la función/trigger Auth. Las migraciones 027–030 quedan fuera de esta
reconciliación y no fueron ejecutadas por este paso.

## Archivos cambiados

- `docs/ai/RECONCILIACION-MIGRACIONES.md`: tabla de auditoría, riesgos,
  estados re-verificados, riesgos y acciones propuestas para 015–030.
- `docs/ai/ESTADO-Y-SIGUIENTE-PASO.md`: estado del bloque y alcance del
  siguiente dry-run.
- `MEMORIA.md`: entradas de bitácora de la auditoría y del dry-run.
- `apps/backend/migrations/deprecated/015_obras_baseline_retroactive.sql`:
  baseline retirado del directorio ejecutable.
- `apps/backend/migrations/deprecated/README.md`: motivo y convención de
  migración retirada.
- `apps/backend/src/scripts/reconcile-applied-migrations.ts`: reconciliación
  de objetos, columnas, catálogo 024 y ledger con dry-run por defecto.
- `apps/backend/src/scripts/reconcile-applied-migrations.test.ts`: regresiones
  de comparación de catálogo y elegibilidad.
- `apps/backend/src/lib/all.test.ts` y `apps/backend/package.json`: inclusión
  del test y comando del script.

El `--write` autorizado registró únicamente ocho filenames en
`public.schema_migrations`. El reconciliador imprimió `No se leen ni ejecutan
los SQL de las migraciones.` y `Filas registradas en schema_migrations: 8`.

## Siguiente paso único

Continuar únicamente por las compuertas separadas de 027–030: backup vigente,
prechecks específicos, readiness 030 local y validación posterior a cada
migración. No usar 019–026 como motivo para reejecutar sus SQL.

## Validación local de esta tarea

```text
npm run docs:check
git diff --check
```
