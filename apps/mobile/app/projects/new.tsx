import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CreateProjectInput } from '@shared/types';
import { useCurrentSession } from '@/hooks/use-auth';
import { useCreateProject } from '@/hooks/use-projects';
import { colors, spacing, typography } from '@/src/theme';

export default function NewProjectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const { createProject, errorMessage, isCreating } = useCreateProject();
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const canCreateProject = currentUser?.role === 'admin';

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Falta el nombre', 'Escribe un nombre claro para la obra.');
      return;
    }

    const input: CreateProjectInput = {
      code: code.trim() ? code.trim() : null,
      description: description.trim() ? description.trim() : null,
      isActive: true,
      name: trimmedName
    };

    try {
      const project = await createProject(input);
      router.replace(`/projects/${project.id}` as never);
    } catch {
      // The hook exposes a readable error card below the form.
    }
  };

  if (!canCreateProject) {
    return (
      <>
        <Stack.Screen options={{ title: 'Nueva obra' }} />
        <View style={styles.centered}>
          <Text style={styles.title}>Acción restringida</Text>
          <Text style={styles.body}>Solo admin puede crear obras.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Nueva obra' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        style={styles.container}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Admin</Text>
          <Text style={styles.heroTitle}>Nueva obra</Text>
          <Text style={styles.body}>Crea la obra base antes de registrar estaciones, fotos y bitácora de campo.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            onChangeText={setName}
            placeholder="Ej. Túnel acceso norte"
            placeholderTextColor="#64748b"
            style={styles.input}
            value={name}
          />

          <Text style={styles.label}>Código opcional</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setCode}
            placeholder="Ej. tunel-norte"
            placeholderTextColor="#64748b"
            style={styles.input}
            value={code}
          />

          <Text style={styles.label}>Descripción</Text>
          <TextInput
            multiline
            onChangeText={setDescription}
            placeholder="Zona, cliente, fase o referencia de trabajo"
            placeholderTextColor="#64748b"
            style={[styles.input, styles.notesInput]}
            value={description}
          />
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>No se pudo crear la obra</Text>
            <Text style={styles.body}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable disabled={isCreating} onPress={() => void handleSubmit()} style={[styles.primaryButton, isCreating ? styles.disabledButton : null]}>
          <Text style={styles.primaryButtonText}>{isCreating ? 'Creando...' : 'Crear obra'}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody - 1,
    lineHeight: 21
  },
  card: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[3]
  },
  centered: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing[2],
    justifyContent: 'center',
    padding: spacing[4]
  },
  container: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: spacing[2],
    padding: spacing[3]
  },
  disabledButton: {
    opacity: 0.55
  },
  errorCard: {
    backgroundColor: colors.card,
    borderLeftColor: colors.red,
    borderLeftWidth: 3,
    padding: spacing[3]
  },
  errorTitle: {
    color: colors.red,
    fontSize: typography.fontSizeBody,
    fontWeight: '800',
    marginBottom: spacing[0]
  },
  eyebrow: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase'
  },
  heroCard: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[4]
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800'
  },
  input: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizeBody,
    padding: spacing[2]
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  notesInput: {
    minHeight: 112,
    textAlignVertical: 'top'
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accentGreen,
    borderRadius: 16,
    paddingVertical: spacing[3]
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: typography.fontSizeBody,
    fontWeight: '900'
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '800'
  }
});
