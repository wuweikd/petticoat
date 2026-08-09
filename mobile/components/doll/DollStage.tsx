import { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import {
  DOLL_HOTSPOTS,
  DOLL_LAYER_ORDER,
  type DollLayerView,
} from '@/domain/doll';
import { DOLL_BASE_SOURCE, resolveDollLayerSource } from '@/domain/dollAssets';
import { CATEGORY_LABEL, type ItemCategory } from '@/domain/types';
import { resolveMediaUri } from '@/lib/api';

type Props = {
  layers: DollLayerView[];
  reduceMotion?: boolean;
  selectedCategory?: ItemCategory | null;
  onPressZone: (category: ItemCategory) => void;
};

export type DollStageHandle = {
  hitTest: (pageX: number, pageY: number) => ItemCategory | null;
  measureInWindow: (
    cb: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

const STAGE_W = 300;
const STAGE_H = 440;

function layerSource(layer: DollLayerView): ImageSourcePropType | { uri: string } | null {
  const remote = resolveMediaUri(layer.imageUri);
  if (remote) return { uri: remote };
  return resolveDollLayerSource({
    cut: layer.cut,
    baseColor: layer.baseColor,
    colorName: layer.colorName,
  });
}

export const DollStage = forwardRef<DollStageHandle, Props>(function DollStage(
  { layers, selectedCategory, onPressZone },
  ref,
) {
  const stageRef = useRef<View>(null);
  const layoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(
    null,
  );

  const refreshMeasure = () => {
    stageRef.current?.measureInWindow((x, y, width, height) => {
      layoutRef.current = { x, y, width, height };
    });
  };

  useImperativeHandle(ref, () => ({
    hitTest(pageX: number, pageY: number) {
      const layout = layoutRef.current;
      if (!layout || layout.width <= 0 || layout.height <= 0) return null;
      const lx = (pageX - layout.x) / layout.width;
      const ly = (pageY - layout.y) / layout.height;
      if (lx < 0 || ly < 0 || lx > 1 || ly > 1) return null;
      const ordered = [...DOLL_HOTSPOTS].reverse();
      for (const h of ordered) {
        if (
          lx >= h.left &&
          lx <= h.left + h.width &&
          ly >= h.top &&
          ly <= h.top + h.height
        ) {
          return h.category;
        }
      }
      return null;
    },
    measureInWindow(cb) {
      stageRef.current?.measureInWindow((x, y, width, height) => {
        layoutRef.current = { x, y, width, height };
        cb(x, y, width, height);
      });
    },
  }));

  const byCat = new Map<ItemCategory, DollLayerView[]>();
  for (const layer of layers) {
    const list = byCat.get(layer.category) ?? [];
    list.push(layer);
    byCat.set(layer.category, list);
  }

  const wornLabels = DOLL_LAYER_ORDER.flatMap((cat) => {
    const filled = byCat.get(cat) ?? [];
    if (!filled.length) return [];
    return [`${CATEGORY_LABEL[cat]} ${filled[0].shortLabel}`];
  });

  return (
    <View style={styles.wrap}>
      <View
        ref={stageRef}
        collapsable={false}
        style={[styles.stage, { width: STAGE_W, height: STAGE_H }]}
        onLayout={refreshMeasure}>
        <Image source={DOLL_BASE_SOURCE} style={styles.base} resizeMode="cover" />

        {/* 按品类顺序叠穿：全身对齐资产 + 热区开窗，接近换装游戏 */}
        {DOLL_LAYER_ORDER.map((cat) => {
          const filled = byCat.get(cat) ?? [];
          if (!filled.length) return null;
          const primary = filled[0];
          const source = layerSource(primary);
          if (!source) return null;
          const hotspot = DOLL_HOTSPOTS.find((h) => h.category === cat);
          if (!hotspot) return null;

          return (
            <View
              key={`${cat}-${primary.variantId}`}
              pointerEvents="none"
              style={[
                styles.layerWindow,
                {
                  top: hotspot.top * STAGE_H,
                  left: hotspot.left * STAGE_W,
                  width: hotspot.width * STAGE_W,
                  height: hotspot.height * STAGE_H,
                },
                primary.notArrived && styles.layerNotArrived,
              ]}>
              <Image
                source={source}
                style={{
                  position: 'absolute',
                  width: STAGE_W,
                  height: STAGE_H,
                  left: -hotspot.left * STAGE_W,
                  top: -hotspot.top * STAGE_H,
                }}
                resizeMode="cover"
              />
            </View>
          );
        })}

        {/* 主视觉：优先裙子，否则外套/上装，半透明全身叠一层 */}
        {(() => {
          const heroCat =
            (['skirt', 'outer', 'top'] as ItemCategory[]).find(
              (c) => (byCat.get(c) ?? []).length > 0,
            ) ?? null;
          if (!heroCat) return null;
          const primary = byCat.get(heroCat)![0];
          const source = layerSource(primary);
          if (!source) return null;
          return (
            <Image
              source={source}
              pointerEvents="none"
              style={[styles.fullOverlay, primary.notArrived && { opacity: 0.4 }]}
              resizeMode="cover"
            />
          );
        })()}

        {DOLL_HOTSPOTS.map((h) => {
          const filled = (byCat.get(h.category) ?? []).length > 0;
          const selected = selectedCategory === h.category;
          return (
            <Pressable
              key={h.category}
              onPress={() => onPressZone(h.category)}
              style={[
                styles.hotspot,
                {
                  top: h.top * STAGE_H,
                  left: h.left * STAGE_W,
                  width: h.width * STAGE_W,
                  height: h.height * STAGE_H,
                },
                !filled && styles.hotspotEmpty,
                selected && styles.hotspotSelected,
              ]}>
              {!filled ? (
                <Text style={styles.hotspotHint}>{CATEGORY_LABEL[h.category]}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {wornLabels.length > 0 ? (
        <Text style={styles.worn} numberOfLines={3}>
          {wornLabels.join(' · ')}
        </Text>
      ) : (
        <Text style={styles.caption}>从托盘拖入或点分区选品，人偶会叠穿示意</Text>
      )}
      <Text style={styles.caption}>长按托盘拖入分区 · 图库为 AI 占位，可后续替换</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.md },
  stage: {
    backgroundColor: '#F7F1E8',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  base: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  layerWindow: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: radii.sm,
  },
  layerNotArrived: {
    borderWidth: 1.5,
    borderColor: colors.carmine,
    borderStyle: 'dashed',
  },
  fullOverlay: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    opacity: 0.55,
  },
  hotspot: {
    position: 'absolute',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotspotEmpty: {
    borderColor: 'rgba(196,92,106,0.35)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(247,241,232,0.2)',
  },
  hotspotSelected: {
    borderColor: colors.carmine,
    borderWidth: 2,
    backgroundColor: 'rgba(196,92,106,0.12)',
  },
  hotspotHint: {
    color: colors.carmine,
    fontSize: 11,
    fontWeight: '700',
  },
  worn: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  caption: {
    marginTop: 4,
    color: colors.inkMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
