import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Incident, StationMessage } from '@shared/types';

import { useCurrentSession } from '@/hooks/use-auth';
import { useRecentIncidents } from '@/hooks/use-incidents';
import { useRecentStationMessages } from '@/hooks/use-station-messages';
import { useStations } from '@/hooks/use-stations';
import { getStationDisplayName } from '@/lib/station-display';
import { colors, spacing, typography } from '@/src/theme';

type BitacoraEntry = {
  body: string;
  date: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  id: string;
  meta: string;
  stationId: string | null;
  title: string;
  tone: 'amber' | 'green' | 'red';
};

const incidentTypeLabels: Record<Incident['type'], string> = {
  obstaculo_estacionamiento: 'Incidencia: obstáculo',
  otro: 'Incidencia',
  prisma_no_visible: 'Incidencia: prisma no visible'
};

export default function BitacoraScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const canUseTeamTools = currentUser?.role === 'admin' || currentUser?.role === 'topografo';
  const stationsQuery = useStations();
  const incidentsQuery = useRecentIncidents(canUseTeamTools);
  const messagesQuery = useRecentStationMessages(canUseTeamTools);

  const stationById = useMemo(() => {
    return new Map((stationsQuery.data ?? []).map((station) => [station.id, station]));
  }, [stationsQuery.data]);

  const entries = useMemo<BitacoraEntry[]>(() => {
    if (!canUseTeamTools) {
      return [];
    }

    const noteEntries: BitacoraEntry[] = (stationsQuery.data ?? [])
      .filter((station) => Boolean(station.notes?.trim()))
      .map((station) => ({
        body: station.notes?.trim() ?? '',
        date: station.updatedAt,
        icon: 'sticky-note-2',
        id: `note-${station.id}`,
        meta: buildMeta(getStationDisplayName(station), station.project?.name ?? null),
        stationId: station.id,
        title: 'Nota de estación',
        tone: 'green'
      }));

    const incidentEntries: BitacoraEntry[] = (incidentsQuery.data ?? []).map((incident) => {
      const station = incident.stationId ? stationById.get(incident.stationId) : null;
      const suggestionText = incident.suggestion?.notes ? ` Propuesta: ${incident.suggestion.notes}` : '';

      return {
        body: `${incident.description}${suggestionText}`,
        date: incident.reportedAt,
        icon: incident.status === 'open' ? 'report-problem' : 'task-alt',
        id: `incident-${incident.id}`,
        meta: buildMeta(station ? getStationDisplayName(station) : 'Sin estación asociada', station?.project?.name ?? null),
        stationId: incident.stationId,
        title: `${incidentTypeLabels[incident.type]} · ${incident.status === 'open' ? 'Abierta' : 'Resuelta'}`,
        tone: incident.status === 'open' ? 'red' : 'green'
      };
    });

    const messageEntries: BitacoraEntry[] = (messagesQuery.data ?? []).map((message: StationMessage) => {
      const station = message.stationId ? stationById.get(message.stationId) : null;
      const stationName = message.station?.name ?? (station ? getStationDisplayName(station) : 'Estación sin nombre');
      const projectName = message.station?.project?.name ?? station?.project?.name ?? null;
      const author = message.createdByUser?.fullName ?? message.createdByUser?.email ?? 'Equipo';

      return {
        body: message.body,
        date: message.createdAt,
        icon: 'chat-bubble-outline',
        id: `message-${message.id}`,
        meta: `${buildMeta(stationName, projectName)} · ${author}`,
        stationId: message.stationId,
        title: 'Mensaje de equipo',
        tone: 'amber'
      };
    });

    return [...noteEntries, ...incidentEntries, ...messageEntries].sort(
      (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
    );
  }, [canUseTeamTools, incidentsQuery.data, messagesQuery.data, stationById, stationsQuery.data]);

  const isLoading = stationsQuery.isLoading || incidentsQuery.isLoading || messagesQuery.isLoading;
  const errorMessage = stationsQuery.errorMessage ?? incidentsQuery.errorMessage ?? messagesQuery.errorMessage;

  const handleRefresh = async () => {
    await Promise.all([
      stationsQuery.refetch(),
      canUseTeamTools ? incidentsQuery.refetch() : Promise.resolve(),
      canUseTeamTools ? messagesQuery.refetch() : Promise.resolve()
    ]);
  };

  if (!canUseTeamTools) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>Bitácora</Text>
            <Text style={styles.title}>Acceso de equipo</Text>
            <Text style={styles.body}>
              La bitácora reúne notas, incidencias y mensajes con fecha y hora para admin y topógrafo.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={[styles.content, { paddingBottom: 112 + insets.bottom }]}
      data={entries}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Equipo</Text>
          <Text style={styles.heroTitle}>Bitácora</Text>
          <Text style={styles.headerBody}>Notas, incidencias y mensajes ordenados por fecha y hora.</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.card}>
          <Text style={styles.title}>{isLoading ? 'Cargando bitácora' : 'Sin entradas'}</Text>
          <Text style={styles.body}>{errorMessage ?? 'Todavía no hay notas, incidencias ni mensajes recientes.'}</Text>
        </View>
      }
      onRefresh={handleRefresh}
      refreshing={stationsQuery.isRefetching || incidentsQuery.isRefetching || messagesQuery.isRefetching}
      renderItem={({ item }) => (
        <Pressable
          disabled={!item.stationId}
          onPress={() => item.stationId ? router.push(`/station/${item.stationId}` as never) : undefined}
          style={({ pressed }) => [styles.entryCard, pressed ? styles.entryCardPressed : null]}
        >
          <View style={[styles.entryIcon, styles[`${item.tone}Icon`]]}>
            <MaterialIcons color={getToneColor(item.tone)} name={item.icon} size={22} />
          </View>
          <View style={styles.entryBody}>
            <View style={styles.entryHeader}>
              <Text style={styles.entryTitle}>{item.title}</Text>
              <Text style={styles.entryDate}>{formatDateTime(item.date)}</Text>
            </View>
            <Text style={styles.entryMeta}>{item.meta}</Text>
            <Text numberOfLines={4} style={styles.body}>{item.body}</Text>
          </View>
        </Pressable>
      )}
      style={styles.container}
    />
  );
}

const buildMeta = (stationName: string, projectName: string | null) => {
  return projectName ? `${projectName} · ${stationName}` : stationName;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return date.toLocaleString('es-ES', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
};

const getToneColor = (tone: BitacoraEntry['tone']) => {
  if (tone === 'red') {
    return colors.red;
  }

  if (tone === 'amber') {
    return colors.amber;
  }

  return colors.accentGreen;
};

const styles = StyleSheet.create({
  amberIcon: {
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody - 1,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing[2],
    padding: spacing[3],
  },
  entryBody: {
    flex: 1,
    gap: 4,
  },
  entryCard: {
    alignItems: 'flex-start',
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[2],
    padding: spacing[3],
  },
  entryCardPressed: {
    opacity: 0.78,
  },
  entryDate: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  entryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[1],
    justifyContent: 'space-between',
  },
  entryIcon: {
    alignItems: 'center',
    backgroundColor: '#0f1117',
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  entryMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  entryTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.fontSizeBody,
    fontWeight: '900',
  },
  eyebrow: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  greenIcon: {
    borderColor: 'rgba(34, 197, 94, 0.42)',
  },
  header: {
    gap: spacing[1],
    paddingVertical: spacing[2],
  },
  headerBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
  },
  redIcon: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '900',
  },
});
