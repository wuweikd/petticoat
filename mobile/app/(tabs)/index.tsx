import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { PostCover } from '@/components/PostCover';
import { colors, radii, spacing } from '@/constants/theme';
import { api, formatErrorMessage, type FeedPost } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';

type Tab = 'following' | 'discover';
type TypeFilter = 'all' | 'outfit' | 'tutorial';

const TYPE_LABEL: Record<string, string> = {
  outfit: '穿搭',
  tutorial: '教程',
  brand_release: '上新',
  official: '资讯',
  encyclopedia: '百科',
};

const TYPE_CHIPS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'outfit', label: '穿搭' },
  { id: 'tutorial', label: '教程' },
];

export default function HomeFeedScreen() {
  const { requireLogin, user } = useAuth();
  const [tab, setTab] = useState<Tab>('discover');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .listBrands()
      .then(setBrands)
      .catch(() => setBrands([]));
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (tab === 'following') {
        if (!user) {
          setPosts([]);
          return;
        }
        const list = await api.feedFollowing();
        setPosts(list);
        return;
      }
      const list = await api.feedDiscover({
        type: typeFilter === 'all' ? undefined : typeFilter,
        brandId: brandId || undefined,
      });
      setPosts(list);
    } catch (e) {
      setError(formatErrorMessage(e));
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, typeFilter, brandId, user]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const listHeader =
    tab === 'discover' ? (
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {TYPE_CHIPS.map((c) => {
            const on = typeFilter === c.id;
            return (
              <Pressable
                key={c.id}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setTypeFilter(c.id)}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {brands.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}>
            <Pressable
              style={[styles.chip, !brandId && styles.chipOn]}
              onPress={() => setBrandId(null)}>
              <Text style={[styles.chipText, !brandId && styles.chipTextOn]}>全部品牌</Text>
            </Pressable>
            {brands.slice(0, 20).map((b) => {
              const on = brandId === b.id;
              return (
                <Pressable
                  key={b.id}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => setBrandId(on ? null : b.id)}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{b.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    ) : null;

  const renderPost = ({ item }: { item: FeedPost }) => {
    const imageCount = item.imageUris?.length ?? 0;
    const cover = item.coverUri || item.imageUris?.[0];
    return (
      <Pressable style={styles.card} onPress={() => router.push(`/post/${item.id}`)}>
        <View style={styles.coverWrap}>
          <PostCover uri={cover} height={168} style={styles.cover} />
          {imageCount > 1 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{imageCount} 张</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardTop}>
          <Text style={styles.badge}>{TYPE_LABEL[item.type] ?? item.type}</Text>
          <Text style={styles.author}>{item.author.nickname}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        {item.body ? (
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
        {item.variants.length > 0 ? (
          <Text style={styles.variants} numberOfLines={2}>
            {item.variants
              .map(
                (v) =>
                  `${v.variant.item.brand.name} · ${v.variant.item.name} · ${v.variant.colorName}`,
              )
              .join('  /  ')}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  if (tab === 'following' && !user) {
    return (
      <View style={styles.flex}>
        <View style={styles.tabs}>
          <TabButton active label="关注" onPress={() => setTab('following')} />
          <TabButton active={false} label="发现" onPress={() => setTab('discover')} />
        </View>
        <EmptyState
          image={require('../../assets/illustrations/empty-home-placeholder.png')}
          title="登录后看关注流"
          subtitle="登录后可关注同好，这里会显示他们的更新。"
          ctaLabel="去登录"
          onPress={() => requireLogin({ returnTo: '/(tabs)' })}
        />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.tabs}>
        <TabButton active={tab === 'following'} label="关注" onPress={() => setTab('following')} />
        <TabButton active={tab === 'discover'} label="发现" onPress={() => setTab('discover')} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.carmine} />
      ) : error ? (
        <EmptyState
          image={require('../../assets/illustrations/empty-home-placeholder.png')}
          title="加载失败"
          subtitle={error}
          ctaLabel="重试"
          onPress={() => {
            setLoading(true);
            void load();
          }}
        />
      ) : posts.length === 0 ? (
        tab === 'following' ? (
          <EmptyState
            image={require('../../assets/illustrations/empty-home-placeholder.png')}
            title="去关注同好"
            subtitle="关注后，他们的穿搭会出现在这里。"
            ctaLabel="去发现"
            onPress={() => setTab('discover')}
          />
        ) : (
          <>
            {listHeader}
            <EmptyState
              image={require('../../assets/illustrations/empty-home-placeholder.png')}
              title="发现还是空的"
              subtitle="发第一条穿搭分享，挂上变体，让同好点想要。"
              ctaLabel={user ? '去发帖' : '登录后发帖'}
              onPress={() => {
                if (!user) {
                  requireLogin({ returnTo: '/compose?type=outfit' });
                  return;
                }
                router.push('/compose?type=outfit');
              }}
            />
          </>
        )
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.carmine}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          renderItem={renderPost}
        />
      )}
    </View>
  );
}

function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.creamDeep,
    borderRadius: radii.pill,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.pill,
  },
  tabActive: { backgroundColor: colors.white },
  tabText: { color: colors.inkMuted, fontWeight: '600' },
  tabTextActive: { color: colors.carmine },
  filters: { marginBottom: spacing.sm, gap: 8 },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.creamDeep,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.carmine, borderColor: colors.carmine },
  chipText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  list: { padding: spacing.md, paddingBottom: 40 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  coverWrap: { marginBottom: spacing.sm, position: 'relative' },
  cover: { borderRadius: radii.md },
  countBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  countBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge: {
    backgroundColor: '#F8E6E9',
    color: colors.carmine,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    fontSize: 11,
    fontWeight: '700',
  },
  author: { color: colors.inkMuted, fontSize: 13 },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  body: { marginTop: 6, color: colors.inkMuted, lineHeight: 20 },
  variants: { marginTop: 10, color: colors.carmine, fontSize: 12, lineHeight: 18 },
});
