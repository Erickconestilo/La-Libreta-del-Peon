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

## Estado Actual - 2026-05-31

- Flujo móvil principal ya entra por `Obras -> Estacionamientos`.
- Guías Leica están embebidas como lector offline con páginas JPG optimizadas: `Guía Leica de estación` y `Nivel Leica LS10`.
- Icono de app actualizado con libreta negra y mira amarilla.
- Detalle de estación incluye foto principal, memoria visual, notas editables por rol y datos técnicos colapsados.
- Mapa sin Google API key usa vista operativa/fallback con coordenadas y enlaces externos, evitando crash de `react-native-maps`.
- Prismas por estación tienen croquis operativo con `react-native-svg`, basado en ángulo horizontal y distancia inclinada. No representa coordenadas geográficas absolutas.
- Ficha de prisma permite preparar foto de prisma mediante Supabase Storage; Render ya publica el backend nuevo en commit `3e721a14a713fb2dc609c519305df3cfaeff757e`.
- APK final de la tanda: EAS `cc43f0f1-ff3e-43da-b574-ec09dedfa4e4`, URL `https://expo.dev/artifacts/eas/rdY4AEzq4WTnj9rCXAD4mG.apk`, instalado por ADB en Galaxy.
- Hardening backend aplicado en `10c91b8`: roles ya no salen de metadata mutable, usuarios Supabase se validan contra tabla local `users`, lecturas GET requieren token invitado, hay rate limit básico, scripts de escritura requieren autorización explícita y `PATCH /projects/:id/photo` queda corregido por migración `011`.
- Hardening móvil aplicado en `3e721a1` pero pendiente de nueva APK: token técnico en SecureStore, API production solo HTTPS, permisos Android reducidos y aviso antes de abrir Google Maps externo.
- QA Galaxy visitante validada: Obras, `Sarrià`, detalle de estación, croquis PN1/PN2, Guía offline, Mapa fallback y Perfil visitante sin errores de app en `logcat`.
- Guía mejorada con búsqueda y agrupación de fichas rápidas por instrumento.
- Estacionamiento empieza a funcionar como unidad operativa: mensajes/bitácora por estación y propuestas de estacionamiento provisional como incidencias con sugerencia `new_station`; son flujos internos para `admin/topografo`, no públicos para visitante.
- Auditoría de seguridad en progreso documentada en `SECURITY_AUDIT_PROGRESS.md`.
- Backend Docker/Render usa `npm ci` con lockfile propio para builds reproducibles.

## Estado Backend Render

- Render fue redeployado manualmente desde `main` con cache limpio.
- `GET /health` responde 200 con `commit: 3e721a14a713fb2dc609c519305df3cfaeff757e`.
- `GET /projects`, `GET /guide-entries` y `GET /prisms/coverage/CN1` responden 401 sin token y 200 con `GUEST_PUBLIC_TOKEN`.
- `PATCH /prisms/:prismId/photo` sin token responde 401, no 404; la ruta existe y queda protegida por rol.
- Estado actual: GitHub `main` ya va por `416840d`, pero Render público aún responde `3e721a1`; falta redeploy manual/auto-deploy efectivo.
- Siguiente acción real: esperar APK EAS `247704f1`, forzar/verificar Render, reinstalar en Galaxy y probar token técnico, foto de prisma, mensajes de estación y propuesta provisional.

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
