import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { StackBackButton } from '@/components/StackBackButton';
import { colors, radii, spacing } from '@/constants/theme';
import {
  BASE_COLOR_LABEL,
  CUT_LABEL,
  STATUS_LABEL,
  type WardrobeStatus,
} from '@/domain/types';
import { formatErrorMessage, resolveMediaUri } from '@/lib/api';
import { useWardrobe } from '@/store/WardrobeContext';


const STATUS_FLOW: WardrobeStatus[] = ['wishlist', 'on_order', 'owned'];

export default function EntryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getEntryView,
    markArrived,
    cancelPreorder,
    updateEntry,
    removeEntry,
    profile,
  } = useWardrobe();
  const view = id ? getEntryView(id) : null;

  const header = (
    <Stack.Screen
      options={{
        title: '衣橱详情',
        headerBackVisible: false,
        headerLeft: () => <StackBackButton fallbackHref="/(tabs)/wardrobe" />,
      }}
    />
  );

  const onDelete = useCallback(() => {
    if (!id) return;
    Alert.alert('移出衣橱？', '将删除该条目及相关预订记录，不可恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void removeEntry(id)
            .then(() => router.replace('/(tabs)/wardrobe'))
            .catch((e) =>
              Alert.alert('删除失败', formatErrorMessage(e)),
            );
        },
      },
    ]);
  }, [id, removeEntry, router]);

  if (!view) {
    return (
      <View style={styles.flex}>
        {header}
        <Text style={styles.missing}>找不到这条衣橱记录</Text>
      </View>
    );
  }

  const { entry, variant, item, brand, openPreorders, allPreorders } = view;
  const debt = openPreorders[0];

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      {header}
      {debt ? (
        <Animated.View
          entering={profile.reduceMotion ? undefined : FadeInDown.duration(380)}
          style={styles.alert}>
          <Text style={styles.alertTitle}>待补尾款</Text>
          <Text style={styles.alertAmount}>¥{debt.balanceAmountCny}</Text>
          <Text style={styles.alertMeta}>截止 {debt.balanceDueAt}</Text>
          <Text style={styles.alertMeta}>定金 ¥{debt.depositAmountCny}</Text>
          <View style={styles.alertActions}>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                void markArrived(debt.id)
                  .then(() => {
                    if (!profile.reduceMotion) {
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success,
                      ).catch(() => {});
                    }
                    Alert.alert('已标记到货', '条目已计入已拥有');
                  })
                  .catch((e) =>
                    Alert.alert('操作失败', formatErrorMessage(e)),
                  );
              }}>
              <Text style={styles.primaryBtnText}>确认到货</Text>
            </Pressable>
            <Pressable
              style={styles.ghostBtn}
              onPress={() => {
                void cancelPreorder(debt.id)
                  .then(() => Alert.alert('已取消预订'))
                  .catch((e) =>
                    Alert.alert('操作失败', formatErrorMessage(e)),
                  );
              }}>
              <Text style={styles.ghostBtnText}>取消预订</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.brand}>{brand.name}</Text>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {CUT_LABEL[variant.cut]} · {variant.colorName} ·{' '}
          {BASE_COLOR_LABEL[variant.baseColor]}
        </Text>
        <Text style={styles.meta}>
          状态 {STATUS_LABEL[entry.status]} · 数量 {entry.quantity}
          {entry.size ? ` · 尺码 ${entry.size}` : ''}
        </Text>
        {entry.userImageUris?.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.gallery}>
            {entry.userImageUris.map((uri) => {
              const src = resolveMediaUri(uri) || uri;
              return (
                <Image key={uri} source={{ uri: src }} style={styles.galleryImg} />
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>状态</Text>
        <View style={styles.chips}>
          {STATUS_FLOW.map((s) => {
            const active = entry.status === s;
            return (
              <Pressable
                key={s}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  if (s === entry.status) return;
                  if (s === 'on_order') {
                    Alert.alert('预订中', '请通过「录入衣橱」填写定金与尾款以进入预订。');
                    return;
                  }
                  void updateEntry(entry.id, { status: s }).catch((e) =>
                    Alert.alert('更新失败', formatErrorMessage(e)),
                  );
                }}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {STATUS_LABEL[s]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>标记私密</Text>
          <Switch
            value={entry.private}
            onValueChange={(v) => void updateEntry(entry.id, { private: v })}
            trackColor={{ true: colors.carmine }}
          />
        </View>

        <View style={[styles.row, { marginTop: spacing.md }]}>
          <Text style={styles.rowLabel}>隐藏预订进度</Text>
          <Switch
            value={!!entry.hidePreorder}
            onValueChange={(v) => void updateEntry(entry.id, { hidePreorder: v })}
            trackColor={{ true: colors.carmine }}
          />
        </View>
      </View>

      {entry.sourcePostId ? (
        <Pressable
          style={styles.sourceBtn}
          onPress={() => router.push(`/post/${entry.sourcePostId}` as never)}>
          <Text style={styles.sourceBtnText}>来自帖子 · 查看</Text>
        </Pressable>
      ) : null}

      {allPreorders.length > 0 ? (
        <View style={styles.history}>
          <Text style={styles.historyTitle}>预订记录</Text>
          {allPreorders.map((p) => {
            const stateLabel = p.cancelled
              ? '已取消'
              : p.archived || p.balancePaid
                ? '已结清/归档'
                : '进行中';
            return (
              <View key={p.id} style={styles.historyRow}>
                <Text style={styles.historyMain}>
                  定金 ¥{p.depositAmountCny} · 尾款 ¥{p.balanceAmountCny}
                </Text>
                <Text style={styles.historyMeta}>
                  截止 {p.balanceDueAt} · {stateLabel}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <Pressable style={styles.deleteBtn} onPress={onDelete}>
        <Text style={styles.deleteText}>移出衣橱</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.md, paddingBottom: 40 },
  missing: { margin: spacing.lg, color: colors.inkMuted },
  alert: {
    backgroundColor: '#F8E6E9',
    borderColor: colors.carmine,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  alertTitle: { color: colors.carmine, fontWeight: '700' },
  alertAmount: { fontSize: 32, fontWeight: '800', color: colors.carmine, marginVertical: 4 },
  alertMeta: { color: colors.inkMuted, marginTop: 2 },
  alertActions: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.carmine,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  ghostBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.carmine,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  ghostBtnText: { color: colors.carmine, fontWeight: '600' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  brand: { color: colors.inkMuted, marginBottom: 4 },
  name: { fontSize: 24, fontWeight: '700', color: colors.ink },
  meta: { marginTop: 8, color: colors.inkMuted, lineHeight: 20 },
  gallery: { marginTop: spacing.md, maxHeight: 180 },
  galleryImg: {
    width: 160,
    height: 160,
    borderRadius: radii.md,
    marginRight: 8,
    backgroundColor: colors.creamDeep,
  },
  sectionTitle: { fontWeight: '700', color: colors.ink, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { color: colors.ink, fontWeight: '600' },
  sourceBtn: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sourceBtnText: { color: colors.carmine, fontWeight: '700' },
  history: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  historyTitle: { fontWeight: '700', color: colors.ink, marginBottom: spacing.sm },
  historyRow: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  historyMain: { color: colors.ink, fontWeight: '600' },
  historyMeta: { marginTop: 4, color: colors.inkMuted, fontSize: 12 },
  deleteBtn: { alignItems: 'center', paddingVertical: 16 },
  deleteText: { color: colors.inkMuted, fontWeight: '600' },
});
