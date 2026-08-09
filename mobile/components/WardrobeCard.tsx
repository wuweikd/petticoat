import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import {
  BASE_COLOR_LABEL,
  CUT_LABEL,
  STATUS_LABEL,
  type BaseColor,
  type Cut,
  type WardrobeStatus,
} from '@/domain/types';
import { resolveMediaUri } from '@/lib/api';

type Props = {
  itemName: string;
  brandName: string;
  colorName: string;
  cut: Cut | string;
  baseColor: BaseColor;
  status: WardrobeStatus;
  coverUri?: string | null;
  hasOpenBalance?: boolean;
  highlighted?: boolean;
  sourcePostId?: string | null;
  onSourcePress?: () => void;
  onPress: () => void;
};

const SWATCH: Record<BaseColor, string> = {
  black: '#2B2B2B',
  white: '#F5F5F5',
  red: '#C45C6A',
  pink: '#E8A0B0',
  blue: '#6B8CAE',
  green: '#6B8F71',
  purple: '#8B6B9E',
  brown: '#8B6914',
  yellow: '#E6C86E',
  multicolor: '#D4B56A',
  other: '#B8A99A',
};

export function WardrobeCard({
  itemName,
  brandName,
  colorName,
  cut,
  baseColor,
  status,
  coverUri,
  hasOpenBalance,
  highlighted,
  sourcePostId,
  onSourcePress,
  onPress,
}: Props) {
  const cover = resolveMediaUri(coverUri) || coverUri || null;
  return (
    <Pressable
      style={[styles.card, highlighted && styles.cardHighlight]}
      onPress={onPress}>
      <View style={[styles.swatch, { backgroundColor: SWATCH[baseColor] }]}>
        {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : null}
        <Text style={styles.swatchLabel}>
          {CUT_LABEL[cut as Cut] ?? cut} · {BASE_COLOR_LABEL[baseColor]}
        </Text>
        {hasOpenBalance ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>待尾款</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {itemName}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {brandName}
      </Text>
      <Text style={styles.status}>{STATUS_LABEL[status]}</Text>
      <Text style={styles.color} numberOfLines={1}>
        {colorName}
      </Text>
      {sourcePostId && onSourcePress ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onSourcePress();
          }}
          hitSlop={8}
          style={styles.sourceLink}>
          <Text style={styles.sourceLinkText}>来自帖子</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingBottom: spacing.sm,
  },
  cardHighlight: {
    borderColor: colors.carmine,
    borderWidth: 2,
  },
  sourceLink: {
    marginTop: 6,
    marginHorizontal: spacing.sm,
  },
  sourceLinkText: {
    color: colors.carmine,
    fontSize: 11,
    fontWeight: '700',
  },
  swatch: {
    height: 120,
    justifyContent: 'flex-end',
    padding: spacing.sm,
    overflow: 'hidden',
  },
  cover: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  swatchLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 1,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.carmine,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    zIndex: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  name: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  meta: {
    marginHorizontal: spacing.sm,
    marginTop: 2,
    fontSize: 12,
    color: colors.inkMuted,
  },
  status: {
    marginHorizontal: spacing.sm,
    marginTop: 4,
    fontSize: 11,
    color: colors.carmine,
  },
  color: {
    marginHorizontal: spacing.sm,
    fontSize: 11,
    color: colors.inkMuted,
  },
});
