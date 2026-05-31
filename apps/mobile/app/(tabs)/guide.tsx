import { useMemo, useState } from 'react';

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [searchText, setSearchText] = useState('');

  const categories = useMemo(() => {
    return Array.from(new Set(entries.map((entry) => entry.category))).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = normalizeSearch(searchText);
    let nextEntries = entries;

    if (categoryFilter) {
      nextEntries = nextEntries.filter((entry) => entry.category === categoryFilter);
    }

    if (normalizedSearch) {
      nextEntries = nextEntries.filter((entry) => {
        return normalizeSearch(`${entry.title} ${entry.body} ${entry.category}`).includes(normalizedSearch);
      });
    }

    return nextEntries;
  }, [categoryFilter, entries, searchText]);

  const groupedEntries = useMemo(() => {
    return groupGuideEntriesByInstrument(filteredEntries);
  }, [filteredEntries]);

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 112 + insets.bottom }]} style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Guía de campo</Text>
        <Text style={styles.heroTitle}>Manuales de campo</Text>
        <Text style={styles.body}>
          Toca un manual para abrirlo. Las fichas rápidas de abajo son recordatorios cortos y se leen sin cambiar de pantalla.
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
              <Text style={styles.manualMode}>Offline</Text>
            </View>
            <Text style={styles.manualTitle}>{manual.title}</Text>
            <Text style={styles.body}>{manual.summary}</Text>
            <View style={styles.manualActionRow}>
              <Text style={styles.manualCta}>Abrir manual</Text>
              <Text style={styles.manualPages}>{manual.pages} páginas incluidas</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Fichas rápidas</Text>
        <Text style={styles.sectionHint}>Lectura directa: no abren otra pantalla.</Text>
      </View>

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setSearchText}
        placeholder="Buscar por instrumento, tarea o problema"
        placeholderTextColor="#64748b"
        style={styles.searchInput}
        value={searchText}
      />

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
            {entries.length === 0 && !searchText
              ? 'Todavía no hay contenido publicado en la guía.'
              : 'No hay fichas para ese filtro o búsqueda.'}
          </Text>
        </View>
      ) : null}

      {groupedEntries.map((group) => (
        <View key={group.title} style={styles.quickGroup}>
          <Text style={styles.quickGroupTitle}>{group.title}</Text>
          {group.entries.map((entry) => (
            <QuickGuideCard
              body={entry.body}
              category={entry.category}
              key={entry.id}
              title={entry.title}
            />
          ))}
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

type QuickGuideCardProps = {
  body: string;
  category: string;
  title: string;
};

type QuickGuideGroup = {
  entries: Array<QuickGuideCardProps & { id: string }>;
  title: string;
};

function QuickGuideCard({ body, category, title }: QuickGuideCardProps) {
  return (
    <View style={styles.quickCard}>
      <Text style={styles.quickLabel}>{formatCategoryLabel(category)}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const formatCategoryLabel = (category: string) => {
  return category.replace(/\s+/g, ' ').trim();
};

const normalizeSearch = (value: string) => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const getInstrumentGroupTitle = (category: string) => {
  const normalizedCategory = normalizeSearch(category);

  if (normalizedCategory.includes('ls10') || normalizedCategory.includes('nivel')) {
    return 'Nivel Leica LS10';
  }

  if (normalizedCategory.includes('prisma')) {
    return 'Prismas';
  }

  return 'Estación total';
};

const groupGuideEntriesByInstrument = (entries: Array<QuickGuideCardProps & { id: string }>) => {
  const groups = new Map<string, QuickGuideGroup>();

  for (const entry of entries) {
    const title = getInstrumentGroupTitle(entry.category);
    const currentGroup = groups.get(title);

    if (currentGroup) {
      currentGroup.entries.push(entry);
    } else {
      groups.set(title, { entries: [entry], title });
    }
  }

  return Array.from(groups.values()).sort((first, second) => first.title.localeCompare(second.title));
};

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
  manualMode: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 999,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: spacing[1],
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  manualPages: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
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
    textTransform: 'uppercase',
  },
  manualActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'space-between',
    marginTop: spacing[1],
  },
  manualTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickCard: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  quickLabel: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  quickGroup: {
    gap: spacing[1],
  },
  quickGroupTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  searchInput: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 14,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    height: 52,
    paddingHorizontal: spacing[3],
  },
  sectionHeader: {
    gap: spacing[0],
    marginTop: spacing[1],
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionLabel: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '900',
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '800',
  },
});
