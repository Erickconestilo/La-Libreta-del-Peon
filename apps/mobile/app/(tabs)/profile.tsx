import { useEffect, useState } from 'react';

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentSession } from '@/hooks/use-auth';
import { colors } from '@/src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    activateSession,
    connectWithToken,
    currentUser,
    errorMessage,
    isLoading,
    isSessionInvalid,
    removeSession,
    activeSessionId,
    revalidateActiveSession,
    resetToGuest,
    savedSessions,
    sessionWarning,
    storedToken
  } = useCurrentSession();
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    setTokenInput('');
  }, [storedToken]);

  const handleConnect = async () => {
    try {
      await connectWithToken(tokenInput);
    } catch {}
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 112 + insets.bottom }]} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Perfil</Text>
        <Text style={styles.title}>{getRoleTitle(currentUser?.role)}</Text>
        <Text style={styles.body}>{getRoleDescription(currentUser?.role)}</Text>
        {currentUser?.email ? <Text style={styles.body}>Cuenta: {currentUser.email}</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Acceso técnico</Text>
        <Text style={styles.body}>
          Solo para admin o topógrafo. Pega un token si necesitas crear estaciones, subir fotos o gestionar la guía.
        </Text>
        {sessionWarning ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>{sessionWarning}</Text>
            <Pressable
              disabled={isLoading}
              onPress={() => void revalidateActiveSession()}
              style={styles.warningButton}
            >
              <Text style={styles.warningButtonText}>Revalidar token</Text>
            </Pressable>
          </View>
        ) : null}
        {savedSessions.length > 0 ? (
          <View style={styles.sessionsContainer}>
            {savedSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const lastUsed = new Date(session.lastUsedAt).toLocaleString('es-ES');

              return (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.title}>{session.label}</Text>
                    {session.email ? <Text style={styles.body}>{session.email}</Text> : null}
                    <Text style={styles.caption}>Último uso: {lastUsed}</Text>
                  </View>
                  <View style={styles.sessionActions}>
                    {isActive ? (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Activa</Text>
                      </View>
                    ) : (
                      <Pressable
                        disabled={isLoading}
                        onPress={() => void activateSession(session.id)}
                        style={styles.secondaryButton}
                      >
                        <Text style={styles.secondaryButtonText}>Activar</Text>
                      </Pressable>
                    )}
                    <Pressable
                      disabled={isLoading}
                      onPress={() => void removeSession(session.id)}
                      style={styles.dangerButton}
                    >
                      <Text style={styles.secondaryButtonText}>Eliminar</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
        <TextInput
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect={false}
          blurOnSubmit
          importantForAutofill="no"
          multiline={false}
          onChangeText={setTokenInput}
          onSubmitEditing={() => void handleConnect()}
          placeholder={storedToken ? 'Token guardado en este dispositivo' : 'Token de acceso'}
          placeholderTextColor="#64748b"
          returnKeyType="done"
          secureTextEntry
          style={styles.input}
          textContentType="none"
          value={tokenInput}
        />
        <Pressable disabled={isLoading} onPress={() => void handleConnect()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{isLoading ? 'Conectando...' : 'Validar token'}</Text>
        </Pressable>
        {isSessionInvalid && activeSessionId ? (
          <Text style={styles.inactiveModeText}>
            La sesión activa está bloqueada hasta revalidar o pegar un token nuevo.
          </Text>
        ) : null}
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

const getRoleTitle = (role: string | undefined) => {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'topografo':
      return 'Topógrafo';
    case 'visitante':
      return 'Modo visitante';
    default:
      return 'Sin sesión';
  }
};

const getRoleDescription = (role: string | undefined) => {
  switch (role) {
    case 'admin':
      return 'Puedes gestionar guía, revisar historial y editar contenido de campo.';
    case 'topografo':
      return 'Puedes registrar estaciones, fotos y memoria visual de campo.';
    case 'visitante':
      return 'Puedes consultar obras, estacionamientos, mapas y guías sin modificar datos.';
    default:
      return 'Conecta una cuenta técnica solo si necesitas editar datos.';
  }
};

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
  eyebrow: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
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
    height: 56,
    padding: 12,
    textAlignVertical: 'center',
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
  caption: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  dangerButton: {
    alignItems: 'center',
    borderColor: colors.red,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  sessionActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  sessionCard: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  sessionInfo: {
    gap: 4,
  },
  sessionsContainer: {
    gap: 12,
  },
  activeBadge: {
    alignItems: 'center',
    backgroundColor: `${colors.accentGreen}1a`,
    borderColor: colors.accentGreen,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  activeBadgeText: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '700',
  },
  warningCard: {
    borderColor: colors.amber,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  warningText: {
    color: colors.amber,
    fontSize: 14,
    lineHeight: 20,
  },
  warningButton: {
    alignSelf: 'flex-start',
    borderColor: colors.amber,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  warningButtonText: {
    color: colors.amber,
    fontSize: 13,
    fontWeight: '700',
  },
  inactiveModeText: {
    color: colors.red,
    fontSize: 13,
    lineHeight: 20,
  },
});
