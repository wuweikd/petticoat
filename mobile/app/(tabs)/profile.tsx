import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import type { Substyle, WardrobeVisibility } from '@/domain/types';

const POST_TYPE_LABEL: Record<string, string> = {
  outfit: '穿搭',
  tutorial: '教程',
  brand_release: '上新',
  official: '资讯',
  encyclopedia: '百科',
};
import { api, resolveMediaUri, type FeedPost } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';
import { useWardrobe } from '@/store/WardrobeContext';

const SUBSTYLES: { id: Substyle; label: string }[] = [
  { id: 'sweet', label: '甜美' },
  { id: 'gothic', label: '哥特' },
  { id: 'classic', label: '古典' },
  { id: 'punk', label: '朋克' },
  { id: 'other', label: '其他' },
];

const VISIBILITY: { id: WardrobeVisibility; label: string }[] = [
  { id: 'private', label: '仅自己' },
  { id: 'followers', label: '关注者' },
  { id: 'public', label: '公开' },
];

type OverlapRow = {
  variantId: string;
  label: string;
  users: { id: string; nickname: string }[];
};

export default function ProfileScreen() {
  const {
    profile,
    entries,
    updateProfile,
    setReduceMotion,
    toggleSubstyle,
    toggleFavoriteBrand,
    brands,
    signedIn,
  } = useWardrobe();
  const { requireLogin, logout, user } = useAuth();
  const [nickname, setNickname] = useState(profile.nickname);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [years, setYears] = useState(
    profile.yearsInLolita != null ? String(profile.yearsInLolita) : '',
  );
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);
  const [overlap, setOverlap] = useState<OverlapRow[]>([]);
  const owned = entries.filter((e) => e.status === 'owned').length;
  const want = entries.filter((e) => e.status === 'wishlist').length;
  const onOrder = entries.filter((e) => e.status === 'on_order').length;
  const visibility = profile.wardrobeVisibility ?? 'private';

  useEffect(() => {
    setNickname(profile.nickname);
    setBio(profile.bio ?? '');
    setYears(profile.yearsInLolita != null ? String(profile.yearsInLolita) : '');
  }, [profile.nickname, profile.bio, profile.yearsInLolita]);

  useEffect(() => {
    if (!signedIn) {
      setMyPosts([]);
      setOverlap([]);
      return;
    }
    void api
      .listMyPosts()
      .then(setMyPosts)
      .catch(() => setMyPosts([]));
    void api
      .wishlistOverlap()
      .then(setOverlap)
      .catch(() => setOverlap([]));
  }, [signedIn, user?.id]);

  if (!signedIn) {
    return (
      <View style={styles.flex}>
        <Text style={styles.brand}>Petticoat</Text>
        <EmptyState
          image={require('../../assets/illustrations/empty-wardrobe.png')}
          title="登录查看个人页"
          subtitle="登录后可编辑昵称、偏好风格，并同步云端衣橱。"
          ctaLabel="去登录"
          onPress={() => requireLogin({ returnTo: '/(tabs)/profile' })}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>Petticoat</Text>
      <TextInput
        style={styles.nickname}
        value={nickname}
        onChangeText={setNickname}
        onEndEditing={() => {
          if (nickname.trim() && nickname !== profile.nickname) {
            void updateProfile({ nickname: nickname.trim() });
          }
        }}
      />
      <TextInput
        style={styles.bio}
        placeholder="个性签名"
        placeholderTextColor={colors.inkMuted}
        value={bio}
        onChangeText={setBio}
        onEndEditing={() => {
          if (bio !== (profile.bio ?? '')) {
            void updateProfile({ bio });
          }
        }}
      />
      {user?.phone ? <Text style={styles.phone}>手机 {user.phone}</Text> : null}

      <View style={styles.stats}>
        <Stat label="已拥有" value={owned} />
        <Stat label="预订中" value={onOrder} />
        <Stat label="想要" value={want} />
      </View>

      <Text style={styles.section}>衣橱可见性</Text>
      <View style={styles.chips}>
        {VISIBILITY.map((v) => {
          const active = visibility === v.id;
          return (
            <Pressable
              key={v.id}
              onPress={() => {
                if (v.id === visibility) return;
                void updateProfile({ wardrobeVisibility: v.id });
              }}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{v.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>入坑时长（年）</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        placeholder="例如 3"
        placeholderTextColor={colors.inkMuted}
        value={years}
        onChangeText={setYears}
        onEndEditing={() => {
          const n = years.trim() === '' ? undefined : Number(years);
          if (n !== undefined && (!Number.isFinite(n) || n < 0 || n > 80)) return;
          if (n !== profile.yearsInLolita) {
            void updateProfile({ yearsInLolita: n });
          }
        }}
      />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>关闭装饰动效</Text>
        <Switch
          value={profile.reduceMotion}
          onValueChange={(v) => void setReduceMotion(v)}
          trackColor={{ true: colors.carmine }}
        />
      </View>

      <Text style={styles.section}>偏好风格</Text>
      <View style={styles.chips}>
        {SUBSTYLES.map((s) => {
          const active = profile.preferredSubstyles.includes(s.id);
          return (
            <Pressable
              key={s.id}
              onPress={() => void toggleSubstyle(s.id)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>常用品牌</Text>
      <View style={styles.chips}>
        {brands
          .filter((b) => b.name !== '未知品牌')
          .map((b) => {
            const active = profile.favoriteBrandIds.includes(b.id);
            return (
              <Pressable
                key={b.id}
                onPress={() => void toggleFavoriteBrand(b.id)}
                style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{b.name}</Text>
              </Pressable>
            );
          })}
      </View>

      <Pressable style={styles.linkRow} onPress={() => router.push('/coordinates')}>
        <Text style={styles.linkRowText}>我的搭配</Text>
        <Text style={styles.linkRowChevron}>›</Text>
      </Pressable>

      <Text style={styles.section}>想要重合</Text>
      {overlap.length === 0 ? (
        <Text style={styles.hint}>暂无与关注同好重合的想要单品。</Text>
      ) : (
        overlap.slice(0, 12).map((row) => (
          <View key={row.variantId} style={styles.overlapRow}>
            <Text style={styles.overlapLabel}>{row.label}</Text>
            <Text style={styles.overlapUsers}>
              {row.users.map((u) => u.nickname).join('、')}
            </Text>
            <View style={styles.overlapLinks}>
              {row.users.map((u) => (
                <Pressable key={u.id} onPress={() => router.push(`/user/${u.id}` as never)}>
                  <Text style={styles.overlapLink}>{u.nickname}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))
      )}

      <Text style={styles.section}>我的帖子</Text>
      {myPosts.length === 0 ? (
        <Text style={styles.hint}>还没有发过帖，去「发布」写一条穿搭吧。</Text>
      ) : (
        myPosts.slice(0, 8).map((p) => {
          const cover = resolveMediaUri(p.coverUri);
          return (
            <Pressable
              key={p.id}
              style={styles.postRow}
              onPress={() => router.push(`/post/${p.id}`)}>
              {cover ? (
                <Image source={{ uri: cover }} style={styles.postThumb} />
              ) : (
                <View style={[styles.postThumb, styles.postThumbPh]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.postTitle}>{p.title}</Text>
                <Text style={styles.postMeta}>
                  {POST_TYPE_LABEL[p.type] ?? p.type} ·{' '}
                  {String(p.publishedAt || p.createdAt).slice(0, 10)}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}

      <Pressable style={styles.logout} onPress={() => void logout()}>
        <Text style={styles.logoutText}>退出登录</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: 48 },
  brand: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.carmine,
    marginBottom: spacing.sm,
  },
  nickname: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  bio: {
    color: colors.inkMuted,
    marginBottom: spacing.sm,
  },
  phone: { color: colors.inkMuted, marginBottom: spacing.lg, fontSize: 12 },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.ink },
  statLabel: { marginTop: 4, color: colors.inkMuted, fontSize: 12 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  rowLabel: { color: colors.ink, fontWeight: '600' },
  section: { fontWeight: '700', color: colors.ink, marginBottom: 8 },
  hint: { color: colors.inkMuted, marginBottom: spacing.md, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.creamDeep,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.carmine, borderColor: colors.carmine },
  chipText: { color: colors.ink, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  linkRowText: { color: colors.ink, fontWeight: '700' },
  linkRowChevron: { color: colors.inkMuted, fontSize: 22 },
  overlapRow: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  overlapLabel: { color: colors.ink, fontWeight: '600' },
  overlapUsers: { marginTop: 4, color: colors.inkMuted, fontSize: 12 },
  overlapLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  overlapLink: { color: colors.carmine, fontWeight: '700', fontSize: 12 },
  postRow: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postThumb: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: colors.creamDeep,
  },
  postThumbPh: { borderWidth: 1, borderColor: colors.border },
  postTitle: { color: colors.ink, fontWeight: '600' },
  postMeta: { marginTop: 4, color: colors.inkMuted, fontSize: 12 },
  logout: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutText: { color: colors.inkMuted, fontWeight: '600' },
});
