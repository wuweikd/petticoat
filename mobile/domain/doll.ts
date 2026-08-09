import type { ItemCategory } from '@/domain/types';
import { colors } from '@/constants/theme';

/** 绘制顺序：先底层后上层 */
export const DOLL_LAYER_ORDER: ItemCategory[] = [
  'footwear',
  'foundation',
  'skirt',
  'top',
  'outer',
  'accessory',
];

export const DOLL_ZONE_COLOR: Record<ItemCategory, string> = {
  footwear: '#8B7355',
  foundation: '#E8D4C4',
  skirt: colors.carmine,
  top: '#C45C6A',
  outer: '#6B8CAE',
  accessory: '#D4B56A',
};

export type DollHotspotLayout = {
  category: ItemCategory;
  /** 相对舞台百分比 0–1 */
  top: number;
  left: number;
  width: number;
  height: number;
  labelSide?: 'left' | 'right' | 'center';
};

/** 人台热区（主坑） */
export const DOLL_HOTSPOTS: DollHotspotLayout[] = [
  { category: 'accessory', top: 0.02, left: 0.28, width: 0.44, height: 0.12, labelSide: 'center' },
  { category: 'outer', top: 0.14, left: 0.12, width: 0.76, height: 0.16, labelSide: 'right' },
  { category: 'top', top: 0.28, left: 0.22, width: 0.56, height: 0.16, labelSide: 'left' },
  { category: 'skirt', top: 0.44, left: 0.18, width: 0.64, height: 0.28, labelSide: 'center' },
  { category: 'foundation', top: 0.52, left: 0.3, width: 0.4, height: 0.12, labelSide: 'right' },
  { category: 'footwear', top: 0.78, left: 0.28, width: 0.44, height: 0.16, labelSide: 'center' },
];

export type DollLayerView = {
  category: ItemCategory;
  kind: 'main' | 'extra';
  variantId: string;
  label: string;
  shortLabel: string;
  notArrived: boolean;
  statusLabel: string;
  colorName?: string;
  baseColor?: string;
  cut?: string;
  /** 用户实拍 / 目录图；优先于 AI 占位图库 */
  imageUri?: string | null;
};
