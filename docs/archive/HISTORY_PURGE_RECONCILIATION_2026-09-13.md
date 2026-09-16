<!-- doc-status
estado: archivado
congelado: 2026-09-15
superado-por: ROADMAP.md
rol: audit
-->

> 🧊 **Documento archivado el 15-09-2026.** Conserva la evidencia puntual de la reconciliación no destructiva; la deuda y sus compuertas vigentes se mantienen en `ROADMAP.md` y `NEXT_CHAT_HANDOFF.md`.

# Reconciliacion de la purga historica

## Alcance

Esta nota documenta una comprobacion local y no destructiva. No modifica
`origin`, no borra referencias, no ejecuta `git gc` y no reescribe commits.
El objetivo es separar el contenido actual del repositorio de los objetos
historicos que siguen siendo alcanzables desde referencias locales.

## Resultado

- La rama de trabajo es `codex/f5-field-stability`.
- El contenido actual de esa rama no contiene nombres de obras reales en el
  runtime. Quedan dos menciones negativas en tests que comprueban que el
  catalogo generico no los incorpora.
- La busqueda exacta en el historial alcanzable devuelve coincidencias para
  tres de las nueve cadenas confirmadas. Las otras seis no aparecen con la
  grafia exacta comprobada en esta pasada. Los valores concretos se omiten
  aqui para no reintroducir datos reales en la documentacion activa; quedan
  identificados por la salida local y por la solicitud de purga autorizada.
- Las coincidencias se encuentran en commits antiguos ya neutralizados en el
  contenido actual, pero siguen dentro de la historia de
  `codex/f5-field-stability`. Por tanto, no es correcto afirmar que la purga
  completa del historial este vigente para esta referencia.
- `main` y `refs/remotes/origin/main` no apuntan al mismo historial que la
  rama de trabajo. `origin/main` conserva una referencia anterior y no se ha
  actualizado mediante fetch.
- Las ocho ramas antiguas identificadas en la solicitud anterior ya no
  existen como referencias locales. No se ha borrado ninguna en este bloque.
- `git fsck --full` termina con codigo `0`, sin errores fatales, pero enumera
  commits y arboles dangling. Eso significa que todavia existen objetos sin
  una referencia normal; no debe presentarse como un repositorio totalmente
  podado.

## Evidencia literal de la comprobacion

```text
HISTORY_PURGE_MATCHES=3_of_9_exact_strings;counts=5,2,2
dangling commit 4e6a628b76f93d4fcac09f1e334c12fde9de60c2
dangling tree 045613ffa2a5b4d88506924545ab3e8928d8213f
dangling commit 7f1d7ad27ae1f6f328ba6378e3553c2853463f45
FSCK_EXIT=0
```

La salida anterior se conserva tal como la produjo el comando local. No es
una orden de borrado ni una autorizacion para limpiar objetos.

## Siguiente compuerta

Para cerrar esta deuda hay que partir del mirror original intacto, ejecutar
una sola reescritura con la lista completa confirmada, verificar el repositorio
bare y solo despues decidir si se reemplazan las referencias locales. No se
debe encadenar otro `filter-repo` sobre un arbol ya saneado ni hacer
`push --force` sin una autorizacion separada y vigente.
