import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadius, colors, spacing } from '@/src/theme';

export default function TabLayout() {
  return (
    <View style={styles.wrapper}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accentGreen,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Lista',
            tabBarIcon: ({ color }) => <MaterialIcons color={color} name="format-list-bulleted" size={24} />,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Mapa',
            tabBarIcon: ({ color }) => <MaterialIcons color={color} name="map" size={24} />,
          }}
        />
        <Tabs.Screen
          name="incidents"
          options={{
            title: 'Incidencias',
            tabBarIcon: ({ color }) => <MaterialIcons color={color} name="report-problem" size={24} />,
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

      <Pressable style={styles.fab} onPress={() => {}}>
        <MaterialIcons color={colors.background} name="add" size={28} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    alignItems: 'center',
    backgroundColor: colors.accentGreen,
    borderRadius: 28,
    bottom: 72,
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
