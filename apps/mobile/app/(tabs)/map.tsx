import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'expo-router';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { useStations } from '@/hooks/use-stations';
import { borderRadius, colors, spacing, typography } from '@/src/theme';

type StationWithProject = import('@shared/types').Station & {
  project?: { code: string; name: string } | null;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PANEL_HEIGHT = 200;

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
  const { data, errorMessage, isLoading, refetch, isRefetching } = useStations();
  const stations = data ?? [];

  const [selectedStation, setSelectedStation] = useState<StationWithProject | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const stationsWithCoordinates = useMemo(
    () =>
      stations.filter(
        (s): s is typeof s & { lat: number; lng: number } =>
          typeof s.lat === 'number' && typeof s.lng === 'number',
      ),
    [stations],
  );

  const initialRegion = useMemo(
    () => getInitialRegion(stationsWithCoordinates),
    [stationsWithCoordinates],
  );

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

  const handleDetail = useCallback(() => {
    if (!selectedStation) return;
    router.push(`/station/${selectedStation.id}`);
  }, [router, selectedStation]);

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
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  if (!isLoading && stationsWithCoordinates.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Sin estaciones en el mapa</Text>
        <Text style={styles.errorBody}>No hay estaciones con coordenadas para mostrar.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView initialRegion={initialRegion} style={styles.map}>
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
        style={styles.refreshBtn}
      >
        <Text style={styles.refreshBtnText}>{isRefetching ? '...' : '↻'}</Text>
      </Pressable>

      {selectedStation ? (
        <Pressable onPress={handleClosePanel} style={styles.backdrop} />
      ) : null}

      <Animated.View style={[styles.panel, { transform: [{ translateY }] }]}>
        <View style={styles.panelHandle} />

        <View style={styles.panelContent}>
          <Text style={styles.panelTitle}>{selectedStation?.name ?? ''}</Text>

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
    bottom: 0,
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
    top: spacing[4],
    width: 44,
    zIndex: 3,
  },
  refreshBtnText: {
    color: colors.textPrimary,
    fontSize: 22,
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
