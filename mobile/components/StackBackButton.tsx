import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/theme';

type Props = {
  fallbackHref?: string;
};

/** Stack 默认返回会显示「(tabs)」；统一成「返回」 */
export function StackBackButton({ fallbackHref = '/(tabs)' }: Props) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        try {
          if (router.canGoBack()) {
            router.back();
            return;
          }
        } catch {
          // fall through
        }
        router.replace(fallbackHref as never);
      }}
      hitSlop={20}
      accessibilityRole="button"
      accessibilityLabel="返回"
      style={styles.btn}>
      <ChevronLeft color={colors.ink} size={28} strokeWidth={2.2} />
      <Text style={styles.label}>返回</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginLeft: -4,
    minWidth: 72,
  },
  label: { color: colors.ink, fontSize: 16, marginLeft: -4 },
});
