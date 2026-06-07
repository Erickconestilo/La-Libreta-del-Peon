import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Incident, ProjectSummary, StationMessage } from '@shared/types';

import { dailyChecklistItems, useDailyChecklist } from '@/hooks/use-daily-checklist';
import { useRecentIncidents } from '@/hooks/use-incidents';
import { useProjects } from '@/hooks/use-projects';
import { useRecentStationMessages } from '@/hooks/use-station-messages';
import { useStations } from '@/hooks/use-stations';
import { useCurrentSession } from '@/hooks/use-auth';
import { getStationDisplayName } from '@/lib/station-display';
import { colors, spacing, typography } from '@/src/theme';

type ProjectFilter = ProjectSummary | null;

type DailyEvent = {
  body: string;
  id: string;
  kind: 'Nota' | 'Incidencia' | 'Mensaje';
  meta: string;
  time: string;
};

const todayKey = () => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

export default function DailyReportScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const canUseTeamTools = currentUser?.role === 'admin' || currentUser?.role === 'topografo';
  const projectsQuery = useProjects();
  const stationsQuery = useStations();
  const incidentsQuery = useRecentIncidents(canUseTeamTools);
  const messagesQuery = useRecentStationMessages(canUseTeamTools);
  const projects = projectsQuery.data ?? [];
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects[0]?.id ?? null);
  const resolvedProjectId = selectedProjectId ?? projects[0]?.id ?? null;
  const selectedProject: ProjectFilter = projects.find((project) => project.id === resolvedProjectId) ?? null;
  const dateKey = todayKey();
  const checklist = useDailyChecklist(resolvedProjectId, dateKey);

  const stationById = useMemo(() => {
    return new Map((stationsQuery.data ?? []).map((station) => [station.id, station]));
  }, [stationsQuery.data]);

  const dailyEvents = useMemo<DailyEvent[]>(() => {
    if (!canUseTeamTools || !selectedProject) {
      return [];
    }

    const projectStationIds = new Set(
      (stationsQuery.data ?? [])
        .filter((station) => station.projectId === selectedProject.id)
        .map((station) => station.id)
    );

    const noteEvents: DailyEvent[] = (stationsQuery.data ?? [])
      .filter((station) => station.projectId === selectedProject.id && Boolean(station.notes?.trim()))
      .filter((station) => isToday(station.updatedAt))
      .map((station) => ({
        body: station.notes?.trim() ?? '',
        id: `note-${station.id}`,
        kind: 'Nota',
        meta: getStationDisplayName(station),
        time: formatTime(station.updatedAt)
      }));

    const incidentEvents: DailyEvent[] = (incidentsQuery.data ?? [])
      .filter((incident: Incident) => incident.stationId ? projectStationIds.has(incident.stationId) : false)
      .filter((incident) => isToday(incident.reportedAt))
      .map((incident) => {
        const station = incident.stationId ? stationById.get(incident.stationId) : null;
        return {
          body: incident.description,
          id: `incident-${incident.id}`,
          kind: 'Incidencia',
          meta: `${station ? getStationDisplayName(station) : 'Sin estación'} · ${incident.status === 'open' ? 'Abierta' : 'Resuelta'}`,
          time: formatTime(incident.reportedAt)
        };
      });

    const messageEvents: DailyEvent[] = (messagesQuery.data ?? [])
      .filter((message: StationMessage) => message.stationId ? projectStationIds.has(message.stationId) : false)
      .filter((message) => isToday(message.createdAt))
      .map((message) => ({
        body: message.body,
        id: `message-${message.id}`,
        kind: 'Mensaje',
        meta: message.station?.name ?? 'Estación',
        time: formatTime(message.createdAt)
      }));

    return [...noteEvents, ...incidentEvents, ...messageEvents].sort((left, right) => right.time.localeCompare(left.time));
  }, [canUseTeamTools, incidentsQuery.data, messagesQuery.data, selectedProject, stationById, stationsQuery.data]);

  const projectStations = useMemo(() => {
    if (!selectedProject) {
      return [];
    }

    return (stationsQuery.data ?? []).filter((station) => station.projectId === selectedProject.id);
  }, [selectedProject, stationsQuery.data]);

  const openIncidents = dailyEvents.filter((event) => event.kind === 'Incidencia' && event.meta.includes('Abierta')).length;
  const isLoading = projectsQuery.isLoading || stationsQuery.isLoading || incidentsQuery.isLoading || messagesQuery.isLoading;
  const errorMessage = projectsQuery.errorMessage ?? stationsQuery.errorMessage ?? incidentsQuery.errorMessage ?? messagesQuery.errorMessage;

  if (!canUseTeamTools) {
    return (
      <View style={styles.centered}>
        <Text style={styles.eyebrow}>Parte diario</Text>
        <Text style={styles.title}>Acceso técnico</Text>
        <Text style={styles.body}>El parte diario se genera con datos internos de obra para admin y topógrafo.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 36 + insets.bottom }]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Parte diario</Text>
        <Text style={styles.heroTitle}>{selectedProject?.name ?? 'Selecciona obra'}</Text>
        <Text style={styles.body}>{new Date().toLocaleDateString('es-ES', { dateStyle: 'full' })}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectRail}>
        {projects.map((project) => {
          const selected = project.id === resolvedProjectId;
          return (
            <Pressable
              key={project.id}
              onPress={() => setSelectedProjectId(project.id)}
              style={[styles.projectChip, selected ? styles.projectChipSelected : null]}
            >
              <Text style={[styles.projectChipText, selected ? styles.projectChipTextSelected : null]}>{project.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.metrics}>
        <Metric icon="place" label="Estaciones" value={`${projectStations.length}`} />
        <Metric icon="report-problem" label="Abiertas" value={`${openIncidents}`} tone={openIncidents > 0 ? colors.red : colors.accentGreen} />
        <Metric icon="checklist" label="Checklist" value={`${checklist.completedCount}/${checklist.totalCount}`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Checklist de cierre</Text>
        {dailyChecklistItems.map((item) => {
          const checked = checklist.checklist[item.key];
          return (
            <Pressable
              key={item.key}
              onPress={() => checklist.setItem(item.key, !checked)}
              style={styles.checkRow}
            >
              <MaterialIcons
                color={checked ? colors.accentGreen : colors.textSecondary}
                name={checked ? 'check-circle' : 'radio-button-unchecked'}
                size={22}
              />
              <Text style={[styles.checkText, checked ? styles.checkTextDone : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Actividad de hoy</Text>
        {isLoading ? <Text style={styles.body}>Cargando parte...</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {!isLoading && dailyEvents.length === 0 ? (
          <Text style={styles.body}>No hay notas, incidencias ni mensajes registrados hoy para esta obra.</Text>
        ) : null}
        {dailyEvents.map((event) => (
          <View key={event.id} style={styles.eventRow}>
            <View style={styles.eventTimeBox}>
              <Text style={styles.eventTime}>{event.time}</Text>
            </View>
            <View style={styles.eventBody}>
              <Text style={styles.eventKind}>{event.kind}</Text>
              <Text style={styles.eventMeta}>{event.meta}</Text>
              <Text style={styles.eventText}>{event.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const Metric = ({
  icon,
  label,
  tone = colors.accentGreen,
  value
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  tone?: string;
  value: string;
}) => (
  <View style={styles.metricCard}>
    <MaterialIcons color={tone} name={icon} size={18} />
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const isToday = (value: string) => {
  const date = new Date(value);
  const now = new Date();

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const formatTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  card: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 10,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[3]
  },
  centered: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing[2],
    justifyContent: 'center',
    padding: spacing[3]
  },
  checkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 42
  },
  checkText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: '700'
  },
  checkTextDone: {
    color: colors.accentGreen
  },
  container: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: spacing[3],
    padding: spacing[3]
  },
  error: {
    color: colors.red,
    fontSize: 14,
    lineHeight: 20
  },
  eventBody: {
    flex: 1,
    gap: 3
  },
  eventKind: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900'
  },
  eventMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  eventRow: {
    borderTopColor: '#2a2f3a',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[2],
    paddingTop: spacing[2]
  },
  eventText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20
  },
  eventTime: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '900'
  },
  eventTimeBox: {
    width: 48
  },
  eyebrow: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  header: {
    gap: spacing[1]
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900'
  },
  metricCard: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minHeight: 84,
    padding: spacing[2]
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700'
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900'
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing[2]
  },
  projectChip: {
    borderColor: '#2a2f3a',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: 8
  },
  projectChipSelected: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen
  },
  projectChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  projectChipTextSelected: {
    color: colors.background
  },
  projectRail: {
    gap: spacing[1]
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '900'
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '900'
  }
});
