export type UserRole = 'admin' | 'topografo' | 'visitante';

export type StationStatus = 'active' | 'replaced' | 'incident';
export type IncidentStatus = 'open' | 'resolved';
export type IncidentType = 'obstaculo_estacionamiento' | 'prisma_no_visible' | 'otro';
export type SuggestionKind = 'new_station' | 'alternate_prism' | 'free_note';
export type EntityType = 'station' | 'prism';
export type DeviceType = 'leica' | 'trimble';
export type ReadingSource = 'gps_offline' | 'mobile_network';
export type StationMapStatus = 'approximate' | 'verified' | 'resolved';

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  rawPayload: Record<string, unknown> | null;
  createdAt: string;
}

export interface Prism {
  id: string;
  stationId: string | null;
  code: string;
  notes: string | null;
  photoUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeLog {
  id: string;
  entityType: EntityType;
  entityId: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedAt: string;
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
