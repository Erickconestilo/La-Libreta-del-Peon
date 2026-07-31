import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CalculatedThresholdStatus, MonitoringRoundStatus } from '@shared/types';

import { colors, spacing, typography } from '@/src/theme';

export function ChoiceChip({
  label,
  onPress,
  selected
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected ? styles.chipSelected : null]}>
      <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

export function StatePill({
  label,
  tone
}: {
  label: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const toneStyle = {
    danger: styles.dangerPill,
    neutral: styles.neutralPill,
    success: styles.successPill,
    warning: styles.warningPill,
  }[tone];
  const textStyle = {
    danger: styles.dangerPillText,
    neutral: styles.neutralPillText,
    success: styles.successPillText,
    warning: styles.warningPillText,
  }[tone];

  return (
    <View style={[styles.pill, toneStyle]}>
      <Text style={[styles.pillText, textStyle]}>{label}</Text>
    </View>
  );
}

export function RoundStatusPill({ status }: { status: MonitoringRoundStatus }) {
  const config = {
    active: { label: 'Activa', tone: 'success' as const },
    cancelled: { label: 'Cancelada', tone: 'danger' as const },
    closed: { label: 'Cerrada', tone: 'neutral' as const },
    draft: { label: 'Borrador', tone: 'warning' as const },
  }[status];

  return <StatePill label={config.label} tone={config.tone} />;
}

export function ThresholdPill({ status }: { status: CalculatedThresholdStatus }) {
  const config = {
    alarm: { label: 'Alarma', tone: 'danger' as const },
    normal: { label: 'Normal', tone: 'success' as const },
    unknown: { label: 'Sin umbral', tone: 'neutral' as const },
    warning: { label: 'Aviso', tone: 'warning' as const },
  }[status];

  return <StatePill label={config.label} tone={config.tone} />;
}

export function RowChevron() {
  return <MaterialIcons color={colors.accentGreen} name="chevron-right" size={24} />;
}

export const formatShortDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

const styles = StyleSheet.create({
  chip: {
    borderColor: '#2a2f3a',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  chipSelected: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: colors.background,
  },
  dangerPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
  },
  dangerPillText: {
    color: '#fca5a5',
  },
  neutralPill: {
    backgroundColor: 'rgba(148, 163, 184, 0.16)',
  },
  neutralPillText: {
    color: colors.textSecondary,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: spacing[1],
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  successPill: {
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
  },
  successPillText: {
    color: colors.accentGreen,
  },
  warningPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
  },
  warningPillText: {
    color: colors.amber,
  },
});
