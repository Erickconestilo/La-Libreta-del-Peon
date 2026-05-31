import { useEffect, useState } from 'react';

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentSession } from '@/hooks/use-auth';
import { colors } from '@/src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { connectWithToken, currentUser, errorMessage, isLoading, resetToGuest, storedToken } = useCurrentSession();
  const [tokenInput, setTokenInput] = useState(storedToken ?? '');

  useEffect(() => {
    setTokenInput(storedToken ?? '');
  }, [storedToken]);

  const handleConnect = async () => {
    try {
      await connectWithToken(tokenInput);
    } catch {}
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 112 + insets.bottom }]} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Sesión</Text>
        <Text style={styles.body}>Rol actual: {currentUser?.role ?? 'sin sesión'}</Text>
        <Text style={styles.body}>Email: {currentUser?.email ?? 'sin email'}</Text>
        <Text style={styles.body}>Proveedor: {storedToken ? 'token manual' : 'visitante'}</Text>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Token técnico</Text>
        <Text style={styles.body}>
          Pega aquí un bearer token válido de Supabase si quieres entrar como admin mientras el login real aún no está construido.
        </Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          onChangeText={setTokenInput}
          placeholder="Bearer token de Supabase"
          placeholderTextColor="#64748b"
          style={styles.input}
          value={tokenInput}
        />
        <Pressable disabled={isLoading} onPress={() => void handleConnect()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{isLoading ? 'Conectando...' : 'Validar token'}</Text>
        </Pressable>
        <Pressable disabled={isLoading} onPress={() => void resetToGuest()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Volver a visitante</Text>
        </Pressable>
      </View>

      {currentUser?.role === 'admin' ? (
        <View style={styles.card}>
          <Text style={styles.title}>Admin</Text>
          <Pressable onPress={() => router.push('/admin/guide' as never)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Gestionar guía de campo</Text>
          </Pressable>
        </View>
      ) : null}

      {currentUser?.role === 'admin' || currentUser?.role === 'topografo' ? (
        <View style={styles.card}>
          <Text style={styles.title}>Operación</Text>
          <Pressable onPress={() => router.push('/history' as never)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Ver historial de cambios</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 18,
    width: '100%',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 24,
  },
  error: {
    color: colors.red,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    minHeight: 120,
    padding: 12,
    textAlignVertical: 'top',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accentGreen,
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#2a2f3a',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
});
