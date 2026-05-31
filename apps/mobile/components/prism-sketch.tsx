import { useMemo } from 'react';
import { View, StyleSheet, Text, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { colors, spacing } from '@/src/theme';

export type PrismSketchItem = {
  angleDeg: number;
  code: string;
  distanceM: number;
  photoUrl: string | null;
  status: string;
};

type PrismSketchProps = {
  items: PrismSketchItem[];
  onSelect: (code: string) => void;
  selectedCode: string | null;
};

const VIEWBOX_SIZE = 320;
const CENTER = VIEWBOX_SIZE / 2;
const MAX_RADIUS = 124;
const PRISM_TOUCH_RADIUS = 18;
const SELECTED_PRISM_TOUCH_RADIUS = 22;

export function PrismSketch({ items, onSelect, selectedCode }: PrismSketchProps) {
  const { width } = useWindowDimensions();
  const chartSize = Math.min(width - spacing[3] * 4, 340);
  const maxDistance = useMemo(() => {
    return Math.max(...items.map((item) => item.distanceM), 1);
  }, [items]);

  const plotItems = useMemo(() => {
    return items.map((item, index) => {
      const radius = Math.max(28, (item.distanceM / maxDistance) * MAX_RADIUS);
      const angle = normalizeAngle(item.angleDeg);
      const radians = (angle * Math.PI) / 180;
      const collisionOffset = (index % 3) * 3;

      return {
        ...item,
        angle,
        radius,
        x: CENTER + Math.sin(radians) * (radius + collisionOffset),
        y: CENTER - Math.cos(radians) * (radius + collisionOffset)
      };
    });
  }, [items, maxDistance]);

  if (items.length === 0) {
    return (
      <View style={styles.emptySketch}>
        <Text style={styles.emptyTitle}>Sin croquis disponible</Text>
        <Text style={styles.emptyBody}>
          Esta estación aún no tiene observaciones de prisma con ángulo y distancia.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Svg height={chartSize} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} width={chartSize}>
        <Circle cx={CENTER} cy={CENTER} fill="#111827" r={150} />
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <G key={ratio}>
            <Circle
              cx={CENTER}
              cy={CENTER}
              fill="none"
              r={MAX_RADIUS * ratio}
              stroke="rgba(148, 163, 184, 0.22)"
              strokeDasharray={ratio === 1 ? undefined : "4 6"}
              strokeWidth={1}
            />
            <SvgText
              fill="rgba(148, 163, 184, 0.72)"
              fontSize={9}
              fontWeight="700"
              x={CENTER + 6}
              y={CENTER - MAX_RADIUS * ratio + 12}
            >
              {Math.round(maxDistance * ratio)}m
            </SvgText>
          </G>
        ))}

        <Line stroke="rgba(245, 158, 11, 0.62)" strokeWidth={1.5} x1={CENTER} x2={CENTER} y1={18} y2={VIEWBOX_SIZE - 18} />
        <Line stroke="rgba(245, 158, 11, 0.28)" strokeWidth={1} x1={18} x2={VIEWBOX_SIZE - 18} y1={CENTER} y2={CENTER} />
        <SvgText fill={colors.amber} fontSize={10} fontWeight="900" x={CENTER - 7} y={28}>0°</SvgText>

        {plotItems.map((item) => {
          const selected = item.code === selectedCode;
          return (
            <G key={`${item.code}-${item.angle}-${item.distanceM}`} onPress={() => onSelect(item.code)}>
              <Circle
                cx={item.x}
                cy={item.y}
                fill="rgba(255, 255, 255, 0.01)"
                r={selected ? SELECTED_PRISM_TOUCH_RADIUS : PRISM_TOUCH_RADIUS}
              />
              {selected ? (
                <Line
                  stroke="rgba(250, 204, 21, 0.5)"
                  strokeWidth={2}
                  x1={CENTER}
                  x2={item.x}
                  y1={CENTER}
                  y2={item.y}
                />
              ) : null}
              <Circle
                cx={item.x}
                cy={item.y}
                fill={getPrismColor(item.status, selected)}
                r={selected ? 8 : 6}
                stroke={selected ? '#FEF08A' : '#0F1117'}
                strokeWidth={selected ? 2 : 1.5}
              />
              <SvgText
                fill={selected ? '#FEF08A' : '#E2E8F0'}
                fontSize={selected ? 11 : 9}
                fontWeight="900"
                x={item.x + 8}
                y={item.y - 8}
              >
                {item.code}
              </SvgText>
            </G>
          );
        })}

        <Circle cx={CENTER} cy={CENTER} fill="#0F1117" r={17} stroke={colors.accentGreen} strokeWidth={3} />
        <Circle cx={CENTER} cy={CENTER} fill={colors.accentGreen} r={5} />
        <SvgText fill={colors.textPrimary} fontSize={10} fontWeight="900" x={CENTER - 23} y={CENTER + 34}>
          EST
        </SvgText>
      </Svg>
    </View>
  );
}

const normalizeAngle = (angle: number) => {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const getPrismColor = (status: string, selected: boolean) => {
  if (selected) {
    return '#FACC15';
  }

  switch (status) {
    case 'missing':
      return colors.red;
    case 'replaced':
      return colors.amber;
    case 'inactive':
      return '#64748B';
    case 'active':
    default:
      return colors.accentGreen;
  }
};

const styles = StyleSheet.create({
  emptyBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  emptySketch: {
    backgroundColor: '#111827',
    borderColor: '#2a2f3a',
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  wrapper: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderColor: '#2a2f3a',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: spacing[2],
  },
});
