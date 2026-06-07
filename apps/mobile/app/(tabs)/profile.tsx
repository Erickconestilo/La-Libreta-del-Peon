import { useEffect, useState } from 'react';

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentSession } from '@/hooks/use-auth';
import { useProjects } from '@/hooks/use-projects';
import { colors } from '@/src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    activateSession,
    connectWithCredentials,
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
  const projectsQuery = useProjects();
  const [tokenInput, setTokenInput] = useState('');
  const [authMode, setAuthMode] = useState<'credentials' | 'token'>('credentials');
  const [technicalEmail, setTechnicalEmail] = useState('');
  const [technicalPassword, setTechnicalPassword] = useState('');
  const isCredentialsMode = authMode === 'credentials';

  useEffect(() => {
    setTokenInput('');
  }, [storedToken]);

  useEffect(() => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'topografo') {
      setTechnicalEmail((currentUser.email ?? '').trim());
    }
  }, [currentUser]);

  const handleConnect = async () => {
    try {
      if (isCredentialsMode) {
        await connectWithCredentials(technicalEmail, technicalPassword);
        setTechnicalPassword('');
        return;
      }

      await connectWithToken(tokenInput);
    } catch {}
  };

  const switchAuthMode = (next: 'credentials' | 'token') => {
    if (isLoading) return;
    setAuthMode(next);
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
          Solo para admin o topógrafo. Entra con tu cuenta técnica (recomendado) o usa un token como respaldo.
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

        <View style={styles.modeSwitch}>
          <Pressable
            disabled={isLoading}
            onPress={() => switchAuthMode('credentials')}
            style={[styles.modeChip, isCredentialsMode ? styles.modeChipSelected : null]}
          >
            <Text style={[styles.modeChipText, isCredentialsMode ? styles.modeChipTextSelected : null]}>Cuenta</Text>
          </Pressable>
          <Pressable
            disabled={isLoading}
            onPress={() => switchAuthMode('token')}
            style={[styles.modeChip, !isCredentialsMode ? styles.modeChipSelected : null]}
          >
            <Text style={[styles.modeChipText, !isCredentialsMode ? styles.modeChipTextSelected : null]}>Token</Text>
          </Pressable>
        </View>

        {isCredentialsMode ? (
          <>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setTechnicalEmail}
              onSubmitEditing={() => void handleConnect()}
              placeholder="correo@empresa.com"
              placeholderTextColor="#64748b"
              returnKeyType="next"
              style={styles.input}
              textContentType="username"
              value={technicalEmail}
            />
            <TextInput
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect={false}
              onChangeText={setTechnicalPassword}
              onSubmitEditing={() => void handleConnect()}
              placeholder="contraseña"
              placeholderTextColor="#64748b"
              returnKeyType="done"
              secureTextEntry
              style={styles.input}
              textContentType="password"
              value={technicalPassword}
            />
            <Pressable
              disabled={isLoading}
              onPress={() => void handleConnect()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>{isLoading ? 'Conectando...' : 'Conectar con cuenta'}</Text>
            </Pressable>
          </>
        ) : (
          <>
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
            <Pressable
              disabled={isLoading}
              onPress={() => void handleConnect()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>{isLoading ? 'Conectando...' : 'Validar token'}</Text>
            </Pressable>
          </>
        )}

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
          <Text style={styles.body}>
            {currentUser.role === 'admin'
              ? 'Alcance global por rol admin.'
              : `Obras activas para esta cuenta: ${(projectsQuery.data ?? []).length || 0}.`}
          </Text>
          {currentUser.role === 'topografo' ? (
            <View style={styles.projectList}>
              {projectsQuery.isLoading ? <Text style={styles.caption}>Cargando obras asignadas...</Text> : null}
              {(projectsQuery.data ?? []).map((project) => (
                <View key={project.id} style={styles.projectPill}>
                  <Text style={styles.projectPillText}>{project.name}</Text>
                </View>
              ))}
              {projectsQuery.errorMessage ? <Text style={styles.error}>{projectsQuery.errorMessage}</Text> : null}
            </View>
          ) : null}
          <Pressable onPress={() => router.push('/daily-report' as never)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Abrir parte diario</Text>
          </Pressable>
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
    lineHeight: 22
  },
  card: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 18,
    width: '100%'
  },
  container: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 16,
    padding: 24
  },
  eyebrow: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase'
  },
  error: {
    color: colors.red,
    fontSize: 14,
    lineHeight: 20
  },
  input: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    height: 56,
    padding: 12,
    textAlignVertical: 'center'
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accentGreen,
    borderRadius: 12,
    paddingVertical: 12
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '800'
  },
  projectList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  projectPill: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  projectPillText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800'
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#2a2f3a',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800'
  },
  caption: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18
  },
  dangerButton: {
    alignItems: 'center',
    borderColor: colors.red,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10
  },
  sessionActions: {
    alignItems: 'flex-end',
    gap: 8
  },
  sessionCard: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  sessionInfo: {
    gap: 4
  },
  sessionsContainer: {
    gap: 12
  },
  activeBadge: {
    alignItems: 'center',
    backgroundColor: `${colors.accentGreen}1a`,
    borderColor: colors.accentGreen,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  activeBadgeText: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '700'
  },
  warningCard: {
    borderColor: colors.amber,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  warningText: {
    color: colors.amber,
    fontSize: 14,
    lineHeight: 20
  },
  warningButton: {
    alignSelf: 'flex-start',
    borderColor: colors.amber,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  warningButtonText: {
    color: colors.amber,
    fontSize: 13,
    fontWeight: '700'
  },
  inactiveModeText: {
    color: colors.red,
    fontSize: 13,
    lineHeight: 20
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  modeChip: {
    alignItems: 'center',
    borderColor: '#2a2f3a',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  modeChipSelected: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen
  },
  modeChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700'
  },
  modeChipTextSelected: {
    color: colors.background
  }
});
