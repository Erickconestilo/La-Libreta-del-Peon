import { useMemo, useState } from 'react';

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGuideEntries } from '@/hooks/use-guide';
import { borderRadius, colors, spacing, typography } from '@/src/theme';

export default function GuideScreen() {
  const insets = useSafeAreaInsets();
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
        <Text style={styles.heroTitle}>Consulta rápida en obra</Text>
        <Text style={styles.body}>
          Procedimientos, recordatorios y criterios operativos preparados para lectura rápida.
        </Text>
      </View>

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
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '800',
  },
});
