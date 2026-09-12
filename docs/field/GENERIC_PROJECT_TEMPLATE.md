<!-- doc-status
estado: vivo
verificado: 2026-09-13
rol: product-fixture
-->

# Plantilla Generica De Obra

## Objetivo

Las obras nuevas reciben una muestra neutra para que el usuario vea el flujo
completo sin importar datos de un cliente. La semilla no representa una obra
real, un contrato real ni un procedimiento propietario.

## Contenido

- Catalogo CSV: [`data/generic-project-code-catalog.csv`](../../data/generic-project-code-catalog.csv).
- Zonas ficticias: Zona Norte, Zona Sur y Zona Centro.
- Cinco codigos `EJ-*` ordenados en tres itinerarios.
- La creacion de obra tambien prepara dos puntos de control ilustrativos:
  nivel digital y piezometro, cada uno con un umbral de ejemplo.
- Los registros se marcan con una nota que obliga a revisar y sustituir la
  muestra antes de una campaña real.

## Implementacion

`apps/backend/src/lib/generic-project-template.ts` inserta el catalogo, los
puntos y los umbrales dentro de la transaccion de creacion de obra. Si una
campaña real necesita otros codigos, el admin puede importar su CSV por la
ruta protegida de catalogo; ese proceso no se versiona en Git.

## Limites

No se incluyen nombres de obras, clientes, itinerarios reales, frecuencias de
medicion ni valores de seguridad certificados. Los umbrales son ilustrativos y
no deben usarse para decisiones estructurales.
