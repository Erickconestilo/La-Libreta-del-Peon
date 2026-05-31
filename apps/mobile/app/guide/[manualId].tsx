import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Image, type ImageSourcePropType, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GuideManualId } from '@/lib/guide-catalog';
import { guideManuals } from '@/lib/guide-catalog';
import { guideManualPages } from '@/lib/guide-page-assets';
import { borderRadius, colors, spacing } from '@/src/theme';

export default function GuideManualScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ manualId: string }>();
  const manualId = Array.isArray(params.manualId) ? params.manualId[0] : params.manualId;
  const manual = guideManuals.find((item) => item.id === manualId);
  const pages = manual ? guideManualPages[manual.id] : [];
  const pageWidth = Math.min(width - spacing[3] * 2, 900);

  if (!manual) {
    return (
      <>
        <Stack.Screen options={{ title: 'Guía' }} />
        <View style={[styles.emptyContent, { paddingBottom: insets.bottom + spacing[4] }]}>
          <Text style={styles.emptyTitle}>Guía no encontrada</Text>
          <Text style={styles.body}>Vuelve a la sección Guías y abre una tarjeta disponible.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: manual.title }} />
      <FlatList
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[5] }]}
        data={pages}
        initialNumToRender={2}
        keyExtractor={(_, index) => `${manual.id}-${index}`}
        ListHeaderComponent={
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>{manual.tag}</Text>
            <Text style={styles.heroTitle}>{manual.title}</Text>
            <Text style={styles.body}>{manual.summary}</Text>
            <Text style={styles.caption}>
              {manual.pages} páginas renderizadas dentro de la app para lectura offline.
            </Text>
          </View>
        }
        maxToRenderPerBatch={3}
        renderItem={({ index, item }) => (
          <GuidePageImage
            index={index}
            pageCount={manual.pages}
            pageWidth={pageWidth}
            source={item}
          />
        )}
        style={styles.container}
        windowSize={5}
      />
    </>
  );
}

type GuidePageImageProps = {
  index: number;
  pageCount: number;
  pageWidth: number;
  source: ImageSourcePropType;
};

function GuidePageImage({ index, pageCount, pageWidth, source }: GuidePageImageProps) {
  const resolvedSource = Image.resolveAssetSource(source);
  const ratio = resolvedSource?.width && resolvedSource?.height
    ? resolvedSource.height / resolvedSource.width
    : 1.42;

  return (
    <View style={styles.pageCard}>
      <Text style={styles.pageCounter}>Página {index + 1} de {pageCount}</Text>
      <Image
        resizeMode="contain"
        source={source}
        style={[styles.pageImage, { height: pageWidth * ratio, width: pageWidth }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
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
    gap: spacing[3],
    padding: spacing[3],
  },
  emptyContent: {
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing[2],
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
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing[1],
    marginBottom: spacing[1],
    padding: spacing[4],
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 27,
    fontWeight: '900',
  },
  pageCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing[1],
    overflow: 'hidden',
    padding: spacing[1],
  },
  pageCounter: {
    alignSelf: 'flex-start',
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: spacing[1],
    paddingTop: spacing[1],
    textTransform: 'uppercase',
  },
  pageImage: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius[0],
  },
});
