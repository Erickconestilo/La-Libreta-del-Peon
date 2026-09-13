import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';

import { useWeeklyWork, useWeeklyWorkMutations } from '@/hooks/use-weekly-work';
import { createRandomId } from '@/lib/random-id';
import {
  formatWeeklyWorkRange,
  getWeeklyWorkWeek,
  getWeeklyWorkWeekStart,
  isWeeklyWorkItemDeletable,
  moveWeeklyWorkWeek,
  toLocalDateKey,
  WEEKLY_WORK_CATEGORY_LABELS,
  WEEKLY_WORK_STATUS_LABELS,
  type WeeklyWorkCategory,
  type WeeklyWorkItem,
  type WeeklyWorkStatus
} from '@/lib/weekly-work';
import { colors, spacing } from '@/src/theme';

type Props = {
  canEdit: boolean;
  projectId: string | null;
};

type EditorState = {
  category: WeeklyWorkCategory;
  clientRequestId: string | null;
  itemId: string | null;
  notes: string;
  status: WeeklyWorkStatus;
  title: string;
  version: number | null;
  workDate: string;
};

const emptyEditor = (date: string): EditorState => ({
  category: 'manual',
  clientRequestId: createRandomId(),
  itemId: null,
  notes: '',
  status: 'planned',
  title: '',
  version: null,
  workDate: date
});

const statusTone: Record<WeeklyWorkStatus, string> = {
  blocked: colors.red,
  done: colors.accentGreen,
  in_progress: colors.amber,
  planned: colors.textSecondary
};

export function WeeklyWorkPlanner({ canEdit, projectId }: Props) {
  const { width } = useWindowDimensions();
  const [weekStart, setWeekStart] = useState(() => getWeeklyWorkWeekStart());
  const query = useWeeklyWork(projectId, weekStart);
  const mutations = useWeeklyWorkMutations(projectId);
  const week = useMemo(() => getWeeklyWorkWeek(query.data, weekStart), [query.data, weekStart]);
  const todayKey = getWeeklyWorkWeekStart(new Date()) === weekStart
    ? toLocalDateKey(new Date())
    : weekStart;
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const isWide = width >= 900;
  const canMutate = canEdit && !query.isOfflineCache && !mutations.isSaving;

  useEffect(() => {
    const currentWeekStart = getWeeklyWorkWeekStart();
    const today = toLocalDateKey(new Date());
    setSelectedDate(currentWeekStart === weekStart ? today : weekStart);
    setEditor(null);
  }, [weekStart]);

  const selectedDay = week.days.find((day) => day.date === selectedDate) ?? week.days[0];

  const startCreate = (date = selectedDay.date) => setEditor(emptyEditor(date));
  const startEdit = (item: WeeklyWorkItem) => setEditor({
    category: item.category,
    clientRequestId: null,
    itemId: item.id,
    notes: item.notes ?? '',
    status: item.status,
    title: item.title,
    version: item.version,
    workDate: item.workDate.slice(0, 10)
  });

  const saveEditor = async () => {
    if (!editor) return;
    const title = editor.title.trim();
    if (!title) {
      Alert.alert('Falta el trabajo', 'Escribe una descripción corta y reconocible.');
      return;
    }
    const input = {
      category: editor.category,
      notes: editor.notes.trim() || null,
      status: editor.status,
      title,
      workDate: editor.workDate
    };
    if (editor.itemId) {
      if (!editor.version) throw new Error('Falta la versión del trabajo. Recarga la semana.');
      await mutations.updateItem({ input: { ...input, version: editor.version }, itemId: editor.itemId });
    } else {
      await mutations.createItem({ ...input, clientRequestId: editor.clientRequestId ?? createRandomId() });
    }
    setSelectedDate(editor.workDate);
    setEditor(null);
  };

  const toggleDone = async (item: WeeklyWorkItem) => {
    await mutations.updateItem({
      input: { status: item.status === 'done' ? 'planned' : 'done', version: item.version },
      itemId: item.id
    });
  };

  const confirmDelete = (item: WeeklyWorkItem) => {
    if (!isWeeklyWorkItemDeletable(item)) return;
    Alert.alert('Eliminar planificación', `Se quitará “${item.title}” de esta semana.`, [
      { style: 'cancel', text: 'Cancelar' },
      { onPress: () => { void mutations.deleteItem({ itemId: item.id, version: item.version }); }, style: 'destructive', text: 'Eliminar' }
    ]);
  };

  if (!projectId) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Plan semanal</Text>
        <Text style={styles.body}>Selecciona una obra para organizar los trabajos de lunes a domingo.</Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Planificación</Text>
          <Text style={styles.panelTitle}>Semana de trabajo</Text>
          <Text style={styles.body}>{formatWeeklyWorkRange(week)} · {week.done}/{week.total} hechos</Text>
        </View>
        {canEdit ? (
          <Pressable
            accessibilityLabel={`Añadir trabajo para ${selectedDay.label.toLowerCase()}`}
            accessibilityRole="button"
            disabled={!canMutate}
            onPress={() => startCreate()}
            style={[styles.addButton, !canMutate ? styles.disabledButton : null]}
          >
            <MaterialIcons color={colors.background} name="add" size={19} />
            <Text style={styles.addButtonText}>Añadir</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.weekNavigation}>
        <Pressable accessibilityLabel="Semana anterior" accessibilityRole="button" onPress={() => setWeekStart((current) => moveWeeklyWorkWeek(current, -1))} style={styles.iconButton}>
          <MaterialIcons color={colors.textPrimary} name="chevron-left" size={22} />
        </Pressable>
        <Pressable accessibilityLabel="Volver a esta semana" accessibilityRole="button" onPress={() => setWeekStart(getWeeklyWorkWeekStart())} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Esta semana</Text>
        </Pressable>
        <Pressable accessibilityLabel="Semana siguiente" accessibilityRole="button" onPress={() => setWeekStart((current) => moveWeeklyWorkWeek(current, 1))} style={styles.iconButton}>
          <MaterialIcons color={colors.textPrimary} name="chevron-right" size={22} />
        </Pressable>
      </View>

      <View style={styles.dayGrid}>
        {week.days.map((day) => {
          const selected = day.date === selectedDay.date;
          const dateNumber = Number(day.date.slice(-2));
          return (
            <Pressable
              accessibilityLabel={`${day.label.toLowerCase()}, ${day.done} de ${day.total} trabajos hechos`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={day.date}
              onPress={() => { setSelectedDate(day.date); setEditor(null); }}
              style={[styles.dayChip, selected ? styles.dayChipSelected : null]}
            >
              <Text style={[styles.dayChipLabel, selected ? styles.dayChipLabelSelected : null]}>{day.shortLabel}</Text>
              <Text style={[styles.dayChipDate, selected ? styles.dayChipDateSelected : null]}>{dateNumber}</Text>
              <Text style={[styles.dayChipCount, selected ? styles.dayChipCountSelected : null]}>{day.done}/{day.total}</Text>
            </Pressable>
          );
        })}
      </View>

      {query.isLoading ? <Text style={styles.body}>Cargando semana...</Text> : null}
      {query.isOfflineCache ? (
        <View style={styles.offlineNotice}>
          <MaterialIcons color={colors.amber} name="cloud-off" size={17} />
          <Text style={styles.offlineNoticeText}>
            Semana guardada en este dispositivo{query.cachedAt ? ` · ${new Date(query.cachedAt).toLocaleString('es-ES')}` : ''}. Para editar necesitas conexión.
          </Text>
        </View>
      ) : null}
      {query.errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{query.errorMessage}</Text>
          <Pressable accessibilityRole="button" onPress={() => { void query.refetch(); }} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}
      {mutations.errorMessage ? <Text style={styles.errorText}>{mutations.errorMessage}</Text> : null}

      {editor ? (
        <WeeklyWorkEditor
          editor={editor}
          isSaving={mutations.isSaving}
          onCancel={() => setEditor(null)}
          onChange={setEditor}
          onSave={() => { void saveEditor(); }}
          weekDates={week.days.map((day) => ({ date: day.date, label: day.shortLabel }))}
        />
      ) : null}

      {isWide ? (
        <View style={styles.desktopBoard}>
          {week.days.map((day) => (
            <View key={day.date} style={styles.desktopColumn}>
              <Text style={styles.desktopDayTitle}>{day.label}</Text>
              <Text style={styles.desktopDayDate}>{day.date.slice(8, 10)}/{day.date.slice(5, 7)}</Text>
              {day.items.length === 0 ? <Text style={styles.emptyText}>Sin trabajo</Text> : null}
              {day.items.map((item) => (
                <WeeklyWorkTask
                  canEdit={canMutate}
                  item={item}
                  key={item.id}
                  onDelete={confirmDelete}
                  onEdit={startEdit}
                  onToggleDone={toggleDone}
                />
              ))}
              {canEdit ? (
                <Pressable accessibilityLabel={`Añadir trabajo para ${day.label.toLowerCase()}`} accessibilityRole="button" disabled={!canMutate} onPress={() => startCreate(day.date)} style={[styles.columnAddButton, !canMutate ? styles.disabledButton : null]}>
                  <MaterialIcons color={colors.textSecondary} name="add" size={16} />
                  <Text style={styles.columnAddText}>Añadir</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.selectedDayCard}>
          <View style={styles.selectedDayHeader}>
            <View>
              <Text style={styles.selectedDayTitle}>{selectedDay.label}</Text>
              <Text style={styles.body}>{selectedDay.done}/{selectedDay.total} hechos</Text>
            </View>
            {selectedDay.total > 0 ? <Text style={styles.selectedDayDate}>{selectedDay.date.slice(8, 10)}/{selectedDay.date.slice(5, 7)}</Text> : null}
          </View>
          {selectedDay.items.length === 0 && !query.isLoading ? (
            <View style={styles.emptyState}>
              <MaterialIcons color={colors.textSecondary} name="event-available" size={24} />
              <Text style={styles.emptyTitle}>Día libre de planificación</Text>
              <Text style={styles.emptyText}>Añade solo lo que realmente deba aparecer en la jornada.</Text>
            </View>
          ) : null}
          {selectedDay.items.map((item) => (
            <WeeklyWorkTask
              canEdit={canMutate}
              item={item}
              key={item.id}
              onDelete={confirmDelete}
              onEdit={startEdit}
              onToggleDone={toggleDone}
            />
          ))}
        </View>
      )}

      <Text style={styles.traceabilityNote}>
        Planificar aquí no confirma una lectura ni sustituye el resultado operativo de una ronda. El trabajo ejecutado conserva su trazabilidad en su flujo correspondiente.
      </Text>
    </View>
  );
}

const WeeklyWorkTask = ({
  canEdit,
  item,
  onDelete,
  onEdit,
  onToggleDone
}: {
  canEdit: boolean;
  item: WeeklyWorkItem;
  onDelete: (item: WeeklyWorkItem) => void;
  onEdit: (item: WeeklyWorkItem) => void;
  onToggleDone: (item: WeeklyWorkItem) => Promise<void>;
}) => (
  <View style={styles.taskCard}>
    <View style={styles.taskHeader}>
      <View style={styles.taskCopy}>
        <View style={styles.taskMetaRow}>
          <Text style={styles.categoryPill}>{WEEKLY_WORK_CATEGORY_LABELS[item.category]}</Text>
          <Text style={[styles.statusText, { color: statusTone[item.status] }]}>{WEEKLY_WORK_STATUS_LABELS[item.status]}</Text>
        </View>
        <Text style={[styles.taskTitle, item.status === 'done' ? styles.taskTitleDone : null]}>{item.title}</Text>
        {item.notes ? <Text numberOfLines={3} style={styles.taskNotes}>{item.notes}</Text> : null}
      </View>
      {canEdit ? (
        <Pressable
          accessibilityLabel={item.status === 'done' ? `Marcar ${item.title} como pendiente` : `Marcar ${item.title} como hecho`}
          accessibilityRole="button"
          onPress={() => { void onToggleDone(item); }}
          style={[styles.quickDoneButton, item.status === 'done' ? styles.quickDoneButtonActive : null]}
        >
          <MaterialIcons color={item.status === 'done' ? colors.background : colors.accentGreen} name={item.status === 'done' ? 'check' : 'check-circle-outline'} size={20} />
        </Pressable>
      ) : null}
    </View>
    {canEdit ? (
      <View style={styles.taskActions}>
        <Pressable accessibilityLabel={`Editar ${item.title}`} accessibilityRole="button" onPress={() => onEdit(item)} style={styles.taskActionButton}>
          <MaterialIcons color={colors.textSecondary} name="edit" size={16} />
          <Text style={styles.taskActionText}>Editar</Text>
        </Pressable>
        {isWeeklyWorkItemDeletable(item) ? (
          <Pressable accessibilityLabel={`Eliminar ${item.title}`} accessibilityRole="button" onPress={() => onDelete(item)} style={styles.taskActionButton}>
            <MaterialIcons color={colors.red} name="delete-outline" size={16} />
            <Text style={[styles.taskActionText, { color: colors.red }]}>Eliminar</Text>
          </Pressable>
        ) : null}
      </View>
    ) : null}
  </View>
);

const WeeklyWorkEditor = ({
  editor,
  isSaving,
  onCancel,
  onChange,
  onSave,
  weekDates
}: {
  editor: EditorState;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (state: EditorState) => void;
  onSave: () => void;
  weekDates: Array<{ date: string; label: string }>;
}) => (
  <View style={styles.editorCard}>
    <Text style={styles.editorTitle}>{editor.itemId ? 'Editar trabajo' : 'Nuevo trabajo'}</Text>
    <Text style={styles.fieldLabel}>Día</Text>
    <View style={styles.choiceRow}>
      {weekDates.map((day) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: editor.workDate === day.date }}
          key={day.date}
          onPress={() => onChange({ ...editor, workDate: day.date })}
          style={[styles.choiceChip, editor.workDate === day.date ? styles.choiceChipSelected : null]}
        >
          <Text style={[styles.choiceText, editor.workDate === day.date ? styles.choiceTextSelected : null]}>{day.label}</Text>
        </Pressable>
      ))}
    </View>
    <Text style={styles.fieldLabel}>Trabajo</Text>
    <TextInput
      accessibilityLabel="Descripción del trabajo"
      maxLength={120}
      onChangeText={(title) => onChange({ ...editor, title })}
      placeholder="Ej. Nivelar Sarrià · revisar SY01"
      placeholderTextColor="#64748b"
      style={styles.input}
      value={editor.title}
    />
    <Text style={styles.fieldLabel}>Tipo</Text>
    <View style={styles.choiceRow}>
      {(Object.keys(WEEKLY_WORK_CATEGORY_LABELS) as WeeklyWorkCategory[]).map((category) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: editor.category === category }}
          key={category}
          onPress={() => onChange({ ...editor, category })}
          style={[styles.choiceChip, editor.category === category ? styles.choiceChipSelected : null]}
        >
          <Text style={[styles.choiceText, editor.category === category ? styles.choiceTextSelected : null]}>{WEEKLY_WORK_CATEGORY_LABELS[category]}</Text>
        </Pressable>
      ))}
    </View>
    <Text style={styles.fieldLabel}>Estado</Text>
    <View style={styles.choiceRow}>
      {(Object.keys(WEEKLY_WORK_STATUS_LABELS) as WeeklyWorkStatus[]).map((status) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: editor.status === status }}
          key={status}
          onPress={() => onChange({ ...editor, status })}
          style={[styles.choiceChip, editor.status === status ? styles.choiceChipSelected : null]}
        >
          <Text style={[styles.choiceText, editor.status === status ? styles.choiceTextSelected : null]}>{WEEKLY_WORK_STATUS_LABELS[status]}</Text>
        </Pressable>
      ))}
    </View>
    <Text style={styles.fieldLabel}>Nota</Text>
    <TextInput
      accessibilityLabel="Nota del trabajo"
      maxLength={500}
      multiline
      onChangeText={(notes) => onChange({ ...editor, notes })}
      placeholder="Acceso, prioridad, material o contexto para el relevo"
      placeholderTextColor="#64748b"
      style={[styles.input, styles.notesInput]}
      value={editor.notes}
    />
    <View style={styles.editorActions}>
      <Pressable accessibilityRole="button" disabled={isSaving} onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>Cancelar</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={isSaving} onPress={onSave} style={[styles.saveButton, isSaving ? styles.disabledButton : null]}>
        <MaterialIcons color={colors.background} name="save" size={17} />
        <Text style={styles.saveButtonText}>{isSaving ? 'Guardando...' : 'Guardar'}</Text>
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  addButton: { alignItems: 'center', backgroundColor: colors.accentGreen, borderRadius: 9, flexDirection: 'row', gap: 5, minHeight: 42, paddingHorizontal: 12 },
  addButtonText: { color: colors.background, fontSize: 13, fontWeight: '900' },
  body: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  cancelButton: { alignItems: 'center', borderColor: '#3a4250', borderRadius: 9, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 14 },
  cancelButtonText: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  categoryPill: { backgroundColor: '#202631', borderRadius: 999, color: colors.textSecondary, fontSize: 10, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3 },
  choiceChip: { borderColor: '#3a4250', borderRadius: 999, borderWidth: 1, minHeight: 34, paddingHorizontal: 10, paddingVertical: 7 },
  choiceChipSelected: { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choiceText: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  choiceTextSelected: { color: colors.background },
  columnAddButton: { alignItems: 'center', flexDirection: 'row', gap: 4, justifyContent: 'center', minHeight: 36 },
  columnAddText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  dayChip: { alignItems: 'center', borderColor: '#303744', borderRadius: 10, borderWidth: 1, flexGrow: 1, flexBasis: '22%', gap: 1, minHeight: 68, padding: 7 },
  dayChipCount: { color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  dayChipCountSelected: { color: colors.background },
  dayChipDate: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' },
  dayChipDateSelected: { color: colors.background },
  dayChipLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  dayChipLabelSelected: { color: colors.background },
  dayChipSelected: { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  desktopBoard: { flexDirection: 'row', gap: 7 },
  desktopColumn: { backgroundColor: colors.background, borderColor: '#303744', borderRadius: 10, borderWidth: 1, flex: 1, gap: 7, minWidth: 0, padding: 8 },
  desktopDayDate: { color: colors.textSecondary, fontSize: 11 },
  desktopDayTitle: { color: colors.textPrimary, fontSize: 11, fontWeight: '900' },
  disabledButton: { opacity: 0.6 },
  editorActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  editorCard: { backgroundColor: '#111722', borderColor: 'rgba(34,197,94,0.45)', borderRadius: 12, borderWidth: 1, gap: 9, padding: 12 },
  editorTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  emptyState: { alignItems: 'center', gap: 5, paddingVertical: 16 },
  emptyText: { color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
  emptyTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  errorCard: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  errorText: { color: colors.red, flex: 1, fontSize: 12, lineHeight: 17 },
  eyebrow: { color: colors.accentGreen, fontSize: 10, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase' },
  fieldLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  headerCopy: { flex: 1, gap: 2 },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  iconButton: { alignItems: 'center', borderColor: '#3a4250', borderRadius: 9, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  input: { backgroundColor: colors.background, borderColor: '#3a4250', borderRadius: 9, borderWidth: 1, color: colors.textPrimary, fontSize: 14, minHeight: 44, paddingHorizontal: 11, paddingVertical: 9 },
  notesInput: { minHeight: 74, textAlignVertical: 'top' },
  offlineNotice: { alignItems: 'flex-start', backgroundColor: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.35)', borderRadius: 9, borderWidth: 1, flexDirection: 'row', gap: 7, padding: 9 },
  offlineNoticeText: { color: colors.textSecondary, flex: 1, fontSize: 11, lineHeight: 16 },
  panel: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 12, borderWidth: 1, gap: 12, padding: 12 },
  panelTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  quickDoneButton: { alignItems: 'center', borderColor: 'rgba(34,197,94,0.45)', borderRadius: 999, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  quickDoneButtonActive: { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
  retryButton: { borderColor: '#3a4250', borderRadius: 8, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 6 },
  retryButtonText: { color: colors.textPrimary, fontSize: 11, fontWeight: '800' },
  saveButton: { alignItems: 'center', backgroundColor: colors.accentGreen, borderRadius: 9, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 44, paddingHorizontal: 14 },
  saveButtonText: { color: colors.background, fontSize: 13, fontWeight: '900' },
  selectedDayCard: { backgroundColor: colors.background, borderColor: '#303744', borderRadius: 10, borderWidth: 1, gap: 8, padding: 10 },
  selectedDayDate: { color: colors.accentGreen, fontSize: 13, fontWeight: '900' },
  selectedDayHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  selectedDayTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' },
  statusText: { fontSize: 10, fontWeight: '900' },
  taskActionButton: { alignItems: 'center', flexDirection: 'row', gap: 4, minHeight: 34, paddingHorizontal: 4 },
  taskActionText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  taskActions: { flexDirection: 'row', gap: 14 },
  taskCard: { backgroundColor: '#151b25', borderColor: '#303744', borderRadius: 9, borderWidth: 1, gap: 5, padding: 9 },
  taskCopy: { flex: 1, gap: 5 },
  taskHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  taskMetaRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  taskNotes: { color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
  taskTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  taskTitleDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  todayButton: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 40 },
  todayButtonText: { color: colors.accentGreen, fontSize: 12, fontWeight: '900' },
  traceabilityNote: { color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
  weekNavigation: { alignItems: 'center', flexDirection: 'row', gap: 8 }
});
