import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentSession } from '@/hooks/use-auth';
import { borderRadius, colors, spacing } from '@/src/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    activeSessionId,
    currentUser,
    isLoading,
    isSessionInvalid,
    revalidateActiveSession,
    sessionWarning
  } = useCurrentSession();
  const canCreateStation = currentUser?.role === 'admin' || currentUser?.role === 'topografo';
  const bottomInset = Math.max(insets.bottom, spacing[1]);
  const hasWarning = Boolean(sessionWarning);

  return (
    <View style={styles.wrapper}>
      {hasWarning ? (
        <View style={[styles.warningBar, { marginTop: Math.max(insets.top, spacing[0]) }]}>
          <View style={styles.warningTextBlock}>
            <Text style={styles.warningText}>
              {sessionWarning}
              {isSessionInvalid ? ' (sesión bloqueada)' : ''}
            </Text>
          </View>
          <Pressable
            disabled={isLoading || !activeSessionId}
            onPress={() => void revalidateActiveSession()}
            style={[styles.warningButton, (isLoading || !activeSessionId) && styles.warningButtonDisabled]}
          >
            <Text style={styles.warningButtonText}>
              {isLoading ? 'Revalidando...' : 'Revalidar token'}
            </Text>
          </Pressable>
        </View>
      ) : null}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accentGreen,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: [
            styles.tabBar,
            {
              height: 64 + bottomInset,
              paddingBottom: bottomInset
            }
          ],
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Obras',
            tabBarIcon: ({ color }) => <MaterialIcons color={color} name="folder" size={24} />,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Mapas',
            tabBarIcon: ({ color }) => <MaterialIcons color={color} name="map" size={24} />,
          }}
        />
        <Tabs.Screen
          name="conversations"
          options={{
            title: 'Bitácora',
            tabBarIcon: ({ color }) => <MaterialIcons color={color} name="history" size={24} />,
          }}
        />
        <Tabs.Screen
          name="guide"
          options={{
            title: 'Guías',
            tabBarIcon: ({ color }) => <MaterialIcons color={color} name="menu-book" size={24} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color }) => <MaterialIcons color={color} name="person" size={24} />,
          }}
        />
        <Tabs.Screen
          name="two"
          options={{ href: null }}
        />
      </Tabs>

      {canCreateStation ? (
        <Pressable
          accessibilityLabel="Crear estación"
          style={[styles.fab, { bottom: 72 + bottomInset }]}
          onPress={() => router.push('/station/new' as never)}
        >
          <MaterialIcons color={colors.background} name="add" size={28} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    alignItems: 'center',
    backgroundColor: colors.accentGreen,
    borderRadius: 28,
    elevation: 6,
    height: 56,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -28,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    width: 56,
    zIndex: 10,
  },
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    height: 64,
    paddingBottom: spacing[1],
    paddingTop: spacing[0],
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  warningBar: {
    backgroundColor: '#1b120a',
    borderBottomColor: 'rgba(255, 183, 77, 0.35)',
    borderBottomWidth: 1,
    borderRadius: borderRadius[0],
    marginHorizontal: spacing[2],
    marginBottom: spacing[2],
    padding: spacing[2],
    gap: spacing[1],
  },
  warningButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#4b2405',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.amber,
    paddingHorizontal: spacing[2],
    paddingVertical: 8,
  },
  warningButtonDisabled: {
    opacity: 0.55,
  },
  warningButtonText: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
  },
  warningText: {
    color: colors.amber,
    fontSize: 12,
    lineHeight: 17,
  },
  warningTextBlock: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
  },
});
