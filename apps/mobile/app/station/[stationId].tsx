import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useStationDetail } from '@/hooks/use-stations';

export default function StationDetailScreen() {
  const params = useLocalSearchParams<{ stationId: string }>();
  const stationId = Array.isArray(params.stationId) ? params.stationId[0] : params.stationId;
  const { data, errorMessage, isLoading } = useStationDetail(stationId ?? null);

  return (
    <>
      <Stack.Screen options={{ title: data?.name ?? 'Detalle de estación' }} />
      <ScrollView contentContainerStyle={styles.content} style={styles.container}>
        {isLoading ? (
          <View style={styles.card}>
            <Text style={styles.title}>Cargando detalle</Text>
            <Text style={styles.body}>Preparando estación, lecturas y posición resuelta.</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.card}>
            <Text style={styles.title}>No se pudo cargar la estación</Text>
            <Text style={styles.body}>{errorMessage}</Text>
          </View>
        ) : null}

        {data ? (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>{data.project?.name ?? 'Sin obra asignada'}</Text>
              <Text style={styles.heroTitle}>{data.name}</Text>
              <Text style={styles.body}>
                Instrumento: {data.deviceType ?? 'sin definir'} · Estado mapa: {data.mapStatus ?? 'sin definir'}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Posición resuelta</Text>
              <Text style={styles.body}>Lat: {data.lat ?? '—'}</Text>
              <Text style={styles.body}>Lng: {data.lng ?? '—'}</Text>
              <Text style={styles.body}>UTM zona: {data.utmZone ?? '—'}</Text>
              <Text style={styles.body}>UTM E: {data.utmEasting ?? '—'}</Text>
              <Text style={styles.body}>UTM N: {data.utmNorthing ?? '—'}</Text>
              <Text style={styles.body}>Método: {data.resolvedMethod ?? '—'}</Text>
              <Text style={styles.body}>Display mode: {data.displayMode ?? '—'}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Notas</Text>
              <Text style={styles.body}>{data.notes ?? 'Sin notas todavía.'}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Lecturas asociadas</Text>
              {data.readings.length === 0 ? (
                <Text style={styles.body}>Esta estación aún no tiene lecturas guardadas.</Text>
              ) : (
                data.readings.map((reading) => (
                  <View key={reading.id} style={styles.readingRow}>
                    <Text style={styles.readingTitle}>
                      {reading.source} · {reading.capturedOnline ? 'con conexión' : 'sin conexión'}
                    </Text>
                    <Text style={styles.body}>
                      {reading.lat}, {reading.lng}
                    </Text>
                    <Text style={styles.body}>Precisión: {reading.accuracy ?? '—'}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    color: '#57534e',
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    backgroundColor: '#fffdf8',
    borderColor: '#e7dcc7',
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  container: {
    backgroundColor: '#f3efe6',
    flex: 1,
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 28,
  },
  eyebrow: {
    color: '#9a3412',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heroCard: {
    backgroundColor: '#fff8ef',
    borderColor: '#e7dcc7',
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 20,
  },
  heroTitle: {
    color: '#1c1917',
    fontSize: 28,
    fontWeight: '800',
  },
  readingRow: {
    borderTopColor: '#efe5d2',
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 10,
  },
  readingTitle: {
    color: '#1c1917',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#1c1917',
    fontSize: 17,
    fontWeight: '800',
  },
  title: {
    color: '#1c1917',
    fontSize: 18,
    fontWeight: '800',
  },
});
