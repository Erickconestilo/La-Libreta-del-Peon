import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Incident, StationMessage } from '@shared/types';

import { useCurrentSession } from '@/hooks/use-auth';
import { useRecentIncidents } from '@/hooks/use-incidents';
import { useRecentStationMessages } from '@/hooks/use-station-messages';
import { useStations } from '@/hooks/use-stations';
import { getStationDisplayName } from '@/lib/station-display';
import { colors, spacing, typography } from '@/src/theme';

type BitacoraTag =
  | 'Incidencia'
  | 'Nota'
  | 'Mensaje'
  | 'Propuesta'
  | 'Foto'
  | 'Abierta'
  | 'Cerrada'
  | 'Urgente';

type BitacoraScope = 'all' | 'open' | 'today' | 'week';

type BitacoraScopeOption = {
  key: BitacoraScope;
  label: string;
};

type BitacoraEntry = {
  body: string;
  createdBy: string | null;
  createdById: string | null;
  date: string;
  dateText: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  id: string;
  isMine?: boolean;
  labels: BitacoraTag[];
  meta: string;
  stationId: string | null;
  title: string;
};

const incidentTypeLabels: Record<Incident['type'], string> = {
  obstaculo_estacionamiento: 'Incidencia: obstáculo',
  otro: 'Incidencia',
  prisma_no_visible: 'Incidencia: prisma no visible'
};

const scopeOptions: BitacoraScopeOption[] = [
  { key: 'all', label: 'Todas' },
  { key: 'open', label: 'Abiertas' },
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: '7 días' }
];

const availableTags: BitacoraTag[] = ['Incidencia', 'Mensaje', 'Nota', 'Propuesta', 'Foto', 'Abierta', 'Cerrada', 'Urgente'];

export default function BitacoraScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const canUseTeamTools = currentUser?.role === 'admin' || currentUser?.role === 'topografo';
  const stationsQuery = useStations();
  const incidentsQuery = useRecentIncidents(canUseTeamTools);
  const messagesQuery = useRecentStationMessages(canUseTeamTools);

  const [selectedScope, setSelectedScope] = useState<BitacoraScope>('all');
  const [selectedTags, setSelectedTags] = useState<BitacoraTag[]>(['Incidencia', 'Mensaje', 'Nota', 'Propuesta']);

  const stationById = useMemo(() => {
    return new Map((stationsQuery.data ?? []).map((station) => [station.id, station]));
  }, [stationsQuery.data]);

  const allEntries = useMemo<BitacoraEntry[]>(() => {
    if (!canUseTeamTools) {
      return [];
    }

    const nowUserId = currentUser?.id ?? null;

    const noteEntries: BitacoraEntry[] = (stationsQuery.data ?? [])
      .filter((station) => Boolean(station.notes?.trim()))
      .map((station) => {
        const stationName = getStationDisplayName(station);
        const projectName = station.project?.name ?? null;

        return {
          body: station.notes?.trim() ?? '',
          createdBy: station.createdBy === nowUserId ? 'Tú' : 'Equipo',
          createdById: station.createdBy,
          date: station.updatedAt,
          dateText: formatDateTime(station.updatedAt),
          icon: 'sticky-note-2',
          id: `note-${station.id}`,
          labels: ['Nota'],
          meta: buildMeta(stationName, projectName),
          stationId: station.id,
          title: 'Nota de estación'
        };
      });

    const incidentEntries: BitacoraEntry[] = (incidentsQuery.data ?? []).map((incident) => {
      const station = incident.stationId ? stationById.get(incident.stationId) : null;
      const isOpen = incident.status === 'open';
      const labels: BitacoraTag[] = ['Incidencia', isOpen ? 'Abierta' : 'Cerrada'];
      const suggestionText = incident.suggestion?.notes ? ` Propuesta: ${incident.suggestion.notes}` : '';

      if (incident.type === 'obstaculo_estacionamiento') {
        labels.push('Urgente');
      }

      if (incident.suggestion?.notes) {
        labels.push('Propuesta');
      }

      if (incident.photoUrl) {
        labels.push('Foto');
      }

      return {
        body: `${incident.description}${suggestionText}`,
        createdBy: incident.reportedBy === nowUserId ? 'Tú' : 'Equipo',
        createdById: incident.reportedBy,
        date: incident.reportedAt,
        dateText: formatDateTime(incident.reportedAt),
        icon: isOpen ? 'report-problem' : 'task-alt',
        id: `incident-${incident.id}`,
        isMine: incident.reportedBy === nowUserId,
        labels,
        meta: buildMeta(station ? getStationDisplayName(station) : 'Sin estación asociada', station?.project?.name ?? null),
        stationId: incident.stationId,
        title: `${incidentTypeLabels[incident.type]} · ${isOpen ? 'Abierta' : 'Cerrada'}`
      };
    });

    const messageEntries: BitacoraEntry[] = (messagesQuery.data ?? []).map((message: StationMessage) => {
      const station = message.stationId ? stationById.get(message.stationId) : null;
      const stationName = message.station?.name ?? (station ? getStationDisplayName(station) : 'Estación sin nombre');
      const projectName = message.station?.project?.name ?? station?.project?.name ?? null;
      const authorName = message.createdByUser?.fullName
        ? `${message.createdByUser.fullName}`
        : message.createdByUser?.email ?? 'Equipo';
      const authorId = message.createdBy;

      return {
        body: message.body,
        createdBy: authorName,
        createdById: authorId,
        date: message.createdAt,
        dateText: formatDateTime(message.createdAt),
        icon: 'chat-bubble-outline',
        id: `message-${message.id}`,
        isMine: authorId === nowUserId,
        labels: ['Mensaje'],
        meta: `${buildMeta(stationName, projectName)} · ${authorName}`,
        stationId: message.stationId,
        title: 'Mensaje de equipo'
      };
    });

    return [...noteEntries, ...incidentEntries, ...messageEntries].sort(
      (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
    );
  }, [canUseTeamTools, currentUser?.id, incidentsQuery.data, messagesQuery.data, stationById, stationsQuery.data]);

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const selectedScopeFilter = selectedScope;

    return allEntries.filter((entry) => {
      const visibleByScope = (() => {
        if (selectedScopeFilter === 'all') {
          return true;
        }

        if (!entry.date || Number.isNaN(new Date(entry.date).getTime())) {
          return false;
        }

        const entryDate = new Date(entry.date);

        if (selectedScopeFilter === 'open') {
          return entry.labels.includes('Abierta');
        }

        if (selectedScopeFilter === 'today') {
          return isSameDate(now, entryDate);
        }

        return isLast7Days(now, entryDate);
      })();

      if (!visibleByScope) {
        return false;
      }

      if (selectedTags.length === 0) {
        return true;
      }

      return selectedTags.some((tag) => entry.labels.includes(tag));
    });
  }, [allEntries, selectedScope, selectedTags]);

  const openIncidentCount = allEntries.filter((entry) => entry.labels.includes('Incidencia') && entry.labels.includes('Abierta')).length;

  const isLoading = stationsQuery.isLoading || incidentsQuery.isLoading || messagesQuery.isLoading;
  const isRefreshing = stationsQuery.isRefetching || incidentsQuery.isRefetching || messagesQuery.isRefetching;
  const errorMessage = stationsQuery.errorMessage ?? incidentsQuery.errorMessage ?? messagesQuery.errorMessage;

  const handleRefresh = async () => {
    await Promise.all([
      stationsQuery.refetch(),
      canUseTeamTools ? incidentsQuery.refetch() : Promise.resolve(),
      canUseTeamTools ? messagesQuery.refetch() : Promise.resolve()
    ]);
  };

  const toggleScope = (scope: BitacoraScope) => {
    setSelectedScope(scope);
  };

  const toggleTag = (tag: BitacoraTag) => {
    setSelectedTags((current) => {
      if (current.includes(tag)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter((item) => item !== tag);
      }

      return [...current, tag];
    });
  };

  const handlePressEntry = (stationId: string | null) => {
    if (!stationId) {
      return;
    }

    router.push(`/station/${stationId}` as never);
  };

  if (!canUseTeamTools) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
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
      data={filteredEntries}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Bitácora</Text>
          <Text style={styles.heroTitle}>Bitácora</Text>
          <Text style={styles.headerBody}>Notas, incidencias y mensajes con fecha y hora. Usa etiquetas para filtrar.</Text>

          {openIncidentCount > 0 ? (
            <View style={styles.alertCard}>
              <MaterialIcons color={colors.red} name="campaign" size={16} />
              <Text style={styles.alertText}>Incidencias abiertas: {openIncidentCount}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>Vista</Text>
          <ScrollView contentContainerStyle={styles.scopes} horizontal showsHorizontalScrollIndicator={false}>
            {scopeOptions.map((scope) => (
              <Pressable
                key={scope.key}
                onPress={() => toggleScope(scope.key)}
                style={[styles.scopePill, selectedScope === scope.key ? styles.scopePillSelected : null]}
              >
                <Text style={[styles.scopePillText, selectedScope === scope.key ? styles.scopePillTextSelected : null]}>
                  {scope.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.sectionLabel}>Etiquetas</Text>
          <ScrollView contentContainerStyle={styles.tags} horizontal showsHorizontalScrollIndicator={false}>
            {availableTags.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <Pressable key={tag} onPress={() => toggleTag(tag)} style={[styles.tag, selected ? styles.tagSelected : null]}>
                  <Text style={[styles.tagText, selected ? styles.tagTextSelected : null]}>{tag}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.card}>
          <Text style={styles.title}>{isLoading ? 'Cargando bitácora' : 'Sin entradas'}</Text>
          <Text style={styles.body}>{errorMessage ?? 'Aún no hay entradas para esta vista.'}</Text>
        </View>
      }
      onRefresh={handleRefresh}
      refreshing={isRefreshing}
      renderItem={({ item }) => {
        const isMine = Boolean(item.isMine);
        return (
          <Pressable
            disabled={!item.stationId}
            onPress={() => handlePressEntry(item.stationId)}
            style={({ pressed }) => [
              styles.row,
              isMine ? styles.rowMine : styles.rowOther,
              pressed ? styles.rowPressed : null
            ]}
          >
            <View style={[styles.messageBubble, isMine ? styles.messageBubbleMine : styles.messageBubbleOther]}>
              <View style={styles.entryHeader}>
                <View style={[styles.entryIcon, getIconStyle(item.labels)]}>
                  <MaterialIcons color={getToneColor(item.labels)} name={item.icon} size={16} />
                </View>
                <View style={styles.entryHeaderText}>
                  <Text style={styles.entryTitle}>{item.title}</Text>
                  <Text style={styles.entryDate}>{item.dateText}</Text>
                </View>
              </View>
              <Text style={styles.entryMeta}>{item.meta}</Text>
              <Text style={styles.entryBody} numberOfLines={8}>
                {item.body}
              </Text>
              <View style={styles.entryFooter}>
                <View style={styles.entryTags}>
                  {item.labels.map((label) => (
                    <Text key={`${item.id}-${label}`} style={styles.entryTag}>
                      #{label}
                    </Text>
                  ))}
                </View>
                <Text style={styles.entryAuthor}>— {item.createdBy}</Text>
              </View>
            </View>
          </Pressable>
        );
      }}
      style={styles.container}
    />
  );
}

const getToneColor = (labels: BitacoraTag[]) => {
  if (labels.includes('Incidencia')) {
    if (labels.includes('Abierta')) {
      return colors.red;
    }

    return colors.amber;
  }

  if (labels.includes('Nota')) {
    return colors.accentGreen;
  }

  return colors.textSecondary;
};

const getIconStyle = (labels: BitacoraTag[]) => {
  if (labels.includes('Incidencia')) {
    return styles.incidentIcon;
  }

  if (labels.includes('Nota')) {
    return styles.noteIcon;
  }

  return styles.messageIcon;
};

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

const isSameDate = (left: Date, right: Date) => {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

const isLast7Days = (now: Date, target: Date) => {
  const deltaMs = now.getTime() - target.getTime();
  return deltaMs >= 0 && deltaMs <= 7 * 24 * 60 * 60 * 1000;
};

const styles = StyleSheet.create({
  alertCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[1],
    padding: spacing[2]
  },
  alertText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700'
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody - 1,
    lineHeight: 20
  },
  card: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 10,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3]
  },
  centerContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing[3]
  },
  container: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: spacing[2],
    padding: spacing[3]
  },
  entryAuthor: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700'
  },
  entryBody: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeBody - 1,
    lineHeight: 21
  },
  entryFooter: {
    gap: spacing[1]
  },
  entryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1]
  },
  entryHeaderText: {
    flex: 1,
    gap: 2
  },
  entryIcon: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30
  },
  entryMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  entryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1]
  },
  entryTag: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderColor: '#2a2f3a',
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 2
  },
  entryTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.fontSizeBody,
    fontWeight: '900'
  },
  entryDate: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700'
  },
  header: {
    gap: spacing[2],
    paddingVertical: spacing[2]
  },
  headerBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900'
  },
  incidentIcon: {
    borderColor: 'rgba(239, 68, 68, 0.45)'
  },
  messageIcon: {
    borderColor: 'rgba(56, 189, 248, 0.45)'
  },
  messageBubble: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: spacing[1],
    maxWidth: '86%',
    minWidth: 240,
    padding: spacing[3]
  },
  messageBubbleMine: {
    backgroundColor: '#101722',
    borderColor: 'rgba(34, 197, 94, 0.35)'
  },
  messageBubbleOther: {
    backgroundColor: '#161b24'
  },
  noteIcon: {
    borderColor: 'rgba(34, 197, 94, 0.42)'
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginBottom: spacing[2]
  },
  rowMine: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse'
  },
  rowOther: {
    alignSelf: 'flex-start'
  },
  rowPressed: {
    opacity: 0.84
  },
  scopes: {
    flexDirection: 'row',
    gap: spacing[1]
  },
  scopePill: {
    borderColor: '#2a2f3a',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: 8
  },
  scopePillSelected: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen
  },
  scopePillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  scopePillTextSelected: {
    color: colors.background
  },
  sectionLabel: {
    color: colors.accentGreen,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase'
  },
  tags: {
    flexDirection: 'row',
    gap: spacing[1]
  },
  tag: {
    borderColor: '#2a2f3a',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: 7
  },
  tagSelected: {
    backgroundColor: colors.amber,
    borderColor: colors.amber
  },
  tagText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  tagTextSelected: {
    color: colors.background
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '900'
  },
  eyebrow: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase'
  }
});
