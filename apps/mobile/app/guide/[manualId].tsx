import { Stack, useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { guideManuals, type GuideManualId } from '@/lib/guide-catalog';
import { guideManualPages } from '@/lib/guide-page-assets';
import { colors, spacing } from '@/src/theme';

const isGuideManualId = (value: string | undefined): value is GuideManualId => {
  return value === 'leica-station' || value === 'leica-ls10';
};

export default function GuideManualScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ manualId: string }>();
  const manualId = Array.isArray(params.manualId) ? params.manualId[0] : params.manualId;
  const pageWidth = Math.min(width - spacing[3] * 2, 760);

  if (!isGuideManualId(manualId)) {
    return (
      <>
        <Stack.Screen options={{ title: 'Guías' }} />
        <View style={[styles.emptyContent, { paddingBottom: insets.bottom + spacing[4] }]}>
          <Text style={styles.emptyTitle}>Guía no encontrada</Text>
        </View>
      </>
    );
  }

  const manual = guideManuals.find((item) => item.id === manualId);
  const pages = guideManualPages[manualId];

  return (
    <>
      <Stack.Screen options={{ title: manual?.title ?? 'Guías' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[5] }]}
        style={styles.container}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>{manual?.tag}</Text>
          <Text style={styles.heroTitle}>{manual?.title}</Text>
          <Text style={styles.caption}>{pages.length} páginas offline</Text>
        </View>

        {pages.map((page, index) => (
          <View key={`${manualId}-${index}`} style={styles.pageCard}>
            <Text style={styles.pageLabel}>Página {index + 1}</Text>
            <Image
              resizeMode="contain"
              source={page}
              style={[styles.pageImage, { width: pageWidth }]}
            />
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
  },
  emptyContent: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing[4],
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  eyebrow: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heroCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 25,
    fontWeight: '900',
  },
  pageCard: {
    alignItems: 'center',
    backgroundColor: '#0f1117',
    borderColor: '#2a2f3a',
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing[1],
    overflow: 'hidden',
    padding: spacing[1],
  },
  pageImage: {
    aspectRatio: 0.707,
    backgroundColor: '#ffffff',
  },
  pageLabel: {
    alignSelf: 'flex-start',
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: spacing[1],
    paddingTop: spacing[1],
  },
});
