import { useMemo, useState } from 'react';

import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGuideEntries } from '@/hooks/use-guide';
import { guideManuals } from '@/lib/guide-catalog';
import { borderRadius, colors, spacing, typography } from '@/src/theme';

export default function GuideScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, errorMessage, isLoading } = useGuideEntries();
  const entries = data ?? [];
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const categories = useMemo(() => {
    return Array.from(new Set(entries.map((entry) => entry.category))).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (!categoryFilter) {
      return entries;
    }

    return entries.filter((entry) => entry.category === categoryFilter);
  }, [categoryFilter, entries]);

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 112 + insets.bottom }]} style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Guía de campo</Text>
        <Text style={styles.heroTitle}>Manuales y fichas rápidas</Text>
        <Text style={styles.body}>
          Las guías grandes aparecen como tarjetas. Debajo quedan fichas cortas para consultar en obra.
        </Text>
      </View>

      <View style={styles.manualGrid}>
        {guideManuals.map((manual) => (
          <Pressable
            accessibilityRole="button"
            key={manual.id}
            onPress={() => router.push(`/guide/${manual.id}` as never)}
            style={({ pressed }) => [
              styles.manualCard,
              manual.accent === 'green' ? styles.manualCardGreen : styles.manualCardAmber,
              pressed ? styles.manualCardPressed : null
            ]}
          >
            <View style={styles.manualTopRow}>
              <Text style={[styles.manualTag, manual.accent === 'green' ? styles.manualTagGreen : styles.manualTagAmber]}>
                {manual.tag}
              </Text>
              <Text style={styles.manualPages}>{manual.pages} pág.</Text>
            </View>
            <Text style={styles.manualTitle}>{manual.title}</Text>
            <Text style={styles.body}>{manual.summary}</Text>
            <Text style={styles.manualCta}>Leer guía completa</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Fichas rápidas</Text>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <FilterChip
            label="Todas"
            onPress={() => setCategoryFilter(null)}
            selected={categoryFilter === null}
          />
          {categories.map((category) => (
            <FilterChip
              key={category}
              label={category}
              onPress={() => setCategoryFilter(category)}
              selected={categoryFilter === category}
            />
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.card}>
          <Text style={styles.title}>Cargando guía</Text>
          <Text style={styles.body}>Preparando fichas de campo.</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.card}>
          <Text style={styles.title}>No se pudo cargar la guía</Text>
          <Text style={styles.body}>{errorMessage}</Text>
        </View>
      ) : null}

      {!isLoading && !errorMessage && filteredEntries.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.title}>Sin entradas</Text>
          <Text style={styles.body}>
            {entries.length === 0
              ? 'Todavía no hay contenido publicado en la guía.'
              : 'No hay entradas para la categoría seleccionada.'}
          </Text>
        </View>
      ) : null}

      {filteredEntries.map((entry) => (
        <View key={entry.id} style={styles.card}>
          <Text style={styles.category}>{entry.category}</Text>
          <Text style={styles.title}>{entry.title}</Text>
          <Text style={styles.body}>{entry.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

type FilterChipProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
};

function FilterChip({ label, onPress, selected }: FilterChipProps) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, selected && styles.filterChipSelected]}>
      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text>
    </Pressable>
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
    gap: spacing[1],
    padding: spacing[3],
  },
  category: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing[2],
    padding: spacing[3],
    paddingBottom: 96,
  },
  eyebrow: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  filterChip: {
    borderColor: colors.textSecondary,
    borderRadius: borderRadius[0],
    borderWidth: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0],
  },
  filterChipSelected: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextSelected: {
    color: colors.background,
  },
  filterRow: {
    gap: spacing[1],
  },
  filters: {
    marginBottom: spacing[0],
  },
  heroCard: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[4],
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  manualCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  manualCardPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  manualCardAmber: {
    borderColor: 'rgba(245, 158, 11, 0.55)',
  },
  manualCardGreen: {
    borderColor: 'rgba(34, 197, 94, 0.55)',
  },
  manualGrid: {
    gap: spacing[2],
  },
  manualPages: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  manualTag: {
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: spacing[1],
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  manualTagAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    color: colors.amber,
  },
  manualTagGreen: {
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    color: colors.accentGreen,
  },
  manualTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  manualCta: {
    color: colors.accentGreen,
    fontSize: 13,
    fontWeight: '900',
    marginTop: spacing[1],
    textTransform: 'uppercase',
  },
  manualTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '900',
    marginTop: spacing[1],
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '800',
  },
});
