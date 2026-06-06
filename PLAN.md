# PLAN.md — Plan Unificado de Desarrollo de TopoField

## Objetivo
Construir TopoField como una aplicación móvil de campo para equipos pequeños de topografía, con foco en operaciones reales, uso simple, mapa integrado, fotos optimizadas y crecimiento progresivo sin depender de infraestructura de pago desde el inicio.

## Dirección Estratégica
- Mantener monorepo
- Mantener TypeScript
- Mantener arquitectura modular por funcionalidades
- Mantener mapa como parte central del producto
- Priorizar MVP útil antes que complejidad técnica
- Diseñar desde ya para free tier, fluidez y crecimiento de contenido escrito y fotográfico

## Qué se mantiene
- React Native + Expo
- Backend Node.js + Express
- PostgreSQL + Supabase
- Supabase Auth
- Supabase Storage
- React Query
- expo-sqlite
- SQL crudo con `pg`
- Roles `admin`, `topografo`, `visitante`

## Qué se elimina del plan inmediato
- Módulo UTM
- Procesado avanzado de observaciones topográficas (`Hz`, `V`, `SD`)
- Rol `colaborador`

## Qué se integra de la revisión de producto
- Incidencias como flujo operativo real
- Sugerencias integradas dentro de incidencias cuando exista propuesta de solución
- Guía de campo con valor práctico en obra
- Historial de cambios / auditoría
- Foco en equipo pequeño y uso real de campo

## Estado Actual - 2026-06-01

- Flujo móvil principal ya entra por `Obras -> Estacionamientos`.
- Guías Leica están embebidas como lector offline con páginas JPG optimizadas: `Guía Leica de estación` y `Nivel Leica LS10`.
- Icono de app actualizado con libreta negra y mira amarilla.
- Detalle de estación incluye foto principal, memoria visual, notas editables por rol y datos técnicos colapsados.
- Mapa sin Google API key usa vista operativa/fallback con coordenadas y enlaces externos, evitando crash de `react-native-maps`.
- Prismas por estación tienen croquis operativo con `react-native-svg`, basado en ángulo horizontal y distancia inclinada. No representa coordenadas geográficas absolutas.
- Ficha de prisma permite foto de prisma mediante subida firmada a Supabase Storage y `PATCH /prisms/:id/photo`; validado en Galaxy con rol `topografo`.
- APK actual: EAS `71a232a3-2f87-4e85-a71e-75ad0681269a`, archivo local `C:\Users\guill\Downloads\topofield-71a232a3-preview.apk`, instalado por ADB en Galaxy.
- Hardening backend aplicado en `10c91b8`: roles ya no salen de metadata mutable, usuarios Supabase se validan contra tabla local `users`, lecturas GET requieren token invitado, hay rate limit básico, scripts de escritura requieren autorización explícita y `PATCH /projects/:id/photo` queda corregido por migración `011`.
- Hardening móvil incluido en la APK actual: token técnico en SecureStore, API production solo HTTPS, permisos Android reducidos y aviso antes de abrir Google Maps externo.
- QA Galaxy visitante validada: Obras, `Sarrià`, detalle de estación, croquis PN1/PN2, Guía offline, Mapa fallback y Perfil visitante sin errores de app en `logcat`.
- Guía mejorada con búsqueda y agrupación de fichas rápidas por instrumento.
- Estacionamiento empieza a funcionar como unidad operativa: mensajes/bitácora por estación y propuestas de estacionamiento provisional como incidencias con sugerencia `new_station`; son flujos internos para `admin/topografo`, no públicos para visitante.
- Auditoría de seguridad en progreso documentada en `SECURITY_AUDIT_PROGRESS.md`.
- Backend Docker/Render usa `npm ci` con lockfile propio para builds reproducibles.
- APK EAS `247704f1-2316-483f-bb9e-62adee8714cd` instalada en Galaxy: valida Guía con búsqueda/agrupación, Obra `Campus Nord`, detalle de estación y presencia de mensajes/provisionales/croquis sin errores nativos ni JS.
- Backend añade validación centralizada de UUIDs en params/query para devolver `400` controlado antes de SQL.
- APK EAS `71a232a3-2f87-4e85-a71e-75ad0681269a` instalada en Galaxy: visitante validado en Obras, Mapas, Guías, Perfil y Conversación; topógrafo validado con mensaje real, propuesta provisional, foto de prisma y foto de obra.
- Los registros QA de mensaje/propuesta se dejan como trazabilidad aceptada; no son visibles para visitante.
- La política real de `project_memberships` queda documentada en `PROJECT_MEMBERSHIPS_MATRIX.md`: el topógrafo técnico de QA puede tener todas las obras, pero usuarios reales requieren matriz explícita usuario-obra.

## Actualización Operativa - 2026-06-02

- APK móvil actual real: EAS `2416dd4a-27a2-47ac-bdf2-5933af2d83d4`, instalada en Galaxy `SM_S938B / R5CY21X6FLE`.
- La app ya muestra `Bitácora` en vez de `Conversación`, con icono de brújula.
- El icono de app actual es brújula/topografía, no la libreta antigua.
- El lector de guías muestra una página cada vez con navegación y zoom; validado en Galaxy de `1/20` a `2/20`.
- El Galaxy queda con sesión `topografo` activa y persistida tras relanzar la app.
- El usuario quiere empezar a meter datos reales y trabajar con ambos roles: `topografo` para campo/fotos y `admin` para gestión.
- Riesgo actual: la app solo guarda una sesión técnica activa; activar `admin` sustituye `topografo`.
- Nueva necesidad antes de carga real sostenida: diseñar sesión técnica estable para `admin` y `topografo`, con selector de perfil o login/refresh, sin depender de pegar JWTs largos que caducan.

## Actualización Operativa - 2026-06-06

- APK móvil actual instalada: EAS `2d6ad87a-41d4-4774-838f-30f1e67d3c2f`, commit `ac09f3a`.
- Motivo: corregir el error Android/Expo `Creating blobs from ArrayBuffer and ArrayBufferView are not supported` al agregar fotos.
- Decisión técnica: las fotos comprimidas ya no se convierten a `Blob`; se suben como archivo local con `expo-file-system` `File.upload` al signed URL de Supabase Storage.
- Verificado: TypeScript móvil OK, app instalada por ADB, `Obras` carga y `logcat` limpio.
- Pendiente MVP inmediato: prueba real de cámara/galería en campo para confirmar subida de fotos y continuar con matriz de membresías/roles reales.

## Estado Backend Render

- Render fue redeployado desde `main`.
- `GET /health` responde 200 con `commit: 0a4f523169d1a64c1a28b2e92ddea8f95fce2d33`.
- `GET /projects`, `GET /guide-entries` y `GET /prisms/coverage/CN1` responden 401 sin token y 200 con `GUEST_PUBLIC_TOKEN`.
- `PATCH /prisms/:prismId/photo` sin token responde 401, no 404; la ruta existe y queda protegida por rol.
- Estado actual: Render público responde `GET /health` con `commit: 0a4f523169d1a64c1a28b2e92ddea8f95fce2d33`.
- Siguiente acción real: definir usuarios reales y su matriz de obras antes de alta real; no lanzar otra EAS salvo cambio móvil.
- Siguiente acción real adicional: resolver el flujo de sesión técnica admin/topógrafo antes de usar el móvil como herramienta de carga diaria.

## Principios de Implementación
- Una feature cada vez
- Una fuente de verdad por decisión
- Backend responsable de permisos, validación y lógica
- Frontend responsable de experiencia de uso clara y rápida
- Nada de sobreingeniería prematura
- Optimización de fotos y payloads desde el inicio

## Orden Global de Implementación
1. Consolidación documental y de estructura
2. Base técnica backend + contratos compartidos
3. Auth + roles
4. Estaciones
5. Prismas
6. Mapa básico
7. Guía de campo
8. Historial de cambios
9. Incidencias con sugerencias integradas
10. Panel admin y actividad
11. Offline real
12. Hardening, rendimiento y despliegue

## Fase 0 — Consolidación

### Objetivos
- Unificar visión de producto, arquitectura y roadmap
- Eliminar contradicciones entre documentos

### Tareas
- Actualizar `AGENTS.md`
- Actualizar `MEMORY.md`
- Actualizar `PLAN.md`
- Revisar estructura real del repo frente al plan
- Confirmar criterios de rendimiento en free tier

### Dependencias
- Debe completarse antes de seguir desarrollando nuevas features

## Fase 1 — MVP

### Módulo A — Base del Proyecto

#### Tareas
- Confirmar estructura final monorepo
- Ajustar carpetas base mobile/backend/shared
- Mantener TypeScript estricto
- Consolidar dependencias comunes
- Definir entorno local y variables de entorno

#### Dependencias
- Requerido antes de cualquier desarrollo funcional

### Módulo B — Base del Backend

#### Tareas
- Inicializar o consolidar backend Express
- Configurar conexión PostgreSQL con `pg`
- Añadir middlewares base
- Crear health check
- Crear middleware de errores
- Crear middleware `notFound`
- Definir formato estándar de respuesta API

#### Dependencias
- Requiere base del proyecto

### Módulo C — Contratos Compartidos

#### Tareas
- Consolidar `/shared/types.ts`
- Definir entidades núcleo
- Definir enums/unions de roles y estados
- Mantener frontend y backend alineados

#### Dependencias
- Debe avanzar junto con el diseño inicial de BD

### Módulo D — Auth + Roles

#### Tareas
- Configurar Supabase Auth
- Implementar verificación JWT backend
- Implementar control de roles `admin`, `topografo`, `visitante`
- Crear flujo de sesión en mobile
- Proteger rutas según permisos reales

#### Dependencias
- Requiere backend base y contratos compartidos

### Módulo E — Estaciones

#### Tareas
- Diseñar esquema y endpoints de estaciones
- Crear CRUD de estaciones
- Añadir GPS
- Añadir notas
- Añadir fotos vía Supabase Storage
- Crear vistas de listado y detalle

#### Dependencias
- Requiere auth, BD y storage definidos
- El mapa básico depende de lectura de estaciones

### Módulo F — Prismas

#### Tareas
- Diseñar esquema y endpoints de prismas
- Crear CRUD de prismas
- Añadir notas y fotos
- Relacionar prismas con estacionamientos cuando corresponda
- Mostrar croquis operativo por estación con ángulo/distancia, sin prometer mapa geográfico absoluto

#### Dependencias
- Requiere auth, BD y storage definidos

### Módulo G — Mapa Básico

#### Tareas
- Integrar `react-native-maps`
- Mostrar estaciones como pines
- Navegar de mapa a detalle
- Definir carga inicial eficiente

#### Dependencias
- Requiere lectura de estaciones
- Requiere permisos de localización si se usa ubicación actual

### Módulo H — Guía de Campo

#### Tareas
- Definir estructura del contenido
- Decidir si el contenido es embebido o gestionado por backend
- Permitir creación y edición solo para `admin` en Fase 1
- Crear acceso claro para lectura para `topografo` y `visitante`
- Permitir consulta sencilla en campo
- Mantener las guías PDF pesadas como páginas renderizadas optimizadas dentro del APK cuando convenga lectura offline

#### Dependencias
- Puede empezar después de auth básica o en paralelo con otras pantallas si no depende de backend complejo

#### Regla de fase
- Fase 1: solo `admin` crea y edita
- Fase 2: si se abre contribución de `topografo`, se añade flujo de aprobación

### Módulo I — Historial de Cambios

#### Tareas
- Diseñar tabla/log de cambios
- Registrar cambios en estaciones y prismas
- Mantener historial inmutable

#### Dependencias
- Requiere estaciones y prismas operativos

### Criterios de salida de Fase 1
- Auth funcional
- Roles funcionando
- Estaciones funcionales
- Prismas funcionales
- Fotos funcionales
- Mapa funcional
- Guía de campo básica disponible
- Historial básico operativo

## Fase 2 — Gestión Operativa

### Módulo J — Incidencias

#### Tareas
- Diseñar flujo de incidencia
- Permitir reportar problema en campo
- Asociar incidencia a estación o prisma cuando corresponda
- Incluir notas y fotos

#### Dependencias
- Requiere estaciones/prismas ya operativos

### Módulo K — Sugerencias Integradas

#### Tareas
- Añadir propuesta de solución dentro de incidencias cuando aplique
- Soportar casos como:
  - obstáculo en estacionamiento
  - prisma no visible
  - otro problema operativo
- Permitir proponer:
  - nuevo estacionamiento
  - prisma alternativo
  - solución libre

#### Dependencias
- Requiere módulo de incidencias

### Módulo L — Flujo de Aprobación Admin

#### Tareas
- Definir qué cambios/incidencias requieren revisión
- Permitir aprobar o revertir según reglas de negocio
- Registrar trazabilidad de aprobación

#### Dependencias
- Requiere auth, incidencias e historial

### Módulo M — Panel Admin

#### Tareas
- Crear dashboard admin básico
- Revisar incidencias y propuestas
- Consultar logs de actividad
- Gestionar usuarios si entra en alcance

#### Dependencias
- Requiere datos operativos suficientes

### Criterios de salida de Fase 2
- Incidencias funcionando
- Sugerencias integradas funcionando
- Aprobación admin funcionando
- Panel admin funcional

## Fase 3 — Operación Avanzada

### Módulo N — Offline Real

#### Tareas
- Diseñar caché local con `expo-sqlite`
- Crear cola de sincronización
- Soportar lecturas offline útiles
- Definir estrategia de conflictos

#### Dependencias
- Requiere APIs estables del MVP

### Módulo O — Rendimiento y Escalado Ligero

#### Tareas
- Optimizar queries
- Optimizar listados
- Optimizar render de mapa
- Optimizar flujo de imágenes
- Medir comportamiento con más texto y fotos

#### Dependencias
- Requiere uso funcional de módulos principales

### Módulo P — Realtime si aporta valor

#### Tareas
- Evaluar si Supabase Realtime mejora el flujo operativo
- Aplicarlo solo donde reduzca fricción real

#### Dependencias
- Requiere flujo operativo ya estable

### Criterios de salida de Fase 3
- La app sigue siendo usable con mala conexión
- Las fotos y textos siguen yendo fluidos
- El sistema escala sin pagar pronto por complejidad innecesaria

## Reglas de Rendimiento en Free Tier
- Comprimir imágenes antes de subir
- Evitar fotos gigantes
- Limitar y paginar listados
- No devolver detalles innecesarios en endpoints de lista
- Cachear con React Query de forma consciente
- Usar Supabase Storage/CDN directamente cuando sea posible
- Vigilar el proveedor backend para minimizar cold start

## Riesgos a Vigilar
- Cold start del backend gratuito
- Peso excesivo de imágenes
- Listados demasiado grandes
- Complejidad de permisos si se añaden roles sin necesidad
- Mezclar demasiadas features antes de cerrar MVP
- Desfase entre APK y backend Render si auto-deploy no publica los commits nuevos
- Confundir croquis de prismas por ángulo/distancia con mapa geográfico real
- Tratar `GUEST_PUBLIC_TOKEN` como privado. Es falso: va dentro de la APK y solo sirve para lectura pública controlada, no para confidencialidad.
- Copiar el acceso global del topógrafo técnico de QA a usuarios reales. Esa asignación solo existe para pruebas; los usuarios reales deben tener membresías explícitas por obra.

## Secuencia Recomendada de Trabajo
1. Documentos finales
2. Revisión de estructura real
3. Base backend
4. Tipos compartidos
5. Auth
6. Estaciones
7. Prismas
8. Mapa
9. Guía
10. Historial
11. Incidencias
12. Aprobación admin
13. Panel admin
14. Offline
15. Rendimiento

## Hitos

### Hito 1 — Base técnica cerrada
- Documentación y arquitectura alineadas

### Hito 2 — MVP de campo usable
- Auth, estaciones, prismas, mapa, guía, fotos

### Hito 3 — Gestión operativa real
- Incidencias, sugerencias integradas, admin

### Hito 4 — Robustez y fluidez
- Offline y optimización de rendimiento

---
