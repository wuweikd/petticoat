import { Image, StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors, radii, spacing } from '@/constants/theme';
import { resolveDollLayerSource } from '@/domain/dollAssets';
import { CATEGORY_LABEL, STATUS_LABEL, type ItemCategory, type WardrobeStatus } from '@/domain/types';
import { resolveMediaUri } from '@/lib/api';

export type TrayChipPick = {
  variantId: string;
  shortLabel: string;
  category: ItemCategory;
  status: WardrobeStatus;
  cut?: string;
  baseColor?: string;
  colorName?: string;
  imageUri?: string | null;
};

type Props = {
  pick: TrayChipPick;
  onPress: () => void;
  onDragBegin?: () => void;
  onDragEnd?: () => void;
  /** 松手时回传窗口坐标，供 DollStage.hitTest */
  onDropAt?: (pageX: number, pageY: number) => void;
};

export function DollTrayChip({ pick, onPress, onDragBegin, onDragEnd, onDropAt }: Props) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const dragging = useSharedValue(0);

  const begin = () => {
    onDragBegin?.();
  };

  const finish = () => {
    onDragEnd?.();
  };

  const endDrag = (pageX: number, pageY: number) => {
    onDropAt?.(pageX, pageY);
  };

  const pan = Gesture.Pan()
    .activateAfterLongPress(320)
    .onStart(() => {
      dragging.value = 1;
      scale.value = withSpring(1.06);
      runOnJS(begin)();
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(endDrag)(e.absoluteX, e.absoluteY);
    })
    .onFinalize(() => {
      dragging.value = 0;
      tx.value = withSpring(0);
      ty.value = withSpring(0);
      scale.value = withSpring(1);
      runOnJS(finish)();
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onPress)();
  });

  const composed = Gesture.Exclusive(pan, tap);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    zIndex: dragging.value ? 20 : 1,
    elevation: dragging.value ? 8 : 0,
    borderColor: dragging.value ? colors.carmine : colors.border,
  }));

  const remote = resolveMediaUri(pick.imageUri);
  const thumb =
    (remote ? ({ uri: remote } as const) : null) ||
    resolveDollLayerSource({
      cut: pick.cut,
      baseColor: pick.baseColor,
      colorName: pick.colorName,
    });

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.card, animStyle]}>
        {thumb ? (
          <Image source={thumb} style={styles.thumb} resizeMode="cover" />
        ) : (
          <Text style={styles.cat}>{CATEGORY_LABEL[pick.category]}</Text>
        )}
        <Text style={styles.cat}>{CATEGORY_LABEL[pick.category]}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {pick.shortLabel}
        </Text>
        <Text style={styles.meta}>{STATUS_LABEL[pick.status]}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 120,
    marginRight: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: '100%',
    height: 88,
    borderRadius: radii.sm,
    marginBottom: 6,
    backgroundColor: '#F7F1E8',
  },
  cat: { fontSize: 11, color: colors.carmine, fontWeight: '700', marginBottom: 4 },
  title: { fontSize: 13, color: colors.ink, fontWeight: '600', minHeight: 36 },
  meta: { marginTop: 6, fontSize: 11, color: colors.inkMuted },
});
