import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentSession } from '@/hooks/use-auth';
import { useStations } from '@/hooks/use-stations';
import { getStationDisplayName } from '@/lib/station-display';
import { colors, spacing, typography } from '@/src/theme';

export default function ConversationsScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const canUseTeamTools = currentUser?.role === 'admin' || currentUser?.role === 'topografo';
  const { data: stations, errorMessage, isLoading } = useStations();

  if (!canUseTeamTools) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>Conversación</Text>
            <Text style={styles.title}>Acceso de equipo</Text>
            <Text style={styles.body}>Los mensajes internos se muestran con una sesión de admin o topógrafo.</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={[styles.content, { paddingBottom: 112 + insets.bottom }]}
      data={stations ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Equipo</Text>
          <Text style={styles.heroTitle}>Conversación</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.card}>
          <Text style={styles.title}>{isLoading ? 'Cargando estaciones' : 'Sin estaciones'}</Text>
          <Text style={styles.body}>{errorMessage ?? 'No hay hilos disponibles todavía.'}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/station/${item.id}` as never)}
          style={({ pressed }) => [styles.threadCard, pressed ? styles.threadCardPressed : null]}
        >
          <View style={styles.threadIcon}>
            <MaterialIcons color={colors.accentGreen} name="chat-bubble-outline" size={22} />
          </View>
          <View style={styles.threadBody}>
            <Text style={styles.threadTitle}>{getStationDisplayName(item)}</Text>
            <Text style={styles.body}>{item.project?.name ?? 'Sin obra asignada'}</Text>
          </View>
          <MaterialIcons color={colors.textSecondary} name="chevron-right" size={24} />
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
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing[2],
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
  threadBody: {
    flex: 1,
    gap: 2,
  },
  threadCard: {
    alignItems: 'center',
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[2],
    padding: spacing[3],
  },
  threadCardPressed: {
    opacity: 0.78,
  },
  threadIcon: {
    alignItems: 'center',
    backgroundColor: '#0f1117',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  threadTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeBody,
    fontWeight: '900',
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '900',
  },
});
