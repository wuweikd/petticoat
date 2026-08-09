import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EmptyState } from '@/components/EmptyState';
import { WardrobeCard } from '@/components/WardrobeCard';
import { ZoneTabs } from '@/components/ZoneTabs';
import { colors, spacing } from '@/constants/theme';
import { STATUS_LABEL, type WardrobeStatus } from '@/domain/types';
import { useAuth } from '@/store/AuthContext';
import { useWardrobe } from '@/store/WardrobeContext';

function isZone(v: string | undefined): v is WardrobeStatus {
  return v === 'wishlist' || v === 'on_order' || v === 'owned';
}

export default function WardrobeScreen() {
  const {
    entries,
    entriesByStatus,
    getVariant,
    getItem,
    getBrand,
    preorders,
    profile,
    signedIn,
  } = useWardrobe();
  const { requireLogin } = useAuth();
  const { tab, highlight } = useLocalSearchParams<{ tab?: string; highlight?: string }>();
  const [zone, setZone] = useState<WardrobeStatus>('owned');
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (isZone(tab)) setZone(tab);
  }, [tab]);

  useEffect(() => {
    if (highlight) {
      setHighlightId(highlight);
      const t = setTimeout(() => setHighlightId(null), 4000);
      return () => clearTimeout(t);
    }
  }, [highlight]);

  const zoneEntries = entriesByStatus(zone);

  const openBalanceIds = useMemo(() => {
    const set = new Set<string>();
    preorders.forEach((p) => {
      if (!p.cancelled && !p.archived && !p.balancePaid) set.add(p.wardrobeEntryId);
    });
    return set;
  }, [preorders]);

  const totallyEmpty = entries.length === 0;

  if (!signedIn) {
    return (
      <View style={styles.flex}>
        <EmptyState
          image={require('../../assets/illustrations/empty-wardrobe.png')}
          title="登录后同步衣橱"
          subtitle="游客可搜索全局目录；衣橱以云端为准，登录后即可查看与管理。"
          ctaLabel="去登录"
          onPress={() => requireLogin({ returnTo: '/(tabs)/wardrobe' })}
        />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ZoneTabs value={zone} onChange={setZone} />
      {totallyEmpty ? (
        <EmptyState
          image={require('../../assets/illustrations/empty-wardrobe.png')}
          title="衣橱还是空的"
          subtitle="先收藏第一件吧——搜索或新建品牌与变体。"
          ctaLabel="去录入"
          onPress={() => router.push('/wardrobe-add')}
        />
      ) : zoneEntries.length === 0 ? (
        <View style={styles.emptyZone}>
          <Text style={styles.emptyZoneTitle}>「{STATUS_LABEL[zone]}」还没有单品</Text>
          <Text style={styles.emptyZoneHint}>切换分区看看，或去录入一件。</Text>
        </View>
      ) : (
        <FlatList
          data={zoneEntries}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const variant = getVariant(item.variantId);
            const itemEntity = variant ? getItem(variant.itemId) : undefined;
            const brand = itemEntity ? getBrand(itemEntity.brandId) : undefined;
            if (!variant || !itemEntity || !brand) return null;
            const Card = (
              <WardrobeCard
                itemName={itemEntity.name}
                brandName={brand.name}
                colorName={variant.colorName}
                cut={variant.cut}
                baseColor={variant.baseColor}
                status={item.status}
                coverUri={item.userImageUris?.[0]}
                hasOpenBalance={openBalanceIds.has(item.id)}
                highlighted={highlightId === item.id}
                sourcePostId={item.sourcePostId}
                onSourcePress={
                  item.sourcePostId
                    ? () => router.push(`/post/${item.sourcePostId}` as never)
                    : undefined
                }
                onPress={() => router.push(`/entry/${item.id}`)}
              />
            );
            if (profile.reduceMotion) return Card;
            return (
              <Animated.View
                style={{ flex: 1 }}
                entering={FadeInUp.delay(Math.min(index, 8) * 40).duration(360)}>
                {Card}
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  list: { paddingHorizontal: 8, paddingBottom: 24 },
  emptyZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyZoneTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  emptyZoneHint: { marginTop: 8, color: colors.inkMuted },
});
