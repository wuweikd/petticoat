import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useWardrobe } from '@/store/WardrobeContext';

type Props = {
  image: ImageSourcePropType;
  title: string;
  subtitle?: string;
  ctaLabel: string;
  onPress: () => void;
};

export function EmptyState({ image, title, subtitle, ctaLabel, onPress }: Props) {
  const { profile } = useWardrobe();
  const motion = !profile.reduceMotion;

  return (
    <View style={styles.wrap}>
      <Animated.View entering={motion ? ZoomIn.duration(500) : undefined}>
        <Image source={image} style={styles.image} resizeMode="contain" />
      </Animated.View>
      <Animated.View entering={motion ? FadeIn.delay(120).duration(400) : undefined}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </Animated.View>
      <Animated.View entering={motion ? FadeIn.delay(220).duration(400) : undefined}>
        <Pressable style={styles.cta} onPress={onPress}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.cream,
  },
  image: {
    width: 240,
    height: 240,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  cta: {
    backgroundColor: colors.carmine,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.pill,
  },
  ctaText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
