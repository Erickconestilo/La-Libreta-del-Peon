import { useMemo } from 'react';

import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ChangeLog, EntityType } from '@shared/types';

import { useChangeLogs } from '@/hooks/use-change-logs';
import { colors } from '@/src/theme';

const ENTITY_LABELS: Record<EntityType, string> = {
  guide_entry: 'Guía',
  project: 'Obra',
  prism: 'Prisma',
  station: 'Estación'
};

const FIELD_LABELS: Record<string, string> = {
  body: 'Texto',
  category: 'Categoría',
  created: 'Creación',
  deleted: 'Borrado',
  image_url: 'Imagen',
  title: 'Título'
};

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: '2-digit'
  }).format(new Date(value));
};

const shortenValue = (value: string | null) => {
  if (!value) {
    return 'sin valor';
  }

  if (value.length <= 120) {
    return value;
  }

  return `${value.slice(0, 117)}...`;
};

const getActorLabel = (changeLog: ChangeLog) => {
  if (changeLog.changedByUser?.fullName) {
    return changeLog.changedByUser.fullName;
  }

  if (changeLog.changedByUser?.email) {
    return changeLog.changedByUser.email;
  }

  return changeLog.changedBy;
};

const ChangeLogCard = ({ changeLog }: { changeLog: ChangeLog }) => {
  const fieldLabel = FIELD_LABELS[changeLog.fieldChanged] ?? changeLog.fieldChanged;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.entityLabel}>{ENTITY_LABELS[changeLog.entityType]}</Text>
        <Text style={styles.dateText}>{formatDate(changeLog.changedAt)}</Text>
      </View>

      <Text style={styles.title}>{fieldLabel}</Text>
      <Text style={styles.meta}>Por {getActorLabel(changeLog)}</Text>

      {changeLog.fieldChanged === 'created' || changeLog.fieldChanged === 'deleted' ? (
        <Text style={styles.valueText}>
          {changeLog.fieldChanged === 'created' ? 'Nuevo registro:' : 'Registro eliminado:'}{' '}
          {shortenValue(changeLog.newValue ?? changeLog.oldValue)}
        </Text>
      ) : (
        <View style={styles.diffBox}>
          <Text style={styles.diffLabel}>Antes</Text>
          <Text style={styles.valueText}>{shortenValue(changeLog.oldValue)}</Text>
          <Text style={styles.diffLabel}>Después</Text>
          <Text style={styles.valueText}>{shortenValue(changeLog.newValue)}</Text>
        </View>
      )}
    </View>
  );
};

export default function HistoryScreen() {
  const { data, errorMessage, isFetching, refetch } = useChangeLogs({ limit: 50 });
  const changeLogs = useMemo(() => data ?? [], [data]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isFetching} tintColor={colors.accentGreen} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Historial</Text>
        <Text style={styles.screenSubtitle}>Últimos cambios operativos registrados por el backend.</Text>
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {changeLogs.length === 0 && !errorMessage ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Sin cambios todavía</Text>
          <Text style={styles.emptyText}>Cuando se creen o editen registros aparecerán aquí.</Text>
        </View>
      ) : null}

      {changeLogs.map((changeLog) => (
        <ChangeLogCard changeLog={changeLog} key={changeLog.id} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  container: {
    backgroundColor: colors.background,
    gap: 14,
    minHeight: '100%',
    padding: 20
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  diffBox: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 12
  },
  diffLabel: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 18
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800'
  },
  entityLabel: {
    backgroundColor: '#12251c',
    borderRadius: 999,
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: 'uppercase'
  },
  error: {
    color: colors.red,
    fontSize: 15,
    lineHeight: 22
  },
  header: {
    gap: 6,
    marginBottom: 4
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  screenSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22
  },
  screenTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800'
  },
  valueText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20
  }
});
