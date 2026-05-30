import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme';

export default function IncidentsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Incidencias</Text>
      <Text style={styles.body}>Gestión de incidencias próxima en Fase 2.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
});
