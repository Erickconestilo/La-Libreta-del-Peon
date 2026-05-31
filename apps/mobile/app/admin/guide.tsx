import { useMemo, useState } from 'react';

import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';

import { useCurrentSession } from '@/hooks/use-auth';
import { useGuideEntries, useGuideEntryMutations } from '@/hooks/use-guide';
import { colors } from '@/src/theme';

type DraftGuideEntry = {
  body: string;
  category: string;
  title: string;
};

const emptyDraft: DraftGuideEntry = {
  body: '',
  category: '',
  title: ''
};

export default function AdminGuideScreen() {
  const { currentUser } = useCurrentSession();
  const { data, errorMessage, isLoading } = useGuideEntries();
  const { createGuideEntry, deleteGuideEntry, isMutating, mutationError, updateGuideEntry } = useGuideEntryMutations();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftGuideEntry>(emptyDraft);
  const entries = data ?? [];

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [entries, selectedEntryId]
  );

  const handleSelectEntry = (entryId: string) => {
    const entry = entries.find((item) => item.id === entryId);

    if (!entry) {
      return;
    }

    setSelectedEntryId(entry.id);
    setDraft({
      body: entry.body,
      category: entry.category,
      title: entry.title
    });
  };

  const handleStartCreate = () => {
    setSelectedEntryId(null);
    setDraft(emptyDraft);
  };

  const handleSave = async () => {
    if (!draft.title.trim() || !draft.category.trim() || !draft.body.trim()) {
      return;
    }

    if (selectedEntry) {
      await updateGuideEntry({
        guideEntryId: selectedEntry.id,
        input: draft
      });
      return;
    }

    await createGuideEntry(draft);
    setDraft(emptyDraft);
  };

  const handleDelete = async () => {
    if (!selectedEntry) {
      return;
    }

    await deleteGuideEntry(selectedEntry.id);
    setSelectedEntryId(null);
    setDraft(emptyDraft);
  };

  if (currentUser?.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Acceso restringido</Text>
        <Text style={styles.body}>Esta pantalla solo está disponible para `admin`.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Guía de campo</Text>
        <Text style={styles.body}>
          Crea, corrige y mantiene el contenido operativo de Fase 1 sin tocar la base de datos a mano.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Entradas actuales</Text>
          <Pressable onPress={handleStartCreate} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Nueva</Text>
          </Pressable>
        </View>
        {isLoading ? <Text style={styles.body}>Cargando entradas...</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {entries.map((entry) => (
          <Pressable
            key={entry.id}
            onPress={() => handleSelectEntry(entry.id)}
            style={[styles.entryButton, selectedEntryId === entry.id && styles.entryButtonSelected]}
          >
            <Text style={styles.entryCategory}>{entry.category}</Text>
            <Text style={styles.entryTitle}>{entry.title}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{selectedEntry ? 'Editar entrada' : 'Nueva entrada'}</Text>
        {mutationError ? (
          <Text style={styles.error}>
            {mutationError instanceof Error ? mutationError.message : 'Error guardando la entrada.'}
          </Text>
        ) : null}
        <TextInput
          onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))}
          placeholder="Título"
          placeholderTextColor="#64748b"
          style={styles.input}
          value={draft.title}
        />
        <TextInput
          onChangeText={(value) => setDraft((current) => ({ ...current, category: value }))}
          placeholder="Categoría"
          placeholderTextColor="#64748b"
          style={styles.input}
          value={draft.category}
        />
        <TextInput
          multiline
          onChangeText={(value) => setDraft((current) => ({ ...current, body: value }))}
          placeholder="Contenido operativo"
          placeholderTextColor="#64748b"
          style={[styles.input, styles.bodyInput]}
          textAlignVertical="top"
          value={draft.body}
        />
        <Pressable disabled={isMutating} onPress={() => void handleSave()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{isMutating ? 'Guardando...' : selectedEntry ? 'Guardar cambios' : 'Crear entrada'}</Text>
        </Pressable>
        {selectedEntry ? (
          <Pressable disabled={isMutating} onPress={() => void handleDelete()} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>Eliminar entrada</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyInput: {
    minHeight: 160,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  centered: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 32,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: colors.red,
    fontSize: 15,
    fontWeight: '800',
  },
  entryButton: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  entryButtonSelected: {
    borderColor: colors.accentGreen,
  },
  entryCategory: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  entryTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
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
    padding: 12,
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
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#2a2f3a',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
});
