import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight, LinearTransition } from 'react-native-reanimated';

import { colors, radii, spacing } from '@/constants/theme';
import { STATUS_LABEL, type WardrobeStatus } from '@/domain/types';
import { useWardrobe } from '@/store/WardrobeContext';

const ZONES: WardrobeStatus[] = ['wishlist', 'on_order', 'owned'];

type Props = {
  value: WardrobeStatus;
  onChange: (status: WardrobeStatus) => void;
};

export function ZoneTabs({ value, onChange }: Props) {
  const { profile } = useWardrobe();
  return (
    <View style={styles.row}>
      {ZONES.map((zone) => {
        const active = zone === value;
        return (
          <Animated.View key={zone} layout={LinearTransition.duration(220)} style={{ flex: 1 }}>
            <Pressable
              onPress={() => onChange(zone)}
              style={[styles.tab, active && styles.tabActive]}>
              {active && !profile.reduceMotion ? (
                <Animated.View entering={FadeInRight.duration(280)} style={styles.glow} />
              ) : null}
              <Text style={[styles.text, active && styles.textActive]}>{STATUS_LABEL[zone]}</Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.creamDeep,
    borderRadius: radii.pill,
    padding: 4,
    gap: 4,
  },
  tab: {
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    overflow: 'hidden',
  },
  tabActive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.carmine,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(196, 92, 106, 0.08)',
  },
  text: {
    fontSize: 13,
    color: colors.inkMuted,
    fontWeight: '500',
  },
  textActive: {
    color: colors.carmine,
    fontWeight: '700',
  },
});
