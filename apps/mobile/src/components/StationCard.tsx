import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Station } from '@shared/types';
import { borderRadius, colors, spacing, typography } from '@/src/theme';

type StationCardItem = Station & {
  project?: { code: string; name: string } | null;
};

type StationCardProps = {
  station: StationCardItem;
  onPress: (stationId: string) => void;
};

const statusConfig = {
  active: { label: 'Activa', color: colors.accentGreen },
  replaced: { label: 'Reemplazada', color: colors.amber },
  incident: { label: 'Incidencia', color: colors.red },
} as const;

export function StationCard({ station, onPress }: StationCardProps) {
  const status = statusConfig[station.status];

  return (
    <Pressable onPress={() => onPress(station.id)} style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.project}>{station.project?.name ?? 'Sin obra'}</Text>
        <View style={[styles.chip, { backgroundColor: status.color }]}>
          <Text style={styles.chipText}>{status.label}</Text>
        </View>
      </View>

      <Text style={styles.name}>{station.name}</Text>

      <Text style={styles.date}>
        {station.createdAt
          ? new Date(station.createdAt).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '—'}
      </Text>

      {station.photoUrl ? <Text style={styles.photoIcon}>📷</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius[1],
    gap: spacing[1],
    padding: spacing[3],
  },
  chip: {
    borderRadius: borderRadius[0],
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  date: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody - 1,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '800',
  },
  photoIcon: {
    fontSize: 16,
  },
  project: {
    color: colors.textSecondary,
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
