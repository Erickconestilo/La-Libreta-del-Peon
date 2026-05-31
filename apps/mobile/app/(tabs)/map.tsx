import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Animated, Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStations } from '@/hooks/use-stations';
import { getStationDisplayName } from '@/lib/station-display';
import { borderRadius, colors, spacing, typography } from '@/src/theme';

type StationWithProject = import('@shared/types').Station & {
  project?: { code: string; name: string } | null;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PANEL_HEIGHT = 200;
const HAS_GOOGLE_MAPS_KEY = Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);

const DEFAULT_REGION = {
  latitude: 41.4013,
  latitudeDelta: 0.05,
  longitude: 2.1506,
  longitudeDelta: 0.05,
};

const statusConfig = {
  active: { label: 'Activa', color: colors.accentGreen },
  replaced: { label: 'Reemplazada', color: colors.amber },
  incident: { label: 'Incidencia', color: colors.red },
} as const;

export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId?: string; projectName?: string }>();
  const insets = useSafeAreaInsets();
  const { data, errorMessage, isLoading, refetch, isRefetching } = useStations();
  const stations = data ?? [];

  const [selectedStation, setSelectedStation] = useState<StationWithProject | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;

    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [params.projectId]);

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const station of stations) {
      if (station.projectId && station.project?.name) {
        map.set(station.projectId, station.project.name);
      }
    }

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [stations]);

  const visibleStations = useMemo(() => {
    if (!selectedProjectId) {
      return stations;
    }

    return stations.filter((station) => station.projectId === selectedProjectId);
  }, [selectedProjectId, stations]);

  const stationsWithCoordinates = useMemo(
    () =>
      visibleStations.filter(
        (s): s is typeof s & { lat: number; lng: number } =>
          typeof s.lat === 'number' && typeof s.lng === 'number',
      ),
    [visibleStations],
  );

  const initialRegion = useMemo(
    () => getInitialRegion(stationsWithCoordinates),
    [stationsWithCoordinates],
  );

  useEffect(() => {
    if (HAS_GOOGLE_MAPS_KEY && stationsWithCoordinates.length > 0) {
      mapRef.current?.animateToRegion(initialRegion, 350);
    }
  }, [initialRegion, stationsWithCoordinates.length]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      friction: 10,
      toValue: selectedStation ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [selectedStation, slideAnim]);

  const handleMarkerPress = useCallback(
    (station: StationWithProject) => setSelectedStation(station),
    [],
  );

  const handleClosePanel = useCallback(() => setSelectedStation(null), []);

  const handleProjectFilter = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId);
    setSelectedStation(null);
  }, []);

  const handleDetail = useCallback(() => {
    if (!selectedStation) return;
    router.push(`/station/${selectedStation.id}`);
  }, [router, selectedStation]);

  const handleOpenInMaps = useCallback(async (station: StationWithProject & { lat: number; lng: number }) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`;

    Alert.alert(
      'Abrir fuera de la app',
      'Se enviarán las coordenadas de esta estación a Google Maps.',
      [
        {
          style: 'cancel',
          text: 'Cancelar'
        },
        {
          onPress: () => {
            void Linking.openURL(url);
          },
          text: 'Abrir'
        }
      ]
    );
  }, []);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_HEIGHT, 0],
  });

  if (errorMessage) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Error al cargar</Text>
        <Text style={styles.errorBody}>{errorMessage}</Text>
      </View>
    );
  }

  if (isLoading && stationsWithCoordinates.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Cargando mapas...</Text>
      </View>
    );
  }

  if (!isLoading && stationsWithCoordinates.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Sin estaciones en mapas</Text>
        <Text style={styles.errorBody}>No hay estaciones con coordenadas para mostrar.</Text>
      </View>
    );
  }

  if (!HAS_GOOGLE_MAPS_KEY) {
    return (
      <View style={styles.fallbackContainer}>
        <ScrollView
          contentContainerStyle={[
            styles.fallbackContent,
            { paddingBottom: 112 + insets.bottom, paddingTop: spacing[3] + insets.top },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.fallbackHero}>
            <Text style={styles.fallbackEyebrow}>Mapas</Text>
            <Text style={styles.fallbackTitle}>Coordenadas por obra</Text>
            <Text style={styles.fallbackBody}>
              El mapa embebido necesita una clave de Google Maps. Mientras no la configuremos,
              la app muestra las estaciones con coordenadas y permite abrirlas en Google Maps.
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectFilterRow}>
            <ProjectChip
              label="Todas"
              onPress={() => handleProjectFilter(null)}
              selected={selectedProjectId === null}
            />
            {projectOptions.map((project) => (
              <ProjectChip
                key={project.id}
                label={project.name}
                onPress={() => handleProjectFilter(project.id)}
                selected={selectedProjectId === project.id}
              />
            ))}
          </ScrollView>

          <Text style={styles.fallbackCount}>
            {stationsWithCoordinates.length} estacionamientos con coordenadas
          </Text>

          {stationsWithCoordinates.map((station) => (
            <View key={station.id} style={styles.stationMapCard}>
              <View style={styles.stationMapHeader}>
                <Text style={styles.stationMapProject}>
                  {station.project?.name ?? 'Sin obra'}
                </Text>
                <View style={[styles.statusChip, { backgroundColor: statusConfig[station.status].color }]}>
                  <Text style={styles.statusChipText}>{statusConfig[station.status].label}</Text>
                </View>
              </View>
              <Text style={styles.stationMapTitle}>{getStationDisplayName(station)}</Text>
              <Text style={styles.stationMapCoords}>
                {station.lat.toFixed(8)}, {station.lng.toFixed(8)}
              </Text>
              <View style={styles.stationMapActions}>
                <Pressable onPress={() => router.push(`/station/${station.id}`)} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Ver detalle</Text>
                </Pressable>
                <Pressable onPress={() => void handleOpenInMaps(station)} style={styles.primaryMapBtn}>
                  <Text style={styles.detailBtnText}>Abrir mapa</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} initialRegion={initialRegion} style={styles.map}>
        {stationsWithCoordinates.map((station) => (
          <Marker
            key={station.id}
            coordinate={{ latitude: station.lat, longitude: station.lng }}
            onPress={() => handleMarkerPress(station)}
            pinColor={station.deviceType === 'leica' ? colors.amber : colors.accentGreen}
          />
        ))}
      </MapView>

      <Pressable
        onPress={isRefetching ? undefined : () => void refetch()}
        style={[styles.refreshBtn, { top: spacing[3] + insets.top }]}
      >
        <Text style={styles.refreshBtnText}>{isRefetching ? '...' : '↻'}</Text>
      </Pressable>

      <View style={[styles.projectFilters, { top: spacing[3] + insets.top }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectFilterRow}>
          <ProjectChip
            label="Todas"
            onPress={() => handleProjectFilter(null)}
            selected={selectedProjectId === null}
          />
          {projectOptions.map((project) => (
            <ProjectChip
              key={project.id}
              label={project.name}
              onPress={() => handleProjectFilter(project.id)}
              selected={selectedProjectId === project.id}
            />
          ))}
        </ScrollView>
      </View>

      {selectedStation ? (
        <Pressable onPress={handleClosePanel} style={styles.backdrop} />
      ) : null}

      <Animated.View style={[styles.panel, { bottom: 64 + Math.max(insets.bottom, spacing[1]), transform: [{ translateY }] }]}>
        <View style={styles.panelHandle} />

        <View style={styles.panelContent}>
          <Text style={styles.panelTitle}>{selectedStation ? getStationDisplayName(selectedStation) : ''}</Text>

          <View style={styles.panelRow}>
            <Text style={styles.panelProject}>
              {selectedStation?.project?.name ?? 'Sin obra'}
            </Text>
            {selectedStation ? (
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: statusConfig[selectedStation.status].color },
                ]}
              >
                <Text style={styles.statusChipText}>
                  {statusConfig[selectedStation.status].label}
                </Text>
              </View>
            ) : null}
          </View>

          <Pressable onPress={handleDetail} style={styles.detailBtn}>
            <Text style={styles.detailBtnText}>Ver detalle</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

function ProjectChip({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.projectChip, selected ? styles.projectChipSelected : null]}>
      <Text style={[styles.projectChipText, selected ? styles.projectChipTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

const getInitialRegion = (
  coordinates: Array<{ lat: number; lng: number }>,
) => {
  if (coordinates.length === 0) return DEFAULT_REGION;

  const lats = coordinates.map((c) => c.lat);
  const lngs = coordinates.map((c) => c.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    latitude: (minLat + maxLat) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.8, 0.01),
    longitude: (minLng + maxLng) / 2,
    longitudeDelta: Math.max((maxLng - minLng) * 1.8, 0.01),
  };
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
  centered: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing[2],
    justifyContent: 'center',
    padding: spacing[4],
  },
  container: {
    flex: 1,
  },
  detailBtn: {
    alignItems: 'center',
    backgroundColor: colors.accentGreen,
    borderRadius: borderRadius[0],
    paddingVertical: spacing[2],
  },
  detailBtnText: {
    color: colors.background,
    fontSize: typography.fontSizeBody,
    fontWeight: '700',
  },
  fallbackBody: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody - 1,
    lineHeight: 22,
  },
  fallbackContainer: {
    backgroundColor: colors.background,
    flex: 1,
  },
  fallbackContent: {
    gap: spacing[2],
    padding: spacing[3],
  },
  fallbackCount: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  fallbackEyebrow: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  fallbackHero: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  fallbackTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
  },
  errorBody: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody - 1,
    textAlign: 'center',
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '800',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  panel: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius[1],
    borderTopRightRadius: borderRadius[1],
    left: 0,
    paddingBottom: 24,
    position: 'absolute',
    right: 0,
    zIndex: 2,
  },
  panelContent: {
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingTop: spacing[1],
  },
  panelHandle: {
    alignSelf: 'center',
    backgroundColor: colors.textSecondary,
    borderRadius: 3,
    height: 4,
    marginTop: spacing[1],
    width: 40,
  },
  panelProject: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  panelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1],
  },
  panelTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '800',
  },
  projectChip: {
    backgroundColor: 'rgba(28, 31, 38, 0.92)',
    borderColor: '#2a2f3a',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  projectChipSelected: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen,
  },
  projectChipText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  projectChipTextSelected: {
    color: colors.background,
  },
  projectFilterRow: {
    gap: spacing[1],
    paddingLeft: spacing[3],
    paddingRight: 64,
  },
  projectFilters: {
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 3,
  },
  refreshBtn: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 22,
    elevation: 4,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing[3],
    shadowColor: '#000',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: 44,
    zIndex: 3,
  },
  refreshBtnText: {
    color: colors.textPrimary,
    fontSize: 22,
  },
  primaryMapBtn: {
    alignItems: 'center',
    backgroundColor: colors.accentGreen,
    borderRadius: borderRadius[0],
    flex: 1,
    paddingVertical: spacing[2],
  },
  secondaryBtn: {
    alignItems: 'center',
    borderColor: '#2a2f3a',
    borderRadius: borderRadius[0],
    borderWidth: 1,
    flex: 1,
    paddingVertical: spacing[2],
  },
  secondaryBtnText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeBody - 1,
    fontWeight: '800',
  },
  stationMapActions: {
    flexDirection: 'row',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  stationMapCard: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  stationMapCoords: {
    color: colors.accentGreen,
    fontSize: 14,
    fontWeight: '800',
  },
  stationMapHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stationMapProject: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  stationMapTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '900',
  },
  statusChip: {
    borderRadius: borderRadius[0],
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
  },
  statusChipText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
