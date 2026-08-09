import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DollStage, type DollStageHandle } from '@/components/doll/DollStage';
import { DollTrayChip } from '@/components/doll/DollTrayChip';
import { StackBackButton } from '@/components/StackBackButton';
import { colors, radii, spacing } from '@/constants/theme';
import type { DollLayerView } from '@/domain/doll';
import {
  CATEGORY_LABEL,
  CUT_LABEL,
  STATUS_LABEL,
  type ItemCategory,
  type WardrobeStatus,
} from '@/domain/types';
import { formatErrorMessage, api, type CoordinateDetail, type CoordinateSlotInput } from '@/lib/api';
import { useWardrobe } from '@/store/WardrobeContext';

const MAIN_PITS: ItemCategory[] = [
  'skirt',
  'top',
  'outer',
  'accessory',
  'foundation',
  'footwear',
];

type PickerTarget =
  | { kind: 'main'; category: ItemCategory }
  | { kind: 'extra' };

type WardrobePick = {
  variantId: string;
  label: string;
  shortLabel: string;
  category: ItemCategory;
  status: WardrobeStatus;
  colorName: string;
  cut: string;
  baseColor: string;
  imageUri?: string | null;
};

type EditorTab = 'list' | 'doll';

export default function CoordinateEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, getVariant, getItem, getBrand, signedIn, profile } = useWardrobe();
  const [coord, setCoord] = useState<CoordinateDetail | null>(null);
  const [title, setTitle] = useState('');
  const [slots, setSlots] = useState<CoordinateSlotInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [tab, setTab] = useState<EditorTab>('doll');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | null>(null);
  const [dragTip, setDragTip] = useState(false);
  const stageRef = useRef<DollStageHandle>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const c = await api.getCoordinate(id);
      setCoord(c);
      setTitle(c.title ?? '');
      setSlots(
        c.slots.map((s) => ({
          kind: s.kind,
          category: s.category ?? undefined,
          variantId: s.variantId,
          sortOrder: s.sortOrder,
        })),
      );
    } catch (e) {
      Alert.alert('加载失败', formatErrorMessage(e));
      setCoord(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const wardrobePicks = useMemo(() => {
    const list: WardrobePick[] = [];
    for (const e of entries) {
      const v = getVariant(e.variantId);
      if (!v) continue;
      const item = getItem(v.itemId);
      if (!item) continue;
      const brand = getBrand(item.brandId);
      if (!brand) continue;
      list.push({
        variantId: v.id,
        category: item.category,
        status: e.status,
        colorName: v.colorName,
        cut: v.cut,
        baseColor: v.baseColor,
        imageUri: e.userImageUris?.[0] || v.catalogImageUri,
        label: `${brand.name} · ${item.name} · ${v.colorName} · ${CUT_LABEL[v.cut]}`,
        shortLabel: `${item.name} · ${v.colorName}`,
      });
    }
    return list;
  }, [entries, getBrand, getItem, getVariant]);

  const mainSlot = (cat: ItemCategory) =>
    slots.find((s) => s.kind === 'main' && s.category === cat);

  const extraSlots = slots.filter((s) => s.kind === 'extra');

  const labelFor = (variantId: string) =>
    wardrobePicks.find((p) => p.variantId === variantId)?.label ??
    coord?.slots.find((s) => s.variantId === variantId)?.label ??
    variantId;

  const statusFor = (variantId: string) => {
    const fromCoord = coord?.slots.find((s) => s.variantId === variantId);
    if (fromCoord) return fromCoord;
    const pick = wardrobePicks.find((p) => p.variantId === variantId);
    if (!pick) return null;
    return {
      notArrived: pick.status !== 'owned',
      statusLabel: STATUS_LABEL[pick.status],
    };
  };

  const dollLayers: DollLayerView[] = useMemo(() => {
    return slots.map((s) => {
      const pick = wardrobePicks.find((p) => p.variantId === s.variantId);
      const fromCoord = coord?.slots.find((v) => v.variantId === s.variantId);
      const cat = (s.category ?? pick?.category ?? 'accessory') as ItemCategory;
      const st = statusFor(s.variantId);
      const variant = getVariant(s.variantId);
      return {
        category: cat,
        kind: s.kind,
        variantId: s.variantId,
        label: labelFor(s.variantId),
        shortLabel: pick?.shortLabel ?? fromCoord?.label.split(' · ').slice(1, 3).join(' · ') ?? cat,
        notArrived: st?.notArrived ?? false,
        statusLabel: st?.statusLabel ?? '',
        colorName: pick?.colorName ?? variant?.colorName,
        baseColor: pick?.baseColor ?? variant?.baseColor,
        cut: pick?.cut ?? variant?.cut,
        imageUri: pick?.imageUri,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, wardrobePicks, coord, getVariant]);

  const setMain = (category: ItemCategory, variantId: string | null) => {
    setSlots((prev) => {
      const without = prev.filter(
        (s) => !(s.kind === 'main' && s.category === category),
      );
      if (!variantId) return without;
      const cleaned = without.filter((s) => s.variantId !== variantId);
      return [...cleaned, { kind: 'main' as const, category, variantId, sortOrder: 0 }];
    });
  };

  const addExtra = (variantId: string) => {
    setSlots((prev) => {
      if (prev.some((s) => s.variantId === variantId)) return prev;
      const pick = wardrobePicks.find((p) => p.variantId === variantId);
      if (!pick || (pick.category !== 'accessory' && pick.category !== 'foundation')) {
        Alert.alert('额外槽仅允许配件或底层');
        return prev;
      }
      const extras = prev.filter((s) => s.kind === 'extra');
      return [
        ...prev.filter((s) => s.kind === 'main'),
        ...extras,
        {
          kind: 'extra' as const,
          category: pick.category,
          variantId,
          sortOrder: extras.length,
        },
      ];
    });
  };

  const removeExtra = (variantId: string) => {
    setSlots((prev) => prev.filter((s) => !(s.kind === 'extra' && s.variantId === variantId)));
  };

  const assignFromTray = (pick: WardrobePick, forceCategory?: ItemCategory) => {
    const target = forceCategory ?? selectedCategory;
    if (target) {
      if (pick.category !== target) {
        Alert.alert('品类不匹配', `当前分区是${CATEGORY_LABEL[target]}`);
        return;
      }
      setMain(target, pick.variantId);
      setSelectedCategory(null);
      return;
    }
    // 无选中分区：主坑按品类自动入坑；配件/底层进额外槽若主坑已满
    if (MAIN_PITS.includes(pick.category)) {
      const existing = mainSlot(pick.category);
      if (existing && (pick.category === 'accessory' || pick.category === 'foundation')) {
        addExtra(pick.variantId);
      } else {
        setMain(pick.category, pick.variantId);
      }
    }
  };

  const save = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const c = await api.updateCoordinate(id, {
        title: title.trim() || null,
        slots,
      });
      setCoord(c);
      Alert.alert('已保存');
    } catch (e) {
      Alert.alert('保存失败', formatErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    if (!id) return;
    if (slots.length < 1) {
      Alert.alert('请先至少填入 1 个位置再分享');
      return;
    }
    setSaving(true);
    try {
      await api.updateCoordinate(id, { title: title.trim() || null, slots });
      router.push(`/compose?type=outfit&coordinateId=${id}`);
    } catch (e) {
      Alert.alert('保存失败', formatErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const removeCoord = () => {
    if (!id) return;
    Alert.alert('删除这套搭配？', '不会删除衣橱中的单品。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void api
            .removeCoordinate(id)
            .then(() => router.replace('/coordinates'))
            .catch((e) =>
              Alert.alert('删除失败', formatErrorMessage(e)),
            );
        },
      },
    ]);
  };

  const pickerList = useMemo(() => {
    if (!picker) return [];
    if (picker.kind === 'main') {
      return wardrobePicks.filter((p) => p.category === picker.category);
    }
    return wardrobePicks.filter(
      (p) => p.category === 'accessory' || p.category === 'foundation',
    );
  }, [picker, wardrobePicks]);

  const trayList = useMemo(() => {
    if (selectedCategory) {
      return wardrobePicks.filter((p) => p.category === selectedCategory);
    }
    return wardrobePicks;
  }, [selectedCategory, wardrobePicks]);

  if (!signedIn) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: '搭配', headerLeft: () => <StackBackButton /> }} />
        <Text style={styles.hint}>请先登录</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: '搭配', headerLeft: () => <StackBackButton /> }} />
        <ActivityIndicator color={colors.carmine} />
      </View>
    );
  }

  if (!coord) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: '搭配', headerLeft: () => <StackBackButton /> }} />
        <Text style={styles.hint}>找不到这套搭配</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          title: '编辑搭配',
          headerBackVisible: false,
          headerLeft: () => <StackBackButton fallbackHref="/coordinates" />,
        }}
      />

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'doll' && styles.tabActive]}
          onPress={() => setTab('doll')}>
          <Text style={[styles.tabText, tab === 'doll' && styles.tabTextActive]}>人偶</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'list' && styles.tabActive]}
          onPress={() => setTab('list')}>
          <Text style={[styles.tabText, tab === 'list' && styles.tabTextActive]}>列表</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>标题</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="例如 Holy Lantern 初搭"
          placeholderTextColor={colors.inkMuted}
        />

        {tab === 'doll' ? (
          <>
            <DollStage
              ref={stageRef}
              layers={dollLayers}
              reduceMotion={profile.reduceMotion}
              selectedCategory={selectedCategory}
              onPressZone={(cat) => {
                setSelectedCategory(cat);
                setPicker({ kind: 'main', category: cat });
              }}
            />

            <View style={styles.trayHead}>
              <Text style={styles.section}>
                衣橱托盘
                {selectedCategory ? ` · ${CATEGORY_LABEL[selectedCategory]}` : ''}
              </Text>
              {selectedCategory ? (
                <Pressable onPress={() => setSelectedCategory(null)}>
                  <Text style={styles.link}>取消分区</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.hint}>
              {dragTip
                ? '拖到分区'
                : selectedCategory
                  ? `点下方单品装入「${CATEGORY_LABEL[selectedCategory]}」；也可长按拖入`
                  : '长按拖到人偶分区，或点选按品类自动入坑'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tray}>
              {trayList.length === 0 ? (
                <Text style={styles.hint}>没有可装入的衣橱单品</Text>
              ) : (
                trayList.map((p) => (
                  <DollTrayChip
                    key={p.variantId}
                    pick={p}
                    onPress={() => assignFromTray(p)}
                    onDragBegin={() => setDragTip(true)}
                    onDragEnd={() => setDragTip(false)}
                    onDropAt={(pageX, pageY) => {
                      stageRef.current?.measureInWindow(() => {
                        const cat = stageRef.current?.hitTest(pageX, pageY);
                        if (!cat) {
                          Alert.alert('未落到分区', '请拖到人偶上的对应分区后松手');
                          return;
                        }
                        assignFromTray(p, cat);
                      });
                    }}
                  />
                ))
              )}
            </ScrollView>

            <Pressable style={styles.pickBtn} onPress={() => setPicker({ kind: 'extra' })}>
              <Text style={styles.pickBtnText}>+ 额外槽（配件 / 底层）</Text>
            </Pressable>
            {extraSlots.length > 0 ? (
              <View style={styles.extraBox}>
                {extraSlots.map((s) => (
                  <View key={s.variantId} style={styles.extraRow}>
                    <Text style={styles.pitLabel}>{labelFor(s.variantId)}</Text>
                    <Pressable onPress={() => removeExtra(s.variantId)}>
                      <Text style={styles.clear}>移除</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.section}>主坑</Text>
            <Text style={styles.hint}>每坑至多一件，须来自衣橱且品类匹配。</Text>
            {MAIN_PITS.map((cat) => {
              const slot = mainSlot(cat);
              const st = slot ? statusFor(slot.variantId) : null;
              return (
                <View key={cat} style={styles.pit}>
                  <View style={styles.pitHead}>
                    <Text style={styles.pitName}>{CATEGORY_LABEL[cat]}</Text>
                    {slot ? (
                      <Pressable onPress={() => setMain(cat, null)}>
                        <Text style={styles.clear}>清空</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {slot ? (
                    <View>
                      <Text style={styles.pitLabel}>{labelFor(slot.variantId)}</Text>
                      {st ? (
                        <Text style={[styles.badge, st.notArrived && styles.badgeWarn]}>
                          {st.notArrived ? '未到手' : st.statusLabel}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <Pressable
                      style={styles.pickBtn}
                      onPress={() => setPicker({ kind: 'main', category: cat })}>
                      <Text style={styles.pickBtnText}>从衣橱选择</Text>
                    </Pressable>
                  )}
                  {slot ? (
                    <Pressable
                      onPress={() => setPicker({ kind: 'main', category: cat })}
                      style={{ marginTop: 8 }}>
                      <Text style={styles.link}>更换</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}

            <Text style={styles.section}>额外槽（配件 / 底层）</Text>
            {extraSlots.map((s) => {
              const st = statusFor(s.variantId);
              return (
                <View key={s.variantId} style={styles.pit}>
                  <Text style={styles.pitLabel}>{labelFor(s.variantId)}</Text>
                  {st ? (
                    <Text style={[styles.badge, st.notArrived && styles.badgeWarn]}>
                      {st.notArrived ? '未到手' : st.statusLabel}
                    </Text>
                  ) : null}
                  <Pressable onPress={() => removeExtra(s.variantId)} style={{ marginTop: 8 }}>
                    <Text style={styles.clear}>移除</Text>
                  </Pressable>
                </View>
              );
            })}
            <Pressable style={styles.pickBtn} onPress={() => setPicker({ kind: 'extra' })}>
              <Text style={styles.pickBtnText}>+ 添加额外槽</Text>
            </Pressable>
          </>
        )}

        <Pressable
          style={[styles.primary, saving && { opacity: 0.6 }]}
          disabled={saving}
          onPress={() => void save()}>
          <Text style={styles.primaryText}>{saving ? '保存中…' : '保存'}</Text>
        </Pressable>
        <Pressable
          style={[styles.secondary, saving && { opacity: 0.6 }]}
          disabled={saving}
          onPress={() => void share()}>
          <Text style={styles.secondaryText}>分享到社区（进发帖编辑器）</Text>
        </Pressable>
        <Pressable onPress={removeCoord} style={styles.deleteWrap}>
          <Text style={styles.delete}>删除搭配</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={!!picker} animationType="slide" transparent>
        <View style={styles.modalMask}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {picker?.kind === 'main' && picker.category
                ? `选择${CATEGORY_LABEL[picker.category]}`
                : '选择配件 / 底层'}
            </Text>
            {pickerList.length === 0 ? (
              <Text style={styles.hint}>衣橱里没有符合品类的单品</Text>
            ) : (
              <FlatList
                data={pickerList}
                keyExtractor={(item) => item.variantId}
                style={{ maxHeight: 360 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.pickRow}
                    onPress={() => {
                      if (picker?.kind === 'main') setMain(picker.category, item.variantId);
                      else addExtra(item.variantId);
                      setPicker(null);
                      setSelectedCategory(null);
                    }}>
                    <Text style={styles.pickRowTitle}>{item.label}</Text>
                    <Text style={styles.pickRowMeta}>{STATUS_LABEL[item.status]}</Text>
                  </Pressable>
                )}
              />
            )}
            <Pressable
              style={styles.modalClose}
              onPress={() => {
                setPicker(null);
              }}>
              <Text style={styles.modalCloseText}>关闭</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.md, paddingBottom: 48 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
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
  label: { fontWeight: '600', color: colors.ink, marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  section: {
    marginTop: spacing.md,
    fontWeight: '800',
    fontSize: 16,
    color: colors.ink,
  },
  hint: { color: colors.inkMuted, marginTop: 4, marginBottom: spacing.sm, lineHeight: 20 },
  trayHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tray: { marginBottom: spacing.md, maxHeight: 110 },
  extraBox: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  extraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pit: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pitHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  pitName: { fontWeight: '700', color: colors.ink },
  pitLabel: { color: colors.ink, lineHeight: 20, flex: 1, paddingRight: 8 },
  badge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.creamDeep,
    color: colors.inkMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  badgeWarn: { backgroundColor: '#F8E6E9', color: colors.carmine },
  clear: { color: colors.inkMuted, fontWeight: '600' },
  link: { color: colors.carmine, fontWeight: '600' },
  pickBtn: {
    borderWidth: 1,
    borderColor: colors.carmine,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pickBtnText: { color: colors.carmine, fontWeight: '700' },
  primary: {
    marginTop: spacing.lg,
    backgroundColor: colors.carmine,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.carmine,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  secondaryText: { color: colors.carmine, fontWeight: '700' },
  deleteWrap: { marginTop: spacing.lg, alignItems: 'center' },
  delete: { color: colors.inkMuted, fontWeight: '600' },
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalTitle: { fontWeight: '800', fontSize: 18, color: colors.ink, marginBottom: spacing.md },
  pickRow: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pickRowTitle: { color: colors.ink, fontWeight: '600' },
  pickRowMeta: { marginTop: 4, color: colors.inkMuted, fontSize: 12 },
  modalClose: { alignItems: 'center', paddingVertical: 12 },
  modalCloseText: { color: colors.inkMuted, fontWeight: '700' },
});
