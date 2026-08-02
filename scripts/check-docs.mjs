#!/usr/bin/env node
/**
 * check-docs.mjs — chequeo de coherencia de la documentación de TopoField.
 *
 * Existe porque durante semanas convivieron dos numeraciones de fases
 * contradictorias y varios documentos afirmaban estados ya superados, lo que
 * obligó a repetir conversaciones ya cerradas. Este script no juzga el
 * contenido; comprueba invariantes mecánicas que, cuando se rompen, son la
 * causa habitual de esa deriva.
 *
 * Reglas comprobadas:
 *   1. Todo .md vigilado empieza con una cabecera `<!-- doc-status ... -->`.
 *   2. `estado:` es exactamente `vivo` o `archivado`.
 *   3. Existe exactamente UN documento con `rol: roadmap`.
 *   4. Los documentos vivos traen `verificado: AAAA-MM-DD`; si supera
 *      DIAS_RANCIO, se avisa (no falla, salvo --strict).
 *   5. Los archivados traen `congelado:` y un `superado-por:` que exista.
 *   6. Los enlaces markdown relativos apuntan a archivos que existen.
 *   7. Ningún documento vivo enlaza a `docs/archive/` como si fuera estado
 *      actual, salvo README.md y ROADMAP.md, que sí deben poder citarlo.
 *
 * Uso:  node scripts/check-docs.mjs [--strict]
 * Sale con código 1 si hay errores. Los avisos no rompen salvo --strict.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STRICT = process.argv.includes('--strict');
const DIAS_RANCIO = 90;

/** Carpetas que nunca se recorren. */
const EXCLUIDAS = new Set(['node_modules', '.git', 'android', 'ios', 'dist', 'build', '.expo']);

/** Solo se vigilan la raíz y docs/. El resto (READMEs de librerías, etc.) queda fuera. */
const VIGILADOS = ['.', 'docs'];

const errores = [];
const avisos = [];

function recolectar(dir, profundidad = 0) {
  const salida = [];
  let entradas;
  try {
    entradas = readdirSync(join(RAIZ, dir));
  } catch {
    return salida;
  }
  for (const entrada of entradas) {
    if (EXCLUIDAS.has(entrada)) continue;
    const rel = dir === '.' ? entrada : posix.join(dir, entrada);
    const abs = join(RAIZ, rel);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (dir === '.' && !VIGILADOS.includes(rel)) continue;
      salida.push(...recolectar(rel, profundidad + 1));
    } else if (entrada.endsWith('.md')) {
      salida.push(rel);
    }
  }
  return salida;
}

function parsearCabecera(texto) {
  const m = texto.match(/^<!--\s*doc-status\s*([\s\S]*?)-->/);
  if (!m) return null;
  const campos = {};
  for (const linea of m[1].split('\n')) {
    const mm = linea.match(/^\s*([a-z-]+)\s*:\s*(.+?)\s*$/);
    if (mm) campos[mm[1]] = mm[2];
  }
  return campos;
}

function diasDesde(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

/** Enlaces markdown [texto](destino) que sean rutas relativas locales. */
function enlacesRelativos(texto) {
  const salida = [];
  const re = /\[[^\]]*\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(texto)) !== null) {
    const destino = m[1].trim();
    if (/^(https?:|mailto:|#)/.test(destino)) continue;
    salida.push(destino.split('#')[0]);
  }
  return salida;
}

const archivos = recolectar('.');
if (archivos.length === 0) {
  console.error('check-docs: no se encontró ningún .md vigilado. ¿Ruta incorrecta?');
  process.exit(1);
}

const roadmaps = [];

for (const rel of archivos) {
  const texto = readFileSync(join(RAIZ, rel), 'utf8');
  const cab = parsearCabecera(texto);

  if (!cab) {
    errores.push(`${rel}: falta la cabecera <!-- doc-status ... -->. Añádela indicando estado: vivo | archivado.`);
    continue;
  }

  const estado = cab.estado;
  if (estado !== 'vivo' && estado !== 'archivado') {
    errores.push(`${rel}: estado inválido (${estado ?? 'ausente'}). Debe ser "vivo" o "archivado".`);
    continue;
  }

  if (cab.rol === 'roadmap') roadmaps.push(rel);

  if (estado === 'vivo') {
    if (!cab.verificado) {
      errores.push(`${rel}: documento vivo sin campo "verificado: AAAA-MM-DD".`);
    } else {
      const d = diasDesde(cab.verificado);
      if (d === null) {
        errores.push(`${rel}: "verificado: ${cab.verificado}" no es una fecha AAAA-MM-DD válida.`);
      } else if (d > DIAS_RANCIO) {
        avisos.push(`${rel}: verificado hace ${d} días. Reléelo, confirma que sigue siendo cierto y actualiza la fecha, o archívalo.`);
      }
    }
  }

  if (estado === 'archivado') {
    if (!cab.congelado) {
      errores.push(`${rel}: documento archivado sin campo "congelado: AAAA-MM-DD".`);
    }
    if (!cab['superado-por']) {
      errores.push(`${rel}: documento archivado sin "superado-por:". Indica qué documento vivo ocupa su lugar.`);
    } else if (!existsSync(join(RAIZ, cab['superado-por']))) {
      errores.push(`${rel}: "superado-por: ${cab['superado-por']}" apunta a un archivo que no existe.`);
    }
  }

  // Enlaces rotos.
  const base = dirname(join(RAIZ, rel));
  for (const destino of enlacesRelativos(texto)) {
    const abs = resolve(base, destino);
    if (!existsSync(abs)) {
      errores.push(`${rel}: enlace roto -> ${destino}`);
    }
  }

  // Un documento vivo no debería apoyarse en material archivado como estado actual.
  if (estado === 'vivo' && !['README.md', 'ROADMAP.md', 'AGENTS.md'].includes(rel)) {
    for (const destino of enlacesRelativos(texto)) {
      if (destino.includes('docs/archive/')) {
        avisos.push(`${rel}: enlaza a docs/archive/ (${destino}). El material archivado es historial, no estado actual.`);
      }
    }
  }
}

if (roadmaps.length === 0) {
  errores.push('No hay ningún documento con "rol: roadmap". Debe haber exactamente uno (ROADMAP.md).');
} else if (roadmaps.length > 1) {
  errores.push(
    `Hay ${roadmaps.length} documentos declarando "rol: roadmap" (${roadmaps.join(', ')}). ` +
      'Solo puede haber uno: dos roadmaps simultáneos es exactamente el problema que este chequeo existe para evitar.'
  );
}

// Salida.
const vivos = archivos.length - roadmaps.length;
console.log(`check-docs: ${archivos.length} documentos revisados en raíz y docs/.`);

for (const a of avisos) console.log(`  aviso  ${a}`);
for (const e of errores) console.log(`  ERROR  ${e}`);

if (errores.length > 0) {
  console.log(`\n${errores.length} error(es). La documentación no está coherente.`);
  process.exit(1);
}
if (avisos.length > 0 && STRICT) {
  console.log(`\n${avisos.length} aviso(s) y --strict activo.`);
  process.exit(1);
}
console.log(avisos.length > 0 ? `\nSin errores. ${avisos.length} aviso(s) por revisar.` : '\nSin errores ni avisos.');
