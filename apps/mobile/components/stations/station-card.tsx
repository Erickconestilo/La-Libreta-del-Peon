import { StyleSheet, Text, View } from 'react-native';

import type { Station } from '@shared/types';

type StationListItem = Station & {
  project?: {
    code: string;
    name: string;
  } | null;
};

type StationCardProps = {
  station: StationListItem;
};

export function StationCard({ station }: StationCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.project}>{station.project?.name ?? 'Sin obra'}</Text>
        <Text style={styles.badge}>{station.deviceType ?? 'sin equipo'}</Text>
      </View>

      <Text style={styles.name}>{station.name}</Text>

      <Text style={styles.meta}>
        Estado: {station.mapStatus ?? 'sin estado'} · {station.status}
      </Text>

      <Text style={styles.coords}>
        {station.lat ?? '—'}, {station.lng ?? '—'}
      </Text>

      <Text numberOfLines={2} style={styles.notes}>
        {station.notes ?? 'Sin notas todavía'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#0f766e',
    borderRadius: 999,
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#fffdf8',
    borderColor: '#e7dcc7',
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  coords: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '700',
  },
  meta: {
    color: '#57534e',
    fontSize: 13,
  },
  name: {
    color: '#1c1917',
    fontSize: 18,
    fontWeight: '800',
  },
  notes: {
    color: '#44403c',
    fontSize: 14,
    lineHeight: 20,
  },
  project: {
    color: '#9a3412',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
