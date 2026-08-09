import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/store/AuthContext';
import { useWardrobe } from '@/store/WardrobeContext';
import { formatErrorMessage } from '@/lib/api';

type AgendaItem = {
  kind: 'balance' | 'reminder';
  id: string;
  label: string;
  meta: string;
  entryId: string;
  preorderId: string;
};

type AgendaSection = { title: string; data: AgendaItem[] };

export default function CalendarScreen() {
  const {
    openBalances,
    reminders,
    addManualReminder,
    markArrived,
    markBalancePaid,
    removeReminder,
    signedIn,
  } = useWardrobe();
  const { requireLogin } = useAuth();
  const balances = openBalances();
  const [title, setTitle] = useState('');
  const [at, setAt] = useState('');

  const total = useMemo(
    () => balances.reduce((sum, b) => sum + b.preorder.balanceAmountCny, 0),
    [balances],
  );

  const sections = useMemo(() => {
    const byMonth = new Map<string, typeof balances>();
    balances.forEach((row) => {
      const key = row.preorder.balanceDueAt.slice(0, 7) || '未定';
      const list = byMonth.get(key) ?? [];
      list.push(row);
      byMonth.set(key, list);
    });
    const balanceSections: AgendaSection[] = [...byMonth.entries()].map(([titleKey, data]) => ({
      title: `尾款 · ${titleKey}`,
      data: data.map((d) => ({
        kind: 'balance' as const,
        id: d.preorder.id,
        label: d.label,
        meta: `¥${d.preorder.balanceAmountCny} · 截止 ${d.preorder.balanceDueAt}`,
        entryId: d.entry.id,
        preorderId: d.preorder.id,
      })),
    }));
    const reminderSection: AgendaSection[] =
      reminders.length > 0
        ? [
            {
              title: '上新提醒',
              data: reminders.map((r) => ({
                kind: 'reminder' as const,
                id: r.id,
                label: r.title,
                meta: String(r.at).slice(0, 10),
                entryId: '',
                preorderId: '',
              })),
            },
          ]
        : [];
    return [...balanceSections, ...reminderSection];
  }, [balances, reminders]);

  const submitReminder = () => {
    if (!title.trim() || !at.trim()) {
      Alert.alert('请填写标题与日期');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(at.trim())) {
      Alert.alert('日期格式应为年-月-日', '例如 2026-08-09');
      return;
    }
    void addManualReminder(title.trim(), at.trim())
      .then(() => {
        setTitle('');
        setAt('');
      })
      .catch((e) => {
        Alert.alert('添加失败', formatErrorMessage(e));
      });
  };

  if (!signedIn) {
    return (
      <View style={styles.flex}>
        <EmptyState
          image={require('../../assets/illustrations/empty-calendar.png')}
          title="登录后查看日历"
          subtitle="尾款与上新提醒会同步到云端；登录后即可管理。"
          ctaLabel="去登录"
          onPress={() => requireLogin({ returnTo: '/(tabs)/calendar' })}
        />
      </View>
    );
  }

  const empty = balances.length === 0 && reminders.length === 0;

  return (
    <View style={styles.flex}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>待补尾款总额</Text>
        <Text style={styles.heroAmount}>¥{total.toFixed(0)}</Text>
      </View>

      {empty ? (
        <View style={styles.emptyHint}>
          <Text style={styles.emptyTitle}>暂时没有尾款提醒</Text>
          <Text style={styles.emptySub}>可先手动加上新提醒，或去录入预订裙子。</Text>
          <Pressable onPress={() => router.push('/wardrobe-add')}>
            <Text style={styles.emptyLink}>去录入预订</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 200 }}
          renderSectionHeader={({ section }) => (
            <Text style={styles.section}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                onPress={() => {
                  if (item.kind === 'balance') router.push(`/entry/${item.entryId}`);
                }}
                onLongPress={() => {
                  if (item.kind !== 'balance') return;
                  Alert.alert('标记到货？', item.label, [
                    { text: '取消', style: 'cancel' },
                    {
                      text: '已到货',
                      onPress: () => void markArrived(item.preorderId),
                    },
                  ]);
                }}>
                <Text style={styles.rowTitle}>{item.label}</Text>
                <Text style={styles.rowMeta}>{item.meta}</Text>
              </Pressable>
              {item.kind === 'balance' ? (
                <View style={styles.actions}>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => {
                      void markBalancePaid(item.preorderId).catch((e) =>
                        Alert.alert('操作失败', formatErrorMessage(e)),
                      );
                    }}>
                    <Text style={styles.actionBtnText}>付尾款</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionBtnPrimary]}
                    onPress={() => {
                      void markArrived(item.preorderId).catch((e) =>
                        Alert.alert('操作失败', formatErrorMessage(e)),
                      );
                    }}>
                    <Text style={styles.actionBtnPrimaryText}>到货</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => {
                    Alert.alert('删除提醒？', item.label, [
                      { text: '取消', style: 'cancel' },
                      {
                        text: '删除',
                        style: 'destructive',
                        onPress: () =>
                          void removeReminder(item.id).catch((e) =>
                            Alert.alert('删除失败', formatErrorMessage(e)),
                          ),
                      },
                    ]);
                  }}>
                  <Text style={styles.deleteBtnText}>删除</Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}

      <View style={styles.composer}>
        <Text style={styles.composerTitle}>手动上新提醒</Text>
        <TextInput
          style={styles.input}
          placeholder="标题，例如 AP 新品日"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={colors.inkMuted}
        />
        <TextInput
          style={styles.input}
          placeholder="日期，如 2026-08-09"
          value={at}
          onChangeText={setAt}
          placeholderTextColor={colors.inkMuted}
        />
        <Pressable style={styles.addBtn} onPress={submitReminder}>
          <Text style={styles.addBtnText}>加入日历</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  hero: {
    margin: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroLabel: { color: colors.inkMuted, fontSize: 13 },
  heroAmount: {
    marginTop: 4,
    fontSize: 36,
    fontFamily: fonts.display,
    color: colors.carmine,
    fontWeight: '700',
  },
  emptyHint: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, flex: 1 },
  emptyTitle: { fontWeight: '700', color: colors.ink, fontSize: 16 },
  emptySub: { marginTop: 8, color: colors.inkMuted, lineHeight: 20 },
  emptyLink: { marginTop: 12, color: colors.carmine, fontWeight: '700' },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    color: colors.ink,
    fontWeight: '700',
  },
  row: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTitle: { color: colors.ink, fontWeight: '600' },
  rowMeta: { marginTop: 4, color: colors.inkMuted, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.carmine,
  },
  actionBtnText: { color: colors.carmine, fontWeight: '700', fontSize: 12 },
  actionBtnPrimary: { backgroundColor: colors.carmine },
  actionBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  deleteBtn: { alignSelf: 'flex-start', marginTop: 10 },
  deleteBtnText: { color: colors.inkMuted, fontWeight: '600', fontSize: 13 },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  composerTitle: { fontWeight: '700', color: colors.ink, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.sm,
    color: colors.ink,
  },
  addBtn: {
    backgroundColor: colors.carmine,
    borderRadius: radii.pill,
    alignItems: 'center',
    paddingVertical: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
});
