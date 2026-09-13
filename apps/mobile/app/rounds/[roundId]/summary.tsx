import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatShortDate, RoundStatusPill, StatePill } from '@/components/monitoring-ui';
import { useCurrentSession } from '@/hooks/use-auth';
import { useMonitoringRound, useSaveMonitoringRound, useShareMonitoringRound, useWorkCompletionReports } from '@/hooks/use-monitoring';
import { canWriteProject } from '@/lib/field-access';
import { colors, spacing, typography } from '@/src/theme';

export default function MonitoringRoundSummaryScreen() {
  const params = useLocalSearchParams<{ roundId: string }>();
  const roundId = Array.isArray(params.roundId) ? params.roundId[0] : params.roundId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const { cachedAt, data: round, errorMessage, isOfflineCache, isLoading } = useMonitoringRound(roundId ?? null);
  const { data: reports, errorMessage: reportsError } = useWorkCompletionReports(roundId ?? null);
  const { errorMessage: shareErrorMessage, isSharing, shareExport } = useShareMonitoringRound(roundId ?? null);
  const { errorMessage: saveErrorMessage, isSaving, saveExport } = useSaveMonitoringRound(roundId ?? null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const points = round?.points ?? [];
  const taken = points.filter((point) => point.status === 'taken').length;
  const pending = points.filter((point) => point.status === 'pending').length;
  const skipped = points.filter((point) => point.status === 'skipped' || point.status === 'cancelled').length;
  const canExport = canWriteProject(currentUser, round?.projectId);

  const handleShare = async (format: 'csv' | 'xlsx') => {
    setShareMessage(null);
    try {
      await shareExport(format);
      setShareMessage('Archivo preparado. Elige WhatsApp, correo u otro canal en la ventana de compartir.');
    } catch {
      // El hook expone el motivo debajo del bloque de entrega.
    }
  };

  const handleSave = async (format: 'csv' | 'xlsx') => {
    setSaveMessage(null);
    try {
      const result = await saveExport(format);
      setSaveMessage(`Copia guardada: ${result.fileName}`);
    } catch {
      // El hook expone el motivo debajo del bloque de entrega.
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Resumen de ronda' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]} style={styles.container}>
        {errorMessage ? <View style={styles.error}><Text style={styles.errorTitle}>No se pudo cargar el resumen</Text><Text style={styles.body}>{errorMessage}</Text></View> : null}
        {isLoading && !round ? <Text style={styles.body}>Cargando resumen...</Text> : null}
        {round ? <>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Resumen operativo</Text>
            <View style={styles.titleRow}><View style={styles.titleBlock}><Text style={styles.title}>{round.name}</Text><Text style={styles.body}>{formatShortDate(round.roundDate)}</Text></View><RoundStatusPill status={round.status} /></View>
            {isOfflineCache ? <Text style={styles.warning}>Datos sin actualizar. Última copia: {cachedAt ?? 'desconocida'}.</Text> : null}
          </View>
          <View style={styles.metrics}>
            <Metric label="Tomados" value={taken} />
            <Metric label="Pendientes" value={pending} />
            <Metric label="Omitidos" value={skipped} />
            <Metric label="Total" value={points.length} />
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Puntos de la ronda</Text>
            {points.length === 0 ? <Text style={styles.body}>Esta ronda todavía no tiene puntos.</Text> : points.map((point) => <View key={point.id} style={styles.pointRow}><View style={styles.pointCopy}><Text style={styles.pointCode}>{point.controlPointCode}</Text><Text style={styles.body}>{point.controlPointName ?? 'Punto de control'}</Text></View><StatePill label={point.status === 'taken' ? 'Tomado' : point.status === 'pending' ? 'Pendiente' : 'Omitido'} tone={point.status === 'taken' ? 'success' : point.status === 'pending' ? 'warning' : 'neutral'} /></View>)}
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Partes de zona</Text>
            {reportsError ? <Text style={styles.errorText}>{reportsError}</Text> : null}
            {!reportsError && reports.length === 0 ? <Text style={styles.body}>Todavía no hay partes recibidos.</Text> : null}
            {reports.map((report) => <View key={report.id} style={styles.reportRow}><View style={styles.pointCopy}><Text style={styles.pointCode}>{report.zoneLabel}</Text><Text style={styles.body}>{report.completedPointCount} realizados · {report.pendingPointCount} pendientes</Text><Text style={styles.body}>{new Date(report.reportedAt).toLocaleString('es-ES')}</Text></View><StatePill label={report.status === 'completed' ? 'Completado' : report.status === 'blocked' ? 'Bloqueado' : 'Parcial'} tone={report.status === 'completed' ? 'success' : report.status === 'blocked' ? 'danger' : 'warning'} /></View>)}
          </View>
          {canExport ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Entrega manual</Text>
              <Text style={styles.body}>Prepara el mismo contenido de la ronda en CSV o Excel. La app no lo envía automáticamente ni lo marca como revisado.</Text>
              <View style={styles.shareActions}>
                <Pressable disabled={isSharing} onPress={() => void handleShare('csv')} style={[styles.shareButton, isSharing ? styles.disabled : null]}><MaterialIcons color={colors.textPrimary} name="table-view" size={18} /><Text style={styles.shareButtonText}>Compartir CSV</Text></Pressable>
                <Pressable disabled={isSharing} onPress={() => void handleShare('xlsx')} style={[styles.shareButton, isSharing ? styles.disabled : null]}><MaterialIcons color={colors.textPrimary} name="grid-on" size={18} /><Text style={styles.shareButtonText}>Compartir Excel</Text></Pressable>
              </View>
              <Text style={styles.body}>Guarda una copia en una carpeta del teléfono para revisarla después o pasarla al ordenador.</Text>
              <View style={styles.shareActions}>
                <Pressable disabled={isSaving} onPress={() => void handleSave('csv')} style={[styles.shareButton, isSaving ? styles.disabled : null]}><MaterialIcons color={colors.textPrimary} name="save-alt" size={18} /><Text style={styles.shareButtonText}>Guardar CSV</Text></Pressable>
                <Pressable disabled={isSaving} onPress={() => void handleSave('xlsx')} style={[styles.shareButton, isSaving ? styles.disabled : null]}><MaterialIcons color={colors.textPrimary} name="save-alt" size={18} /><Text style={styles.shareButtonText}>Guardar Excel</Text></Pressable>
              </View>
              {isSharing ? <Text style={styles.body}>Preparando archivo...</Text> : null}
              {isSaving ? <Text style={styles.body}>Preparando copia...</Text> : null}
              {shareMessage ? <Text style={styles.success}>{shareMessage}</Text> : null}
              {saveMessage ? <Text style={styles.success}>{saveMessage}</Text> : null}
              {shareErrorMessage ? <Text style={styles.errorText}>{shareErrorMessage}</Text> : null}
              {saveErrorMessage ? <Text style={styles.errorText}>{saveErrorMessage}</Text> : null}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Consulta supervisora</Text>
              <Text style={styles.body}>La exportación está reservada a admin y topógrafo. Aquí solo se muestran datos recibidos por el servidor.</Text>
            </View>
          )}
          <Pressable onPress={() => router.back()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Volver a la ronda</Text></Pressable>
        </> : null}
      </ScrollView>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: typography.fontSizeBody - 1, lineHeight: 20 },
  card: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, gap: spacing[2], padding: spacing[3] },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing[2], padding: spacing[3] },
  disabled: { opacity: 0.55 },
  error: { backgroundColor: colors.card, borderLeftColor: colors.red, borderLeftWidth: 3, gap: spacing[1], padding: spacing[3] },
  errorText: { color: colors.red, fontSize: 13, fontWeight: '700', lineHeight: 20 },
  errorTitle: { color: colors.red, fontSize: typography.fontSizeBody, fontWeight: '900' },
  eyebrow: { color: colors.accentGreen, fontSize: 12, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  hero: { gap: spacing[1] },
  metric: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, flex: 1, gap: 2, minWidth: '22%', padding: spacing[2] },
  metricLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  metricValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '900' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  pointCode: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
  pointCopy: { flex: 1, gap: 1 },
  pointRow: { alignItems: 'center', borderBottomColor: '#2a2f3a', borderBottomWidth: 1, flexDirection: 'row', gap: spacing[2], paddingBottom: spacing[2] },
  reportRow: { alignItems: 'flex-start', borderBottomColor: '#2a2f3a', borderBottomWidth: 1, flexDirection: 'row', gap: spacing[2], paddingBottom: spacing[2] },
  shareActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  shareButton: { alignItems: 'center', borderColor: '#475569', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: spacing[2] },
  shareButtonText: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, paddingVertical: spacing[2] },
  secondaryButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  success: { color: colors.accentGreen, fontSize: 13, fontWeight: '800', lineHeight: 20 },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '900' },
  titleBlock: { flex: 1, gap: 2 },
  titleRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  warning: { color: colors.amber, fontSize: 13, fontWeight: '800', lineHeight: 20 }
});
