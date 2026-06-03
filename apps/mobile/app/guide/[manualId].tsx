import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { guideManuals, type GuideManualId } from '@/lib/guide-catalog';
import { guideManualPages } from '@/lib/guide-page-assets';
import { colors, spacing } from '@/src/theme';

const PAGE_ASPECT_RATIO = 840 / 1188;
const MIN_SCALE = 1;
const MAX_SCALE = 3.5;
const SCALE_STEP = 0.25;

type PanPoint = {
  x: number;
  y: number;
};

type TouchPoint = {
  pageX: number;
  pageY: number;
};

type GuideGestureState = {
  baseDistance: number | null;
  basePan: PanPoint;
  baseScale: number;
};

const isGuideManualId = (value: string | undefined): value is GuideManualId => {
  return value === 'leica-station' || value === 'leica-ls10';
};

export default function GuideManualScreen() {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const params = useLocalSearchParams<{ manualId: string }>();
  const manualId = Array.isArray(params.manualId) ? params.manualId[0] : params.manualId;
  const [pageIndex, setPageIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<PanPoint>({ x: 0, y: 0 });
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  const gestureRef = useRef<GuideGestureState | null>(null);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    setPageIndex(0);
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [manualId]);

  if (!isGuideManualId(manualId)) {
    return (
      <>
        <Stack.Screen options={{ title: 'Guías' }} />
        <View style={[styles.emptyContent, { paddingBottom: insets.bottom + spacing[4] }]}>
          <Text style={styles.emptyTitle}>Guía no encontrada</Text>
        </View>
      </>
    );
  }

  const manual = guideManuals.find((item) => item.id === manualId);
  const pages = guideManualPages[manualId];
  const currentPage = pages[pageIndex];
  const viewerWidth = Math.min(width - spacing[3] * 2, 720);
  const viewerHeight = Math.max(360, Math.min(height - insets.top - insets.bottom - 230, 640));
  const pageWidth = Math.min(viewerWidth, viewerHeight * PAGE_ASPECT_RATIO);
  const pageHeight = pageWidth / PAGE_ASPECT_RATIO;

  const clampViewerPan = (nextPan: PanPoint, nextScale = scaleRef.current) => {
    return clampPan(nextPan, {
      contentHeight: pageHeight,
      contentWidth: pageWidth,
      scale: nextScale,
      viewportHeight: viewerHeight,
      viewportWidth: viewerWidth
    });
  };

  const setScaleWithClamp = (nextScale: number) => {
    const clampedScale = clampScale(nextScale);
    setScale(clampedScale);
    setPan((current) => clampViewerPan(current, clampedScale));
  };

  const zoomIn = () => {
    setScaleWithClamp(scaleRef.current + SCALE_STEP);
  };

  const zoomOut = () => {
    setScaleWithClamp(scaleRef.current - SCALE_STEP);
  };

  const resetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const goToPage = (nextPageIndex: number) => {
    setPageIndex(Math.min(Math.max(nextPageIndex, 0), pages.length - 1));
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (_event, gestureState) => gestureState.numberActiveTouches >= 2,
        onStartShouldSetPanResponderCapture: (_event, gestureState) => gestureState.numberActiveTouches >= 2,
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          return gestureState.numberActiveTouches >= 2 || Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
        },
        onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
          return gestureState.numberActiveTouches >= 2 || Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
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
            setPan(clampViewerPan(gesture.basePan, nextScale));
            return;
          }

          const nextPan = {
            x: gesture.basePan.x + gestureState.dx,
            y: gesture.basePan.y + gestureState.dy
          };
          setPan(clampViewerPan(nextPan));
        },
        onPanResponderRelease: () => {
          gestureRef.current = null;
        },
        onPanResponderTerminate: () => {
          gestureRef.current = null;
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => false
      }),
    [pageHeight, pageWidth, viewerHeight, viewerWidth]
  );

  return (
    <>
      <Stack.Screen options={{ title: manual?.title ?? 'Guías' }} />
      <View style={[styles.container, { paddingBottom: insets.bottom + spacing[3] }]}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>{manual?.tag}</Text>
            <Text numberOfLines={2} style={styles.heroTitle}>{manual?.title}</Text>
          </View>
          <Text style={styles.pageCounter}>{pageIndex + 1} / {pages.length}</Text>
        </View>

        <View
          collapsable={false}
          style={[styles.viewer, { height: viewerHeight, width: viewerWidth }]}
          {...panResponder.panHandlers}
        >
          <View
            style={[
              styles.pageMove,
              {
                height: pageHeight,
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
                width: pageWidth
              }
            ]}
          >
            <Image
              resizeMode="contain"
              source={currentPage}
              style={[
                styles.pageImage,
                {
                  height: pageHeight,
                  transform: [{ scale }],
                  width: pageWidth
                }
              ]}
            />
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable
            disabled={pageIndex === 0}
            onPress={() => goToPage(pageIndex - 1)}
            style={({ pressed }) => [styles.iconButton, pageIndex === 0 && styles.disabledButton, pressed ? styles.pressedButton : null]}
          >
            <MaterialIcons color={colors.textPrimary} name="chevron-left" size={26} />
          </Pressable>
          <View style={styles.zoomGroup}>
            <Pressable
              disabled={scale <= MIN_SCALE}
              onPress={zoomOut}
              style={({ pressed }) => [styles.iconButton, scale <= MIN_SCALE && styles.disabledButton, pressed ? styles.pressedButton : null]}
            >
              <MaterialIcons color={colors.textPrimary} name="remove" size={23} />
            </Pressable>
            <Pressable onPress={resetZoom} style={({ pressed }) => [styles.zoomValueButton, pressed ? styles.pressedButton : null]}>
              <Text style={styles.zoomValue}>{Math.round(scale * 100)}%</Text>
            </Pressable>
            <Pressable
              disabled={scale >= MAX_SCALE}
              onPress={zoomIn}
              style={({ pressed }) => [styles.iconButton, scale >= MAX_SCALE && styles.disabledButton, pressed ? styles.pressedButton : null]}
            >
              <MaterialIcons color={colors.textPrimary} name="add" size={23} />
            </Pressable>
          </View>
          <Pressable
            disabled={pageIndex === pages.length - 1}
            onPress={() => goToPage(pageIndex + 1)}
            style={({ pressed }) => [styles.iconButton, pageIndex === pages.length - 1 && styles.disabledButton, pressed ? styles.pressedButton : null]}
          >
            <MaterialIcons color={colors.textPrimary} name="chevron-right" size={26} />
          </Pressable>
        </View>
      </View>
    </>
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

const clampPan = (
  point: PanPoint,
  {
    contentHeight,
    contentWidth,
    scale,
    viewportHeight,
    viewportWidth
  }: {
    contentHeight: number;
    contentWidth: number;
    scale: number;
    viewportHeight: number;
    viewportWidth: number;
  }
) => {
  const maxX = Math.max(0, (contentWidth * scale - viewportWidth) / 2);
  const maxY = Math.max(0, (contentHeight * scale - viewportHeight) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, point.x)),
    y: Math.min(maxY, Math.max(-maxY, point.y))
  };
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing[2],
    padding: spacing[3],
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'space-between',
  },
  disabledButton: {
    opacity: 0.38,
  },
  emptyContent: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing[4],
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  eyebrow: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'space-between',
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#151922',
    borderColor: '#334155',
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 48,
  },
  pageCounter: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '900',
  },
  pageImage: {
    backgroundColor: '#ffffff',
  },
  pageMove: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedButton: {
    opacity: 0.72,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  viewer: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#080b10',
    borderColor: '#2a2f3a',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  zoomGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1],
  },
  zoomValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  zoomValueButton: {
    alignItems: 'center',
    backgroundColor: '#151922',
    borderColor: '#334155',
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: spacing[1],
  },
});
