import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { guideManuals, type GuideManual } from '@/lib/guide-catalog';
import { colors, spacing, typography } from '@/src/theme';

export default function GuideScreen() {
  const insets = useSafeAreaInsets();

  const handleOpenManual = (manualId: GuideManual['id']) => {
    router.push({
      pathname: '/guide/[manualId]',
      params: { manualId }
    } as never);
  };

  return (
    <FlatList
      contentContainerStyle={[styles.content, { paddingBottom: 112 + insets.bottom }]}
      data={guideManuals}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Guías de campo</Text>
          <Text style={styles.heroTitle}>Guías</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => handleOpenManual(item.id)}
          style={({ pressed }) => [
            styles.manualCard,
            item.accent === 'amber' ? styles.manualCardAmber : styles.manualCardGreen,
            pressed ? styles.manualCardPressed : null
          ]}
        >
          <View style={styles.manualHeader}>
            <View style={styles.manualIcon}>
              <MaterialIcons color={item.accent === 'amber' ? colors.amber : colors.accentGreen} name="menu-book" size={24} />
            </View>
            <View style={styles.manualTitleBlock}>
              <Text style={styles.manualTag}>{item.tag}</Text>
              <Text style={styles.title}>{item.title}</Text>
            </View>
          </View>
          <Text style={styles.body}>{item.summary}</Text>
          <View style={styles.manualFooter}>
            <Text style={styles.caption}>{item.pages} páginas offline</Text>
            <MaterialIcons color={colors.textPrimary} name="chevron-right" size={24} />
          </View>
        </Pressable>
      )}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody - 1,
    lineHeight: 21,
  },
  caption: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing[3],
    padding: spacing[3],
  },
  eyebrow: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  header: {
    gap: spacing[1],
    paddingVertical: spacing[2],
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
  },
  manualCard: {
    backgroundColor: '#151922',
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[3],
  },
  manualCardAmber: {
    borderColor: 'rgba(245, 158, 11, 0.48)',
  },
  manualCardGreen: {
    borderColor: 'rgba(34, 197, 94, 0.42)',
  },
  manualCardPressed: {
    opacity: 0.78,
  },
  manualFooter: {
    alignItems: 'center',
    borderTopColor: '#2a2f3a',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[2],
  },
  manualHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  manualIcon: {
    alignItems: 'center',
    backgroundColor: '#0f1117',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  manualTag: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  manualTitleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '900',
  },
});
