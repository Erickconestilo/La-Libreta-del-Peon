<!-- doc-status
estado: vivo
verificado: 2026-08-24
-->

# F5 — Runbook de piloto con dos móviles

## Alcance

Este runbook cubre el piloto controlado de TopoField con dos dispositivos
Android y dos cuentas nominales. No crea usuarios, membresías ni datos en
Supabase por sí solo.

## Preparación

1. Erick confirma que el proyecto Supabase está activo y que la obra piloto
   es la autorizada.
2. Erick crea o autoriza una segunda cuenta nominal y la asigna únicamente a
   la obra piloto. No se comparten credenciales.
3. Se instala la misma build release firmada en ambos móviles y se registra
   `versionName`, `versionCode` y la fecha de actualización.
4. Se prepara una ronda con puntos y umbrales desde el móvil con red.
5. Cada participante inicia sesión con su propia cuenta y verifica en Perfil
   el correo visible antes de entrar en la obra.

## Escenarios mínimos

| Escenario | Móvil A | Móvil B | Resultado esperado |
|---|---|---|---|
| Consulta simultánea | Abre la ronda | Abre la ronda | Ambos ven solo la obra autorizada |
| Lectura concurrente | Registra una lectura | Refresca la ronda | No hay duplicados ni mezcla de puntos |
| Offline | Guarda lectura/foto sin red | Sigue consultando su copia | El outbox conserva la operación |
| Reconexión | Recupera red y sincroniza | Refresca | Una fila por `clientRequestId` |
| Aislamiento | Intenta abrir otra obra | Intenta abrir otra obra | 403/404, nunca datos ajenos |
| Cierre | Deja pendientes locales | Intenta cerrar | El cierre queda bloqueado hasta resolverlos |

## Evidencia que se registra

- modelo de dispositivo y versión instalada;
- cuenta utilizada, sin guardar contraseñas ni tokens;
- obra y ronda con identificadores no sensibles;
- hora de cada tarea, errores literales y capturas de pantalla;
- `clientRequestId` de cada operación offline, si se necesita investigar un
  retry;
- resultado de aislamiento entre obras;
- dudas y pasos innecesarios de cada participante.

## Puerta de salida

El piloto pasa esta puerta solo si los dos usuarios completan una ronda sin
duplicados, sin acceso cruzado entre obras y sin necesitar instrucciones
continuas. La ausencia temporal del segundo participante no bloquea el piloto
individual de Erick, pero deja F8 abierta.
