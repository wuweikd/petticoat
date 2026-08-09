/** Domain types aligned with CONTEXT.md / ADR-0003 */

export type ItemCategory =
  | 'skirt'
  | 'top'
  | 'outer'
  | 'accessory'
  | 'foundation'
  | 'footwear';

export type Cut =
  | 'JSK'
  | 'OP'
  | 'SK'
  | 'Blouse'
  | 'Cardigan'
  | 'Coat'
  | 'Cape'
  | 'Headdress'
  | 'Hairbow'
  | 'Wristcuff'
  | 'Bag'
  | 'Pannier'
  | 'Shoes'
  | 'Socks'
  | 'Other';

export type BaseColor =
  | 'black'
  | 'white'
  | 'red'
  | 'pink'
  | 'blue'
  | 'green'
  | 'purple'
  | 'brown'
  | 'yellow'
  | 'multicolor'
  | 'other';

export type WardrobeStatus = 'wishlist' | 'on_order' | 'owned';

export type Substyle = 'sweet' | 'gothic' | 'classic' | 'punk' | 'other';

export interface Brand {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  brandId: string;
  name: string;
  category: ItemCategory;
  createdByUserId: string;
}

export interface Variant {
  id: string;
  itemId: string;
  colorName: string;
  baseColor: BaseColor;
  cut: Cut;
  catalogImageUri?: string;
}

export interface PreorderRecord {
  id: string;
  wardrobeEntryId: string;
  depositAmountCny: number;
  depositPaidAt?: string;
  balanceAmountCny: number;
  balanceDueAt: string;
  balancePaid: boolean;
  balancePaidAt?: string;
  expectedArrivalAt?: string;
  cancelled: boolean;
  archived: boolean;
}

export type WardrobeVisibility = 'private' | 'followers' | 'public';

export interface WardrobeEntry {
  id: string;
  userId: string;
  variantId: string;
  status: WardrobeStatus;
  size?: string;
  quantity: number;
  private: boolean;
  note?: string;
  userImageUris: string[];
  hidePreorder?: boolean;
  sourcePostId?: string | null;
}

export interface CalendarReminder {
  id: string;
  userId: string;
  title: string;
  at: string;
  kind: 'manual_release' | 'other';
}

export interface UserProfile {
  id: string;
  phone?: string;
  nickname: string;
  bio?: string;
  avatarUri?: string;
  yearsInLolita?: number;
  preferredSubstyles: Substyle[];
  favoriteBrandIds: string[];
  reduceMotion: boolean;
  wardrobeVisibility?: WardrobeVisibility;
}

export const CUTS_BY_CATEGORY: Record<ItemCategory, Cut[]> = {
  skirt: ['JSK', 'OP', 'SK'],
  top: ['Blouse', 'Cardigan'],
  outer: ['Coat', 'Cape'],
  accessory: ['Headdress', 'Hairbow', 'Wristcuff', 'Bag'],
  foundation: ['Pannier'],
  footwear: ['Shoes', 'Socks'],
};

export const BASE_COLOR_LABEL: Record<BaseColor, string> = {
  black: '黑',
  white: '白',
  red: '红',
  pink: '粉',
  blue: '蓝',
  green: '绿',
  purple: '紫',
  brown: '棕',
  yellow: '黄',
  multicolor: '多色',
  other: '其他',
};

export const STATUS_LABEL: Record<WardrobeStatus, string> = {
  wishlist: '想要',
  on_order: '预订中',
  owned: '已拥有',
};

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  skirt: '裙子',
  top: '上装',
  outer: '外套',
  accessory: '配件',
  foundation: '底层',
  footwear: '鞋袜',
};

export const CUT_LABEL: Record<Cut, string> = {
  JSK: '背带裙（JSK）',
  OP: '连衣裙（OP）',
  SK: '半裙（SK）',
  Blouse: '衬衫',
  Cardigan: '开衫',
  Coat: '大衣',
  Cape: '披肩',
  Headdress: '头饰',
  Hairbow: '发带',
  Wristcuff: '手袖',
  Bag: '包',
  Pannier: '裙撑',
  Shoes: '鞋',
  Socks: '袜',
  Other: '其他',
};

export const SUBSTYLE_LABEL: Record<Substyle, string> = {
  sweet: '甜美',
  gothic: '哥特',
  classic: '古典',
  punk: '朋克',
  other: '其他',
};

export const VISIBILITY_LABEL: Record<WardrobeVisibility, string> = {
  private: '仅自己',
  followers: '关注者',
  public: '公开',
};
