/**
 * Tipos TypeScript para el modelo de obras/campañas/faenas
 * Basado en migración 015_obras_baseline_retroactive.sql (ADR 001)
 *
 * Este esquema está en español y convive temporalmente con el modelo "projects" en inglés.
 * Ver ADR 001 para condiciones de reconciliación.
 */

// =====================================================
// OBRAS (proyectos de obra)
// =====================================================

export type ObraEstado = 'activa' | 'pausada' | 'cerrada';

export interface Obra {
  id: number;
  nombre: string;
  ubicacion: string | null;
  tipo: string | null;
  estado: ObraEstado;
  fechaInicio: string | null; // DATE como ISO string
  notas: string | null;
  createdAt: string; // TIMESTAMPTZ como ISO string
}

export interface CreateObraInput {
  nombre: string;
  ubicacion?: string | null;
  tipo?: string | null;
  estado?: ObraEstado;
  fechaInicio?: string | null;
  notas?: string | null;
}

// =====================================================
// CAMPAÑAS (ciclos de medición por obra)
// =====================================================

export type CampanaEstado = 'importada' | 'validada' | 'cerrada';

export interface Campana {
  id: number;
  obraId: number;
  nombre: string | null;
  fecha: string; // DATE como ISO string
  archivoTxt: string | null;
  estado: CampanaEstado;

  // Resumen estadístico
  totalSensores: number;
  medidos: number;
  noMedidos: number;
  nuevos: number;
  coberturaPct: number | null;

  // Evaluación de movimientos
  movOk: number;
  movPrealerta: number;
  movAlerta: number;
  coordIncoherentes: number;
  maxAsientoMm: number;
  maxLevanteMm: number;

  // Metadata
  ficheroOrigen: string | null;
  operador: string | null;
  descripcion: string | null;
  estacionamiento: string | null; // texto libre, no FK

  // Relación opcional
  jornadaId: number | null;

  createdAt: string; // TIMESTAMPTZ como ISO string
}

export interface CreateCampanaInput {
  obraId: number;
  nombre?: string | null;
  fecha: string;
  archivoTxt?: string | null;
  estado?: CampanaEstado;
  ficheroOrigen?: string | null;
  operador?: string | null;
  descripcion?: string | null;
}

// =====================================================
// JORNADAS (sesiones de trabajo por topógrafo)
// =====================================================

export type JornadaEstado = 'abierta' | 'cerrada';

export interface Jornada {
  id: number;
  obraId: number;
  topografo: string | null; // texto libre, no FK
  fecha: string; // DATE como ISO string
  notas: string | null;
  estado: JornadaEstado;
  createdAt: string;
}

export interface CreateJornadaInput {
  obraId: number;
  topografo?: string | null;
  fecha: string;
  notas?: string | null;
  estado?: JornadaEstado;
}

// =====================================================
// SENSORES (catálogo de puntos de control por obra)
// =====================================================

export type TipoSensor = 'nivelacion' | 'prisma' | 'inclinometro' | 'piezometro' | 'otro';
export type EstadoSensor = 'activo' | 'inactivo' | 'reemplazado';

export interface Sensor {
  id: number;
  obraId: number;
  codigo: string;

  // Coordenadas de referencia
  lat: number | null;
  lng: number | null;
  cotaRef: number | null;

  // Sistema de coordenadas local/proyectado
  east: number | null;
  north: number | null;
  zLocal: number | null;
  coordsCalculadas: boolean;

  // Clasificación
  itinerario: string | null;
  tipoSensor: TipoSensor;
  estado: EstadoSensor;

  // Metadata
  fechaInstalacion: string | null; // DATE como ISO string
  notas: string | null;

  createdAt: string;
}

export interface CreateSensorInput {
  obraId: number;
  codigo: string;
  lat?: number | null;
  lng?: number | null;
  cotaRef?: number | null;
  itinerario?: string | null;
  tipoSensor?: TipoSensor;
  estado?: EstadoSensor;
  fechaInstalacion?: string | null;
  notas?: string | null;
}

// =====================================================
// MEDICIONES (observaciones individuales por campaña)
// =====================================================

export type MovimientoEstado = 'ok' | 'prealerta' | 'alerta';
export type EstadoMatch = 'exact' | 'fuzzy' | 'new' | 'unmatched';
export type TipoPunto = 'sensor' | 'referencia' | 'control';

export interface Medicion {
  id: number;
  obraId: number;
  campanaId: number;
  estacionamientoId: number | null;
  sensorId: number | null;

  // Identificación del punto medido
  pointIdCsv: string; // código del punto tal como viene en archivo importado
  fechaMedicion: string; // texto, no DATE (viene así del CSV)

  // Valores observados
  elevMedida: number;
  eastCsv: number | null;
  northCsv: number | null;

  // Metadata de medición
  instrumento: string | null;
  comentario: string | null;

  // Cálculos y validaciones
  desnivel: number | null;
  movimiento: MovimientoEstado;
  estadoMatch: EstadoMatch;
  tipoPunto: TipoPunto;
  coordenadasOk: boolean;
  distXyM: number | null;
  posibleTypo: boolean;
  similarA: string | null;

  createdAt: string;
}

export interface CreateMedicionInput {
  obraId: number;
  campanaId: number;
  estacionamientoId?: number | null;
  sensorId?: number | null;
  pointIdCsv: string;
  fechaMedicion: string;
  elevMedida: number;
  eastCsv?: number | null;
  northCsv?: number | null;
  instrumento?: string | null;
  comentario?: string | null;
  estadoMatch: EstadoMatch;
  tipoPunto?: TipoPunto;
}

// =====================================================
// ESTACIONAMIENTOS (setups de estación total por campaña)
// =====================================================

export interface Estacionamiento {
  id: number;
  campanaId: number;
  obraId: number;
  nombre: string;
  ficheroOrigen: string | null;
  formato: string | null;
  operador: string | null; // texto libre, no FK
  totalLecturas: number;
  createdAt: string;
}

export interface CreateEstacionamientoInput {
  campanaId: number;
  obraId: number;
  nombre: string;
  ficheroOrigen?: string | null;
  formato?: string | null;
  operador?: string | null;
  totalLecturas?: number;
}
