import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { StackBackButton } from '@/components/StackBackButton';
import { colors, radii, spacing } from '@/constants/theme';
import {
  STATUS_LABEL,
  VISIBILITY_LABEL,
  type WardrobeStatus,
  type WardrobeVisibility,
} from '@/domain/types';
import { formatErrorMessage, api } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';

type PublicEntry = {
  id: string;
  status: string;
  label: string;
  variantId: string;
};

export default function UserPublicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, requireLogin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('用户');
  const [visible, setVisible] = useState(false);
  const [visibility, setVisibility] = useState('private');
  const [entries, setEntries] = useState<PublicEntry[]>([]);
  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [wardrobe, stats] = await Promise.all([
        api.publicWardrobe(id),
        api.followStatsPublic(id).catch(() =>
          api.followStatus(id).catch(() => ({
            followers: 0,
            following: 0,
            isFollowing: false,
          })),
        ),
      ]);
      setVisible(wardrobe.visible);
      setVisibility(wardrobe.visibility);
      setNickname(wardrobe.owner?.nickname ?? '用户');
      setEntries(wardrobe.entries ?? []);
      setFollowers(stats.followers);
      setFollowingCount(stats.following);
      setIsFollowing(stats.isFollowing);
    } catch (e) {
      Alert.alert('加载失败', formatErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFollow = async () => {
    if (!id) return;
    if (!user) {
      requireLogin({ returnTo: `/user/${id}` });
      return;
    }
    if (user.id === id) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await api.unfollow(id);
        setIsFollowing(false);
        setFollowers((n) => Math.max(0, n - 1));
      } else {
        await api.follow(id);
        setIsFollowing(true);
        setFollowers((n) => n + 1);
      }
    } catch (e) {
      Alert.alert('操作失败', formatErrorMessage(e));
    } finally {
      setFollowBusy(false);
    }
  };

  const isSelf = !!user && user.id === id;

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          title: nickname,
          headerBackVisible: false,
          headerLeft: () => <StackBackButton />,
        }}
      />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.carmine} />
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.name}>{nickname}</Text>
            <Text style={styles.stats}>
              粉丝 {followers} · 关注 {followingCount}
            </Text>
            {!isSelf ? (
              <Pressable
                style={[styles.followBtn, isFollowing && styles.followBtnOn, followBusy && { opacity: 0.6 }]}
                disabled={followBusy}
                onPress={() => void toggleFollow()}>
                <Text style={[styles.followText, isFollowing && styles.followTextOn]}>
                  {isFollowing ? '已关注' : '关注'}
                </Text>
              </Pressable>
            ) : (
              <Pressable style={styles.followBtnOn} onPress={() => router.push('/(tabs)/profile')}>
                <Text style={styles.followTextOn}>编辑资料</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.section}>公开衣橱</Text>
          {!visible ? (
            <Text style={styles.hint}>
              对方衣橱不可见（可见性：
              {VISIBILITY_LABEL[visibility as WardrobeVisibility] ?? '未知'}）
            </Text>
          ) : entries.length === 0 ? (
            <Text style={styles.hint}>公开衣橱还是空的</Text>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.rowTitle}>{item.label}</Text>
                  <Text style={styles.rowMeta}>
                    {STATUS_LABEL[item.status as WardrobeStatus] ?? item.status}
                  </Text>
                </View>
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  header: {
    margin: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 22, fontWeight: '800', color: colors.ink },
  stats: { marginTop: 8, color: colors.inkMuted },
  followBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.carmine,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  followBtnOn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  followText: { color: '#fff', fontWeight: '700' },
  followTextOn: { color: colors.inkMuted, fontWeight: '700' },
  section: {
    marginHorizontal: spacing.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  hint: {
    marginHorizontal: spacing.md,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  row: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowTitle: { color: colors.ink, fontWeight: '600' },
  rowMeta: { marginTop: 4, color: colors.inkMuted, fontSize: 12 },
});
