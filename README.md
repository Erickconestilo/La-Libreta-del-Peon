<!-- doc-status
estado: vivo
verificado: 2026-08-02
-->

# La Libreta del Peón (TopoField)

Aplicación móvil de campo para equipos pequeños de topografía y auscultación de infraestructuras. Stack: Expo/React Native, backend Node/Express, PostgreSQL/Supabase, Supabase Storage y tipos compartidos en `shared/types.ts`.

## Por dónde empezar

| Pregunta | Documento |
|---|---|
| ¿En qué fase estamos y qué toca ahora? | [ROADMAP.md](./ROADMAP.md) |
| ¿Por qué se decidió esto así? ¿Qué está verificado? | [MEMORIA.md](./MEMORIA.md) |
| ¿Qué reglas sigue un agente que trabaje aquí? | [AGENTS.md](./AGENTS.md) |
| ¿Para quién es el producto y qué queda fuera? | [PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md) |
| ¿Cómo se valida que sirve en campo? | [UX_RESEARCH_PLAN.md](./UX_RESEARCH_PLAN.md) |
| ¿Cómo se pilota? | [LAUNCH_PLAN.md](./LAUNCH_PLAN.md), [PILOT_READINESS_CHECKLIST.md](./PILOT_READINESS_CHECKLIST.md) |
| ¿Cómo se compila una APK sin gastar cuota EAS? | [LOCAL_ANDROID_BUILD_RUNBOOK.md](./LOCAL_ANDROID_BUILD_RUNBOOK.md) |
| ¿Cómo se mantiene la documentación al día? | [docs/DOC_MAINTENANCE.md](./docs/DOC_MAINTENANCE.md) |
| Historial congelado (informes E2E, inventarios, auditorías fechadas) | `docs/archive/` |

## Estado actual (02-08-2026)

Resumen; el detalle por fase está en [ROADMAP.md](./ROADMAP.md).

- Motor offline validado en dispositivo real: outbox SQLite, sincronización al recuperar red, persistencia tras `force-stop` e idempotencia por `client_request_id`.
- MVP de auscultación completo y validado en dispositivo real: rondas, puntos de control, lecturas, umbrales, histórico y foto adjunta, todo offline-first.
- Backend desplegado en Render, pero **desactualizado**: `/api/v1/health` confirma que corre el estado del 31-07 y le faltan las correcciones de aislamiento entre obras y D1. Ver "Deuda de despliegue" en [ROADMAP.md](./ROADMAP.md).
- Aislamiento multi-tenant auditado por familia de endpoint, con tres correcciones aplicadas. RLS activo en las 24 tablas del proyecto.
- Release Android firmable localmente: keystore propio y AAB verificado criptográficamente.
- **Siguiente bloque: F5, validación de uso real en campo** — pero antes hay que publicar lo ya hecho: el merge a `main` está pendiente y la publicación requiere un `push --force` que Erick debe autorizar (el historial se reescribió el 31-07 para purgar nombres reales de obra).

## Verificación local

```bash
npm run build --workspace apps/backend
npm run test  --workspace apps/backend
npx tsc --noEmit --project apps/mobile/tsconfig.json
npm run test  --workspace apps/mobile -- --runInBand
npx expo export --platform android
npm run docs:check      # coherencia de la documentación
```

`npm run verify:pre-apk` encadena las comprobaciones previas a generar una APK.

Backend público configurado en móvil: `https://la-libreta-del-peon-1.onrender.com/api/v1`.

## Funcionalidad implementada

- Flujo `Obras → Estacionamientos`, con caché local de la lista de obras para arranque en frío sin red.
- Detalle de estación con foto principal, memoria visual, notas y datos técnicos colapsados.
- Croquis operativo de prismas por estación usando ángulo/distancia, no coordenada absoluta.
- Guías Leica offline renderizadas dentro del APK.
- Subida de fotos a Supabase Storage para obras, estaciones, memoria visual, prismas y adjuntos de lectura.
- Auscultación: rondas de monitorización, puntos de control con umbrales vigentes, captura de lectura offline, histórico por punto y catálogo de códigos por obra.
- Perfil con diagnóstico del outbox: operaciones en error con motivo, intentos y reintento manual.
- Roles `admin`, `topografo` y `visitante`, con alcance por obra vía `project_memberships`.

## Limitaciones conocidas

- **Distribución:** la APK firmada localmente no puede instalarse encima de una instalación EAS anterior (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`). Hay que desinstalar la anterior o reutilizar su keystore. El keystore local debe respaldarse fuera del repo antes de distribuir nada.
- **Cobertura de tests:** unitaria y centrada en control de acceso, scope entre obras, rutas de foto y validación de payloads. No sustituye QA funcional en dispositivo.
- **Nadie externo ha usado la app todavía.** Es la limitación más importante del proyecto ahora mismo y el motivo de que F5 sea la fase abierta.
- **Deuda técnica aceptada conscientemente:** las lecturas se guardan en un campo genérico en lugar de una estructura por tipo de instrumento. Se reestructura en F7, cuando exista una campaña real que lo exija.
