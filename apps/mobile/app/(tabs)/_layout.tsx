import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentSession } from '@/hooks/use-auth';
import { borderRadius, colors, spacing } from '@/src/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentUser } = useCurrentSession();
  const canCreateStation = currentUser?.role === 'admin' || currentUser?.role === 'topografo';
  const bottomInset = Math.max(insets.bottom, spacing[1]);

  return (
    <View style={styles.wrapper}>
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
            title: 'Conversación',
            tabBarIcon: ({ color }) => <MaterialIcons color={color} name="chat-bubble-outline" size={24} />,
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
  wrapper: {
    flex: 1,
  },
});
