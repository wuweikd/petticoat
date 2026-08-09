import type { ImageSourcePropType } from 'react-native';

import type { BaseColor, Cut } from '@/domain/types';

/** AI 占位图库：后续可换成统一姿势的透明底正式资源 */
export const DOLL_BASE_SOURCE: ImageSourcePropType = require('../assets/doll/doll-base.png');

type DollKey =
  | 'jsk-black'
  | 'jsk-pink'
  | 'jsk-yellow'
  | 'op-navy'
  | 'blouse-white'
  | 'blouse-black'
  | 'blouse-navy'
  | 'blouse-ivory'
  | 'cardigan-pink'
  | 'coat-camel'
  | 'cape-burgundy'
  | 'headdress-pink'
  | 'shoes-black'
  | 'pannier-white'
  | 'bag-natural';

const DOLL_PACK: Record<DollKey, ImageSourcePropType> = {
  'jsk-black': require('../assets/doll/doll-jsk-black.png'),
  'jsk-pink': require('../assets/doll/doll-jsk-pink.png'),
  'jsk-yellow': require('../assets/doll/doll-jsk-yellow.png'),
  'op-navy': require('../assets/doll/doll-op-navy.png'),
  'blouse-white': require('../assets/doll/doll-blouse-white.png'),
  'blouse-black': require('../assets/doll/doll-blouse-black.png'),
  'blouse-navy': require('../assets/doll/doll-blouse-navy.png'),
  'blouse-ivory': require('../assets/doll/doll-blouse-ivory.png'),
  'cardigan-pink': require('../assets/doll/doll-cardigan-pink.png'),
  'coat-camel': require('../assets/doll/doll-coat-camel.png'),
  'cape-burgundy': require('../assets/doll/doll-cape-burgundy.png'),
  'headdress-pink': require('../assets/doll/doll-headdress-pink.png'),
  'shoes-black': require('../assets/doll/doll-shoes-black.png'),
  'pannier-white': require('../assets/doll/doll-pannier-white.png'),
  'bag-natural': require('../assets/doll/doll-bag-natural.png'),
};

function colorBucket(
  baseColor?: string | null,
  colorName?: string | null,
): 'black' | 'white' | 'pink' | 'yellow' | 'blue' | 'red' | 'brown' | 'other' {
  const name = `${baseColor ?? ''} ${colorName ?? ''}`.toLowerCase();
  if (/black|midnight|patent/.test(name)) return 'black';
  if (/white|ivory|cream|natural|organza/.test(name)) return 'white';
  if (/pink|rose|baby/.test(name)) return 'pink';
  if (/yellow|mimosa|gold/.test(name)) return 'yellow';
  if (/blue|navy|sax/.test(name)) return 'blue';
  if (/red|wine|burgundy/.test(name)) return 'red';
  if (/brown|camel/.test(name)) return 'brown';
  switch (baseColor) {
    case 'black':
      return 'black';
    case 'white':
      return 'white';
    case 'pink':
      return 'pink';
    case 'yellow':
      return 'yellow';
    case 'blue':
      return 'blue';
    case 'red':
      return 'red';
    case 'brown':
      return 'brown';
    default:
      return 'other';
  }
}

/** 按裁式 + 颜色挑最接近的占位图层 */
export function resolveDollLayerSource(input: {
  cut?: Cut | string | null;
  baseColor?: BaseColor | string | null;
  colorName?: string | null;
}): ImageSourcePropType | null {
  const cut = input.cut ?? '';
  const bucket = colorBucket(input.baseColor, input.colorName);

  switch (cut) {
    case 'JSK':
      if (bucket === 'pink') return DOLL_PACK['jsk-pink'];
      if (bucket === 'yellow') return DOLL_PACK['jsk-yellow'];
      return DOLL_PACK['jsk-black'];
    case 'OP':
      return DOLL_PACK['op-navy'];
    case 'SK':
      if (bucket === 'pink') return DOLL_PACK['jsk-pink'];
      return DOLL_PACK['jsk-black'];
    case 'Blouse':
      if (bucket === 'black') return DOLL_PACK['blouse-black'];
      if (bucket === 'blue') return DOLL_PACK['blouse-navy'];
      if (bucket === 'white' && /ivory|cream/i.test(input.colorName ?? '')) {
        return DOLL_PACK['blouse-ivory'];
      }
      return DOLL_PACK['blouse-white'];
    case 'Cardigan':
      return DOLL_PACK['cardigan-pink'];
    case 'Coat':
      return DOLL_PACK['coat-camel'];
    case 'Cape':
      return DOLL_PACK['cape-burgundy'];
    case 'Headdress':
    case 'Hairbow':
      return DOLL_PACK['headdress-pink'];
    case 'Shoes':
    case 'Socks':
      return DOLL_PACK['shoes-black'];
    case 'Pannier':
      return DOLL_PACK['pannier-white'];
    case 'Bag':
      return DOLL_PACK['bag-natural'];
    case 'Wristcuff':
      return DOLL_PACK['blouse-white'];
    default:
      return null;
  }
}

export function listDollPackKeys(): DollKey[] {
  return Object.keys(DOLL_PACK) as DollKey[];
}
