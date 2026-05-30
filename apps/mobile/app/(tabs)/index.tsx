import { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StationCard } from '@/src/components/StationCard';
import { borderRadius, colors, spacing, typography } from '@/src/theme';
import { useStations } from '@/hooks/use-stations';

import type { StationStatus } from '@shared/types';

const statusLabels: Record<StationStatus, string> = {
  active: 'Activa',
  replaced: 'Reemplazada',
  incident: 'Incidencia',
};

export default function StationsScreen() {
  const router = useRouter();
  const { data, errorMessage, isLoading, isRefetching, refetch } = useStations();
  const stations = data ?? [];

  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StationStatus | null>(null);

  const projectNames = useMemo(() => {
    const names = new Set<string>();
    for (const s of stations) {
      if (s.project?.name) names.add(s.project.name);
    }
    return Array.from(names).sort();
  }, [stations]);

  const filteredStations = useMemo(() => {
    let result = stations;
    if (projectFilter) {
      result = result.filter((s) => s.project?.name === projectFilter);
    }
    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }
    return result;
  }, [stations, projectFilter, statusFilter]);

  const handlePress = useCallback(
    (stationId: string) => router.push(`/station/${stationId}`),
    [router],
  );

  const handleRefresh = useCallback(() => void refetch(), [refetch]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Estaciones</Text>
        <Text style={styles.subtitle}>
          {stations.length} estación{stations.length !== 1 ? 'es' : ''} en campo
        </Text>
      </View>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip
            label="Todas"
            selected={projectFilter === null}
            onPress={() => setProjectFilter(null)}
          />
          {projectNames.map((name) => (
            <FilterChip
              key={name}
              label={name}
              selected={projectFilter === name}
              onPress={() => setProjectFilter(name)}
            />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip
            label="Todos"
            selected={statusFilter === null}
            onPress={() => setStatusFilter(null)}
          />
          {(Object.entries(statusLabels) as [StationStatus, string][]).map(([key, label]) => (
            <FilterChip
              key={key}
              label={label}
              selected={statusFilter === key}
              onPress={() => setStatusFilter(key)}
            />
          ))}
        </ScrollView>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Error al cargar</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredStations}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
        renderItem={({ item }) => <StationCard station={item} onPress={handlePress} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Cargando...</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Sin estaciones</Text>
              <Text style={styles.emptyBody}>
                {projectFilter || statusFilter
                  ? 'Ninguna estación coincide con los filtros seleccionados.'
                  : 'Todavía no hay estaciones cargadas en el sistema.'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderColor: colors.textSecondary,
    borderRadius: borderRadius[0],
    borderWidth: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0],
  },
  chipRow: {
    gap: spacing[1],
    paddingHorizontal: spacing[3],
  },
  chipSelected: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.background,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody - 1,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingTop: spacing[5],
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeBody,
    fontWeight: '700',
  },
  errorBody: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody - 1,
    lineHeight: 20,
  },
  errorCard: {
    backgroundColor: colors.card,
    borderLeftColor: colors.red,
    borderLeftWidth: 3,
    marginHorizontal: spacing[3],
    marginTop: spacing[2],
    padding: spacing[3],
  },
  errorTitle: {
    color: colors.red,
    fontSize: typography.fontSizeBody,
    fontWeight: '700',
    marginBottom: spacing[0],
  },
  filters: {
    gap: spacing[1],
    paddingBottom: spacing[2],
    paddingTop: spacing[2],
  },
  header: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[4],
  },
  listContent: {
    gap: spacing[2],
    padding: spacing[3],
    paddingBottom: 96,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody - 1,
    marginTop: spacing[0],
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
});
