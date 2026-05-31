import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { usePrismCoverage } from '@/hooks/use-prisms';
import { borderRadius, colors, spacing, typography } from '@/src/theme';

export default function PrismCoverageScreen() {
  const params = useLocalSearchParams<{ groupCode: string }>();
  const groupCode = Array.isArray(params.groupCode) ? params.groupCode[0] : params.groupCode;
  const { data, errorMessage, isLoading } = usePrismCoverage(groupCode ?? null);

  return (
    <>
      <Stack.Screen options={{ title: groupCode ? `Serie ${groupCode}` : 'Cobertura de prismas' }} />
      <ScrollView contentContainerStyle={styles.content} style={styles.container}>
        {isLoading ? (
          <View style={styles.card}>
            <Text style={styles.title}>Cargando cobertura</Text>
            <Text style={styles.body}>Preparando visibilidad de prismas por estación.</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.card}>
            <Text style={styles.title}>No se pudo cargar la cobertura</Text>
            <Text style={styles.body}>{errorMessage}</Text>
          </View>
        ) : null}

        {data ? (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>Cobertura de serie</Text>
              <Text style={styles.heroTitle}>{data.groupCode}</Text>
              <View style={styles.statsRow}>
                <StatPill
                  label="Prismas únicos"
                  value={String(data.totalUniquePrisms)}
                />
                <StatPill
                  label="Estaciones"
                  value={String(data.stations.length)}
                />
              </View>
              <Text style={styles.body}>Resumen de visibilidad por estación dentro de la misma serie.</Text>
            </View>

            {data.stations.map((station) => (
              <View key={station.stationCode} style={styles.card}>
                <View style={styles.stationHeader}>
                  <Text style={styles.sectionTitle}>{station.stationCode}</Text>
                  <View style={styles.stationMetrics}>
                    <MetricBadge
                      tone="green"
                      label={`${station.visiblePrisms.length} visibles`}
                    />
                    <MetricBadge
                      tone={station.missingPrisms.length === 0 ? 'green' : 'amber'}
                      label={
                        station.missingPrisms.length === 0
                          ? 'Cobertura completa'
                          : `${station.missingPrisms.length} no vistos`
                      }
                    />
                  </View>
                </View>

                <Text style={styles.smallLabel}>Prismas visibles</Text>
                <PrismTokenList
                  emptyText="Sin prismas visibles."
                  items={station.visiblePrisms}
                  tone="green"
                />

                <Text style={styles.smallLabel}>Prismas no vistos desde esta estación</Text>
                <PrismTokenList
                  emptyText="Cobertura completa."
                  items={station.missingPrisms}
                  tone="amber"
                />
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

type StatPillProps = {
  label: string;
  value: string;
};

function StatPill({ label, value }: StatPillProps) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type MetricBadgeProps = {
  label: string;
  tone: 'amber' | 'green';
};

function MetricBadge({ label, tone }: MetricBadgeProps) {
  return <Text style={[styles.metricBadge, tone === 'green' ? styles.metricBadgeGreen : styles.metricBadgeAmber]}>{label}</Text>;
}

type PrismTokenListProps = {
  emptyText: string;
  items: string[];
  tone: 'amber' | 'green';
};

function PrismTokenList({ emptyText, items, tone }: PrismTokenListProps) {
  if (items.length === 0) {
    return <Text style={styles.body}>{emptyText}</Text>;
  }

  return (
    <View style={styles.tokenWrap}>
      {items.map((item) => (
        <View
          key={item}
          style={[
            styles.token,
            tone === 'green' ? styles.tokenGreen : styles.tokenAmber,
          ]}
        >
          <Text style={styles.tokenText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody - 1,
    lineHeight: 21,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 28,
  },
  eyebrow: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heroCard: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 20,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  metricBadge: {
    borderRadius: borderRadius[0],
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: spacing[1],
    paddingVertical: 4,
  },
  metricBadgeAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    color: colors.amber,
  },
  metricBadgeGreen: {
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    color: colors.accentGreen,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  smallLabel: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  statPill: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minWidth: 120,
    padding: spacing[2],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  stationHeader: {
    gap: spacing[1],
  },
  stationMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  token: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing[1],
    paddingVertical: 6,
  },
  tokenAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  tokenGreen: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.28)',
  },
  tokenText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  tokenWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
});
