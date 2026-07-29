export type UserRole = 'admin' | 'topografo' | 'visitante';
export type AuthProvider = 'guest' | 'supabase';

export type StationStatus = 'active' | 'replaced' | 'incident';
export type IncidentStatus = 'open' | 'resolved';
export type IncidentType = 'obstaculo_estacionamiento' | 'prisma_no_visible' | 'otro';
export type SuggestionKind = 'new_station' | 'alternate_prism' | 'free_note';
export type EntityType = 'station' | 'prism' | 'guide_entry' | 'project';
export type DeviceType = 'leica' | 'trimble';
export type ReadingSource = 'gps_offline' | 'mobile_network';
export type StationMapStatus = 'approximate' | 'verified' | 'resolved';
export type StationPhotoKind = 'general' | 'point' | 'reference' | 'access' | 'obstacle' | 'other';
export type PrismStatus = 'active' | 'missing' | 'replaced' | 'inactive';
export type PrismObservationSourceFormat = 'trimble_csv' | 'trimble_rpd' | 'leica_txt';
export type InstrumentType =
  | 'total_station'
  | 'digital_level'
  | 'piezometer'
  | 'distometer'
  | 'linometer'
  | 'inclinometer'
  | 'cant_rule';
export type ControlPointEnvironment = 'surface' | 'tunnel' | 'other';
export type ControlPointSide = 'left' | 'right' | 'axis' | 'crown' | 'invert' | 'other';
export type MonitoringRoundStatus = 'draft' | 'active' | 'closed' | 'cancelled';
export type MonitoringRoundPointStatus = 'pending' | 'taken' | 'skipped' | 'cancelled';
export type InstrumentReadingStatus = 'draft' | 'confirmed' | 'reviewed' | 'rejected';
export type ReadingAttachmentType = 'photo' | 'note' | 'file';
export type CalculatedThresholdStatus = 'normal' | 'warning' | 'alarm' | 'unknown';
export type OfflineQueueEntityType =
  | 'station_message'
  | 'incident'
  | 'station_photo'
  | 'prism_observation'
  | 'medicion'
  | 'campana'
  | 'sensor';
export type OfflineQueueStatus = 'pending' | 'syncing' | 'synced' | 'error' | 'conflict';
export type ZoneColor = 'blue' | 'pink' | 'green';
export type FieldConditions = 'good' | 'regular' | 'adverse';
export type ProjectRuleType =
  | 'max_points_per_pass'
  | 'auto_confirm_green'
  | 'block_on_alarm'
  | 'require_photo_on_warning';

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary extends Project {
  stationCount: number;
}

export interface CreateProjectInput {
  code?: string | null;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionUser {
  authProvider: AuthProvider;
  email: string | null;
  fullName: string | null;
  id: string;
  isActive: boolean | null;
  role: UserRole;
}

export interface Station {
  id: string;
  externalId: string | null;
  projectId: string | null;
  sourceSystem: string;
  name: string;
  deviceType: DeviceType | null;
  mapStatus: StationMapStatus | null;
  lat: number | null;
  lng: number | null;
  utmZone: string | null;
  utmEasting: number | null;
  utmNorthing: number | null;
  elevation: number | null;
  resolvedMethod: string | null;
  displayMode: string | null;
  photoUrl: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  status: StationStatus;
  updatedAt: string;
}

export interface StationReading {
  id: string;
  externalKey: string | null;
  stationId: string;
  sourceSystem: string;
  source: ReadingSource;
  lat: number;
  lng: number;
  utmZone: string | null;
  utmEasting: number | null;
  utmNorthing: number | null;
  elevation: number | null;
  accuracy: number | null;
  bearing: number | null;
  declination: number | null;
  speedKmh: number | null;
  mapUrl: string | null;
  capturedOnline: boolean;
  createdAt: string;
}

export interface CreateStationReadingInput {
  source: ReadingSource;
  lat: number;
  lng: number;
  utmZone?: string | null;
  utmEasting?: number | null;
  utmNorthing?: number | null;
  elevation?: number | null;
  accuracy?: number | null;
  bearing?: number | null;
  declination?: number | null;
  speedKmh?: number | null;
  mapUrl?: string | null;
  capturedOnline: boolean;
  rawPayload?: Record<string, unknown> | null;
}

export interface CreateStationInput {
  projectId?: string | null;
  name: string;
  deviceType?: DeviceType | null;
  mapStatus?: StationMapStatus | null;
  lat?: number | null;
  lng?: number | null;
  utmZone?: string | null;
  utmEasting?: number | null;
  utmNorthing?: number | null;
  elevation?: number | null;
  resolvedMethod?: string | null;
  displayMode?: string | null;
  notes?: string | null;
  status?: StationStatus;
  readings?: CreateStationReadingInput[];
}

export interface UpdateStationNotesInput {
  notes: string | null;
}

export interface StationMessage {
  id: string;
  stationId: string;
  body: string;
  createdBy: string;
  createdByUser: {
    email: string;
    fullName: string;
    role: UserRole;
  } | null;
  station?: {
    id: string;
    name: string;
    project: {
      code: string;
      name: string;
    } | null;
  } | null;
  createdAt: string;
}

export interface CreateStationMessageInput {
  body: string;
  clientRequestId?: string;
}

export interface StationPhoto {
  id: string;
  stationId: string;
  storagePath: string;
  publicUrl: string;
  kind: StationPhotoKind;
  title: string | null;
  notes: string | null;
  uploadedBy: string;
  uploadedAt: string;
  isPrimary: boolean;
}

export interface Prism {
  id: string;
  stationId: string | null;
  projectId: string | null;
  sourceSystem: string;
  externalId: string | null;
  code: string;
  prismConstant: number | null;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  sourceFiles: string[];
  monitoringMetadata: Record<string, unknown>;
  notes: string | null;
  photoUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: PrismStatus;
}

export interface PrismObservation {
  id: string;
  prismId: string;
  stationId: string | null;
  sourceSystem: string;
  externalKey: string;
  sourceFile: string;
  sourceFormat: PrismObservationSourceFormat;
  stationCode: string | null;
  face: string | null;
  measuredAt: string | null;
  horizontalAngle: number | null;
  verticalAngle: number | null;
  slopeDistance: number | null;
  easting: number | null;
  northing: number | null;
  reducedLevel: number | null;
  prismConstant: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrismCoverageStation {
  stationCode: string;
  stationId: string | null;
  visiblePrisms: string[];
  missingPrisms: string[];
  sourceFiles: string[];
}

export interface PrismCoverageGroup {
  groupCode: string;
  totalUniquePrisms: number;
  stationCodes: string[];
  stations: PrismCoverageStation[];
}

export interface ChangeLog {
  id: string;
  entityType: EntityType;
  entityId: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedByUser: {
    email: string;
    fullName: string;
    role: UserRole;
  } | null;
  changedAt: string;
}

export type PhotoUploadEntityType = 'station' | 'project' | 'prism';
export type PhotoContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface SignedPhotoUpload {
  bucket: string;
  contentType: PhotoContentType;
  maxSizeBytes: number;
  path: string;
  publicUrl: string;
  signedUrl: string;
  token: string;
}

export interface IncidentSuggestion {
  kind: SuggestionKind;
  proposedStationName: string | null;
  proposedPrismCode: string | null;
  proposedLat: number | null;
  proposedLng: number | null;
  notes: string | null;
}

export interface Incident {
  id: string;
  stationId: string | null;
  prismId: string | null;
  type: IncidentType;
  description: string;
  photoUrl: string | null;
  reportedBy: string;
  reportedAt: string;
  status: IncidentStatus;
  suggestion: IncidentSuggestion | null;
  updatedAt: string;
}

export interface CreateIncidentInput {
  stationId?: string | null;
  prismId?: string | null;
  type: IncidentType;
  description: string;
  photoUrl?: string | null;
  suggestion?: IncidentSuggestion | null;
}

export interface GuideEntry {
  id: string;
  title: string;
  body: string;
  category: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkSessionCoordinate {
  id: string;
  label: string;
  lat: number | null;
  lng: number | null;
  utmZone: string | null;
  utmEasting: number | null;
  utmNorthing: number | null;
  notes: string | null;
}

export interface WorkSession {
  id: string;
  date: string;
  notes: string | null;
  coordinates: WorkSessionCoordinate[];
  createdAt: string;
  updatedAt: string;
}

export interface CaptureLogEntry {
  id: string;
  stationId: string | null;
  projectId: string | null;
  sessionId: string | null;
  deviceType: DeviceType | null;
  source: ReadingSource | null;
  rawPayload: Record<string, unknown>;
  isSuspicious: boolean;
  suspiciousReason: string | null;
  createdAt: string;
}

export interface ControlPoint {
  id: string;
  projectId: string;
  code: string;
  name: string | null;
  environment: ControlPointEnvironment;
  pk: string | null;
  tramo: string | null;
  zona: string | null;
  seccion: string | null;
  side: ControlPointSide | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoringRound {
  id: string;
  projectId: string;
  name: string;
  roundDate: string;
  status: MonitoringRoundStatus;
  operatorId: string | null;
  instrumentSerial: string | null;
  fieldConditions: FieldConditions | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoringRoundPoint {
  id: string;
  roundId: string;
  controlPointId: string;
  expectedInstrumentType: InstrumentType;
  status: MonitoringRoundPointStatus;
  sortOrder: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InstrumentReading {
  id: string;
  roundPointId: string;
  controlPointId: string;
  instrumentType: InstrumentType;
  readingStatus: InstrumentReadingStatus;
  clientRequestId: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  measuredAt: string;
  measuredBy: string;
  notes: string | null;
  rawPayload: Record<string, unknown> | null;
  delta?: number | null;
  thresholdStatus?: CalculatedThresholdStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingAttachment {
  id: string;
  readingId: string;
  storagePath: string;
  publicUrl: string;
  attachmentType: ReadingAttachmentType;
  title: string | null;
  notes: string | null;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ControlPointThreshold {
  id: string;
  controlPointId: string;
  instrumentType: InstrumentType;
  warningValue: number | null;
  alarmValue: number | null;
  unit: string;
  validFrom: string;
  validTo: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineQueueItem {
  idLocal: string;
  entityType: OfflineQueueEntityType;
  payload: Record<string, unknown>;
  status: OfflineQueueStatus;
  createdAt: string;
  syncedAt: string | null;
  errorMessage: string | null;
}

export interface ProjectCodeCatalogEntry {
  id: string;
  projectId: string;
  code: string;
  zone: string;
  zoneColor: ZoneColor | null;
  itineraryNumber: number;
  itineraryOrder: number;
  environment: ControlPointEnvironment | null;
  pk: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ProjectRule {
  id: string;
  projectId: string;
  ruleType: ProjectRuleType;
  value: string;
  configuredBy: string;
  createdAt: string;
}

export interface ReadingInsertResponse {
  reading: InstrumentReading;
  delta: number | null;
  thresholdStatus: CalculatedThresholdStatus;
  autoConfirmed: boolean;
}

// =====================================================
// MODELO OBRAS (ADR 001, Fase 1)
// =====================================================
// Re-exportados desde obras-types.ts para mantener compatibilidad.
// Este modelo convive temporalmente con "projects" (ver ADR 001).

export {
  type ObraEstado,
  type Obra,
  type CreateObraInput,
  type CampanaEstado,
  type Campana,
  type CreateCampanaInput,
  type JornadaEstado,
  type Jornada,
  type CreateJornadaInput,
  type TipoSensor,
  type EstadoSensor,
  type Sensor,
  type CreateSensorInput,
  type MovimientoEstado,
  type EstadoMatch,
  type TipoPunto,
  type Medicion,
  type CreateMedicionInput,
  type Estacionamiento,
  type CreateEstacionamientoInput,
} from './obras-types.js';
