import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
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

type PanPoint = {
  x: number;
  y: number;
};

type TouchPoint = {
  pageX: number;
  pageY: number;
};

type PrismGestureState = {
  baseDistance: number | null;
  basePan: PanPoint;
  baseScale: number;
};

const VIEWBOX_SIZE = 320;
const CENTER = VIEWBOX_SIZE / 2;
const MAX_RADIUS = 124;
const PRISM_TOUCH_RADIUS = 34;
const SELECTED_PRISM_TOUCH_RADIUS = 46;
const MIN_SCALE = 1;
const MAX_SCALE = 5;
const SCALE_STEP = 0.35;
const SELECTED_FOCUS_SCALE = 2.25;
const PAN_EDGE_PADDING_RATIO = 0.35;

export function PrismSketch({ items, onSelect, selectedCode }: PrismSketchProps) {
  const { width } = useWindowDimensions();
  const chartSize = Math.min(width - spacing[3] * 4, 340);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<PanPoint>({ x: 0, y: 0 });
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  const gestureRef = useRef<PrismGestureState | null>(null);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

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

  const selectedPlotItem = plotItems.find((item) => item.code === selectedCode) ?? null;

  const clampSketchPan = (nextPan: PanPoint, nextScale = scaleRef.current) => {
    return clampPan(nextPan, chartSize, nextScale);
  };

  const getFocusedPan = (item: typeof selectedPlotItem, nextScale: number) => {
    if (!item) {
      return clampSketchPan(panRef.current, nextScale);
    }

    const centerPx = chartSize / 2;
    const itemPx = {
      x: (item.x / VIEWBOX_SIZE) * chartSize,
      y: (item.y / VIEWBOX_SIZE) * chartSize
    };

    return clampSketchPan(
      {
        x: -(itemPx.x - centerPx) * nextScale,
        y: -(itemPx.y - centerPx) * nextScale
      },
      nextScale
    );
  };

  const setScaleWithFocus = (nextScale: number) => {
    const clampedScale = clampScale(nextScale);
    setScale(clampedScale);
    setPan(selectedPlotItem ? getFocusedPan(selectedPlotItem, clampedScale) : clampSketchPan(panRef.current, clampedScale));
  };

  const zoomIn = () => {
    const nextScale = selectedPlotItem
      ? Math.max(scaleRef.current + SCALE_STEP, SELECTED_FOCUS_SCALE)
      : scaleRef.current + SCALE_STEP;

    setScaleWithFocus(nextScale);
  };

  const zoomOut = () => {
    setScaleWithFocus(scaleRef.current - SCALE_STEP);
  };

  const resetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!selectedPlotItem || scaleRef.current <= 1) {
      return;
    }

    setPan(getFocusedPan(selectedPlotItem, scaleRef.current));
  }, [selectedPlotItem?.code]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (_event, gestureState) => gestureState.numberActiveTouches >= 2,
        onStartShouldSetPanResponderCapture: (_event, gestureState) => gestureState.numberActiveTouches >= 2,
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          return (
            gestureState.numberActiveTouches >= 2 ||
            (scaleRef.current > 1 && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3))
          );
        },
        onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
          return (
            gestureState.numberActiveTouches >= 2 ||
            (scaleRef.current > 1 && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3))
          );
        },
        onPanResponderGrant: (event) => {
          const touches = (event.nativeEvent.touches as unknown as TouchPoint[]) ?? [];

          gestureRef.current = {
            baseDistance: getTouchesDistance(touches),
            basePan: panRef.current,
            baseScale: scaleRef.current
          };
        },
        onPanResponderMove: (event, gestureState) => {
          const gesture = gestureRef.current;

          if (!gesture) {
            return;
          }

          const touches = (event.nativeEvent.touches as unknown as TouchPoint[]) ?? [];
          const distance = getTouchesDistance(touches);

          if (distance && gesture.baseDistance) {
            const nextScale = clampScale(gesture.baseScale * (distance / gesture.baseDistance));
            setScale(nextScale);
            setPan(clampSketchPan(gesture.basePan, nextScale));
            return;
          }

          setPan(
            clampSketchPan({
              x: gesture.basePan.x + gestureState.dx,
              y: gesture.basePan.y + gestureState.dy
            })
          );
        },
        onPanResponderRelease: () => {
          gestureRef.current = null;
        },
        onPanResponderTerminate: () => {
          gestureRef.current = null;
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true
      }),
    [chartSize, selectedPlotItem?.code]
  );

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
      <View style={styles.zoomControls}>
        <Pressable
          disabled={scale <= MIN_SCALE}
          onPress={zoomOut}
          style={({ pressed }) => [styles.zoomButton, scale <= MIN_SCALE && styles.zoomButtonDisabled, pressed ? styles.zoomButtonPressed : null]}
        >
          <MaterialIcons color={colors.textPrimary} name="remove" size={22} />
        </Pressable>
        <Pressable onPress={resetZoom} style={({ pressed }) => [styles.zoomValueButton, pressed ? styles.zoomButtonPressed : null]}>
          <Text style={styles.zoomButtonText}>{Math.round(scale * 100)}%</Text>
        </Pressable>
        <Pressable
          disabled={scale >= MAX_SCALE}
          onPress={zoomIn}
          style={({ pressed }) => [styles.zoomButton, scale >= MAX_SCALE && styles.zoomButtonDisabled, pressed ? styles.zoomButtonPressed : null]}
        >
          <MaterialIcons color={colors.textPrimary} name="add" size={22} />
        </Pressable>
      </View>

      <View
        collapsable={false}
        style={[styles.viewport, { height: chartSize, width: chartSize }]}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.canvasMove,
            {
              height: chartSize,
              transform: [{ translateX: pan.x }, { translateY: pan.y }],
              width: chartSize
            }
          ]}
        >
          <View
            style={[
              styles.canvasTransform,
              {
                height: chartSize,
                transform: [{ scale }],
                width: chartSize
              }
            ]}
          >
            <Svg
              height={chartSize}
              style={styles.canvas}
              viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
              width={chartSize}
            >
              <Circle cx={CENTER} cy={CENTER} fill="#111827" r={150} />
              {[0.25, 0.5, 0.75, 1].map((ratio) => (
                <G key={ratio}>
                  <Circle
                    cx={CENTER}
                    cy={CENTER}
                    fill="none"
                    r={MAX_RADIUS * ratio}
                    stroke="rgba(148, 163, 184, 0.22)"
                    strokeDasharray={ratio === 1 ? undefined : '4 6'}
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
                const hitRadius = Math.min(
                  Math.max(PRISM_TOUCH_RADIUS, Math.round(PRISM_TOUCH_RADIUS / Math.max(scale, 1))),
                  56
                );
                const selectedHitRadius = Math.max(hitRadius + 10, SELECTED_PRISM_TOUCH_RADIUS);

                return (
                  <G key={`${item.code}-${item.angle}-${item.distanceM}`} onPress={() => onSelect(item.code)}>
                    <Circle
                      cx={item.x}
                      cy={item.y}
                      fill="rgba(255, 255, 255, 0.01)"
                      r={selected ? selectedHitRadius : hitRadius}
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
        </View>
      </View>
    </View>
  );
}

const getTouchesDistance = (touches: TouchPoint[]) => {
  if (touches.length < 2) {
    return null;
  }

  return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
};

const clampScale = (value: number) => {
  return Number(Math.min(MAX_SCALE, Math.max(MIN_SCALE, value)).toFixed(2));
};

const clampPan = (point: PanPoint, chartSize: number, scale: number) => {
  const edgePadding = scale > 1 ? chartSize * PAN_EDGE_PADDING_RATIO : 0;
  const maxPan = Math.max(0, (chartSize * scale - chartSize) / 2 + edgePadding);

  return {
    x: Math.min(maxPan, Math.max(-maxPan, point.x)),
    y: Math.min(maxPan, Math.max(-maxPan, point.y))
  };
};

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
  canvas: {
    alignSelf: 'center',
  },
  canvasMove: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasTransform: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  emptySketch: {
    backgroundColor: '#111827',
    borderColor: '#2a2f3a',
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  viewport: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  wrapper: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderColor: '#2a2f3a',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: spacing[2],
  },
  zoomButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderColor: '#334155',
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 48,
  },
  zoomButtonDisabled: {
    opacity: 0.45,
  },
  zoomButtonPressed: {
    opacity: 0.75,
  },
  zoomButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  zoomControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  zoomValueButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderColor: '#334155',
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: spacing[1],
  },
});
