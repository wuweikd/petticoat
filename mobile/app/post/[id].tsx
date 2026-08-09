import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PostCover } from '@/components/PostCover';
import { StackBackButton } from '@/components/StackBackButton';
import { colors, radii, spacing } from '@/constants/theme';
import { CUT_LABEL, type Cut } from '@/domain/types';
import { formatErrorMessage, api, type FeedPost } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';
import { useWardrobe } from '@/store/WardrobeContext';

const TYPE_LABEL: Record<string, string> = {
  outfit: '穿搭分享',
  tutorial: '教程心得',
  brand_release: '品牌上新',
  official: '官方资讯',
  encyclopedia: '风格百科',
};

const PAGE_W = Dimensions.get('window').width - spacing.md * 2;

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, requireLogin, consumeDraft } = useAuth();
  const { wantVariant, refresh, entries } = useWardrobe();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [wanting, setWanting] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const entryByVariant = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) map.set(e.variantId, e.id);
    return map;
  }, [entries]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setPost(await api.getPost(id));
    } catch (e) {
      Alert.alert('加载失败', formatErrorMessage(e));
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!post?.author.id || !user || post.author.id === user.id) {
      setFollowing(false);
      return;
    }
    void api
      .followStatus(post.author.id)
      .then((s) => setFollowing(s.isFollowing))
      .catch(() => setFollowing(false));
  }, [post?.author.id, user?.id]);

  // 登录回来后若草稿带 pendingWantVariantId，自动执行一次「想要」
  useEffect(() => {
    if (!user || !post) return;
    const draft = consumeDraft();
    const pending = draft?.payload?.pendingWantVariantId as string | undefined;
    if (!pending) return;
    void runWant(pending, { fromDraft: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, post?.id]);

  const wishlistAlertButtons = (entryId?: string) => {
    const buttons: {
      text: string;
      style?: 'cancel' | 'default' | 'destructive';
      onPress?: () => void;
    }[] = [{ text: '继续看帖', style: 'cancel' }];
    if (entryId) {
      buttons.push({
        text: '去想要分区',
        onPress: () =>
          router.push(`/(tabs)/wardrobe?tab=wishlist&highlight=${entryId}` as never),
      });
    }
    buttons.push({ text: '去衣橱', onPress: () => router.push('/(tabs)/wardrobe') });
    return buttons;
  };

  const askReleaseReminder = (variantId: string, afterWantMsg: string, entryId?: string) => {
    if (!post || post.type !== 'brand_release' || !post.releaseAt) {
      Alert.alert(
        afterWantMsg.includes('已在') ? '已在衣橱' : '已加入想要',
        afterWantMsg,
        wishlistAlertButtons(entryId),
      );
      return;
    }
    const day = String(post.releaseAt).slice(0, 10);
    Alert.alert('加入上新提醒？', `上新日 ${day}，是否写入个人日历？`, [
      {
        text: '只要想要',
        style: 'cancel',
        onPress: () => Alert.alert('完成', afterWantMsg, wishlistAlertButtons(entryId)),
      },
      {
        text: '一并提醒',
        onPress: () => {
          void wantVariant(variantId, {
            sourcePostId: post.id,
            addReleaseReminder: true,
          })
            .then((res) => {
              Alert.alert(
                '完成',
                `${afterWantMsg}${res.reminderAdded ? '；已加入上新提醒' : '；日历提醒已存在'}`,
                [
                  { text: '好的' },
                  {
                    text: '去想要分区',
                    onPress: () =>
                      router.push(
                        `/(tabs)/wardrobe?tab=wishlist&highlight=${res.entryId}` as never,
                      ),
                  },
                  { text: '去日历', onPress: () => router.push('/(tabs)/calendar') },
                ],
              );
            })
            .catch((e) =>
              Alert.alert('提醒失败', formatErrorMessage(e)),
            );
        },
      },
    ]);
  };

  const runWant = async (variantId: string, opts?: { fromDraft?: boolean }) => {
    if (!user) {
      requireLogin({
        returnTo: `/post/${id}`,
        payload: { pendingWantVariantId: variantId },
      });
      return;
    }
    setWanting(variantId);
    try {
      const res = await wantVariant(variantId, { sourcePostId: post?.id });
      if (post?.type === 'brand_release' && post.releaseAt) {
        askReleaseReminder(variantId, res.message, res.entryId);
      } else {
        Alert.alert(
          res.created ? '已加入想要' : '已在衣橱',
          res.message,
          wishlistAlertButtons(res.entryId),
        );
      }
    } catch (e) {
      Alert.alert('操作失败', formatErrorMessage(e));
    } finally {
      setWanting(null);
    }
  };

  const toggleFollow = async () => {
    if (!post) return;
    if (!user) {
      requireLogin({ returnTo: `/post/${id}` });
      return;
    }
    if (post.author.id === user.id) return;
    setFollowBusy(true);
    try {
      if (following) {
        await api.unfollow(post.author.id);
        setFollowing(false);
      } else {
        await api.follow(post.author.id);
        setFollowing(true);
      }
    } catch (e) {
      Alert.alert('操作失败', formatErrorMessage(e));
    } finally {
      setFollowBusy(false);
    }
  };

  const onWantAll = () => {
    if (!post || post.variants.length === 0) return;
    Alert.alert('整套想要？', `将把本帖 ${post.variants.length} 个变体加入想要（已有则跳过）`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确认',
        onPress: () => {
          void (async () => {
            if (!user) {
              requireLogin({ returnTo: `/post/${id}` });
              return;
            }
            let created = 0;
            let skipped = 0;
            let firstEntryId: string | undefined;
            for (const v of post.variants) {
              try {
                const res = await wantVariant(v.variantId, { sourcePostId: post.id });
                if (res.created) created += 1;
                else skipped += 1;
                if (!firstEntryId) firstEntryId = res.entryId;
              } catch {
                // continue
              }
            }
            await refresh().catch(() => {});
            Alert.alert(
              '整套想要完成',
              `新增 ${created} 件，已有跳过 ${skipped} 件`,
              wishlistAlertButtons(firstEntryId),
            );
          })();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen
          options={{
            title: '帖子',
            headerBackVisible: false,
            headerLeft: () => <StackBackButton />,
          }}
        />
        <ActivityIndicator color={colors.carmine} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.center}>
        <Stack.Screen
          options={{
            title: '帖子',
            headerBackVisible: false,
            headerLeft: () => <StackBackButton />,
          }}
        />
        <Text style={styles.missing}>帖子不存在或未发布</Text>
      </View>
    );
  }

  const images =
    post.imageUris && post.imageUris.length > 0
      ? post.imageUris
      : post.coverUri
        ? [post.coverUri]
        : [];
  const isSelf = !!user && post.author.id === user.id;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: '帖子',
          headerBackVisible: false,
          headerLeft: () => <StackBackButton />,
        }}
      />

      {images.length > 1 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.gallery}
          contentContainerStyle={{ gap: 8 }}>
          {images.map((uri, i) => (
            <PostCover key={`${uri}-${i}`} uri={uri} height={240} style={{ width: PAGE_W }} />
          ))}
        </ScrollView>
      ) : (
        <PostCover uri={images[0] ?? post.coverUri} height={240} style={styles.cover} />
      )}

      <Text style={styles.badge}>{TYPE_LABEL[post.type] ?? post.type}</Text>
      <Text style={styles.title}>{post.title}</Text>

      <View style={styles.authorRow}>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => router.push(`/user/${post.author.id}` as never)}>
          <Text style={styles.meta}>
            {post.author.nickname}
            {post.publishedAt ? ` · ${String(post.publishedAt).slice(0, 10)}` : ''}
            {post.releaseAt ? ` · 上新 ${String(post.releaseAt).slice(0, 10)}` : ''}
          </Text>
        </Pressable>
        {!isSelf ? (
          <Pressable
            style={[styles.followBtn, following && styles.followBtnOn, followBusy && { opacity: 0.6 }]}
            disabled={followBusy}
            onPress={() => void toggleFollow()}>
            <Text style={[styles.followBtnText, following && styles.followBtnTextOn]}>
              {following ? '已关注' : '关注'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {post.coordinateId ? (
        <Pressable
          style={styles.coordLink}
          onPress={() => router.push(`/coordinate/${post.coordinateId}` as never)}>
          <Text style={styles.coordLinkText}>查看搭配</Text>
        </Pressable>
      ) : null}

      {post.body ? <Text style={styles.body}>{post.body}</Text> : null}

      {post.variants.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>同款变体</Text>
            {post.variants.length > 1 ? (
              <Pressable onPress={onWantAll}>
                <Text style={styles.wantAll}>整套想要</Text>
              </Pressable>
            ) : null}
          </View>
          {post.variants.map((row) => {
            const v = row.variant;
            const label = `${v.item.brand.name} · ${v.item.name} · ${v.colorName} · ${CUT_LABEL[v.cut as Cut] ?? v.cut}`;
            const busy = wanting === v.id;
            const ownedEntryId = entryByVariant.get(v.id);
            return (
              <View key={v.id} style={styles.variantRow}>
                <Text style={styles.variantLabel}>{label}</Text>
                <View style={styles.variantActions}>
                  <Pressable
                    style={[styles.wantBtn, busy && { opacity: 0.6 }]}
                    disabled={!!wanting}
                    onPress={() => void runWant(v.id)}>
                    <Text style={styles.wantBtnText}>{busy ? '…' : '想要同款'}</Text>
                  </Pressable>
                  {ownedEntryId ? (
                    <Pressable onPress={() => router.push(`/entry/${ownedEntryId}`)}>
                      <Text style={styles.wardrobeLink}>我的衣橱</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.noVariants}>本帖未挂变体</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.md, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  missing: { color: colors.inkMuted },
  gallery: { marginBottom: spacing.md },
  cover: { marginBottom: spacing.md },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8E6E9',
    color: colors.carmine,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  title: { marginTop: spacing.sm, fontSize: 24, fontWeight: '800', color: colors.ink },
  authorRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  meta: { color: colors.inkMuted },
  followBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.carmine,
  },
  followBtnOn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  followBtnTextOn: { color: colors.inkMuted },
  coordLink: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.carmine,
  },
  coordLinkText: { color: colors.carmine, fontWeight: '700', fontSize: 13 },
  body: { marginTop: spacing.md, color: colors.ink, lineHeight: 22 },
  section: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontWeight: '700', color: colors.ink },
  wantAll: { color: colors.carmine, fontWeight: '700', fontSize: 13 },
  variantRow: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 10,
  },
  variantLabel: { color: colors.ink, lineHeight: 20 },
  variantActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  wantBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.carmine,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  wantBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  wardrobeLink: { color: colors.carmine, fontWeight: '700', fontSize: 13 },
  noVariants: { marginTop: spacing.lg, color: colors.inkMuted },
});
