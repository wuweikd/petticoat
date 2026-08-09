import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii } from '@/constants/theme';
import { resolveMediaUri } from '@/lib/api';

type Props = {
  uri?: string | null;
  height?: number;
  style?: StyleProp<ViewStyle | ImageStyle>;
  placeholderLabel?: string;
};

export function PostCover({
  uri,
  height = 180,
  style,
  placeholderLabel = '暂无封面',
}: Props) {
  const src = resolveMediaUri(uri);
  if (!src) {
    return (
      <View style={[styles.ph, { height }, style]}>
        <Text style={styles.phText}>{placeholderLabel}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: src }}
      style={[styles.img, { height }, style as StyleProp<ImageStyle>]}
      resizeMode="cover"
      accessibilityLabel="帖子封面"
    />
  );
}

const styles = StyleSheet.create({
  img: {
    width: '100%',
    backgroundColor: colors.creamDeep,
    borderRadius: radii.md,
  },
  ph: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.creamDeep,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  phText: { color: colors.inkMuted, fontSize: 13, fontWeight: '600' },
});
