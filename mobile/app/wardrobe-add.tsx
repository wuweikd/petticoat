import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radii, spacing } from '@/constants/theme';
import type { CatalogHit } from '@/domain/search';
import {
  BASE_COLOR_LABEL,
  CATEGORY_LABEL,
  CUTS_BY_CATEGORY,
  CUT_LABEL,
  STATUS_LABEL,
  type BaseColor,
  type ItemCategory,
  type WardrobeStatus,
} from '@/domain/types';
import { api, formatErrorMessage, resolveMediaUri } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';
import { useWardrobe } from '@/store/WardrobeContext';

const CATEGORIES = Object.keys(CATEGORY_LABEL) as ItemCategory[];
const BASE_COLORS = Object.keys(BASE_COLOR_LABEL) as BaseColor[];
const STATUSES: WardrobeStatus[] = ['wishlist', 'on_order', 'owned'];
const MAX_IMAGES = 6;

export default function AddScreen() {
  const { brands, addToWardrobe, searchCatalog, profile, signedIn } = useWardrobe();
  const { requireLogin, consumeDraft, user } = useAuth();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<CatalogHit[]>([]);
  const [picked, setPicked] = useState<CatalogHit | null>(null);
  const [brandId, setBrandId] = useState('new');
  const [newBrandName, setNewBrandName] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('skirt');
  const cuts = CUTS_BY_CATEGORY[category];
  const [cut, setCut] = useState(cuts[0]);
  const [colorName, setColorName] = useState('');
  const [baseColor, setBaseColor] = useState<BaseColor>('black');
  const [status, setStatus] = useState<WardrobeStatus>('wishlist');
  const [size, setSize] = useState('');
  const [deposit, setDeposit] = useState('0');
  const [balance, setBalance] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [localUris, setLocalUris] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (brands[0] && brandId === 'new' && !newBrandName) {
      const ap = brands.find((b) => b.name.includes('Angelic')) ?? brands[0];
      if (ap) setBrandId(ap.id);
    }
  }, [brands, brandId, newBrandName]);

  useEffect(() => {
    if (!user) return;
    const draft = consumeDraft();
    if (!draft?.payload) return;
    const p = draft.payload as Record<string, string>;
    if (p.query) setQuery(p.query);
    if (p.itemName) setItemName(p.itemName);
    if (p.colorName) setColorName(p.colorName);
    if (p.brandId) setBrandId(p.brandId);
    if (p.newBrandName) setNewBrandName(p.newBrandName);
    if (p.category) setCategory(p.category as ItemCategory);
    if (p.cut) setCut(p.cut as typeof cut);
    if (p.baseColor) setBaseColor(p.baseColor as BaseColor);
    if (p.status) setStatus(p.status as WardrobeStatus);
    if (p.size) setSize(p.size);
    if (p.deposit) setDeposit(p.deposit);
    if (p.balance) setBalance(p.balance);
    if (p.dueAt) setDueAt(p.dueAt);
    if (typeof p.localUris === 'string' && p.localUris) {
      try {
        const parsed = JSON.parse(p.localUris) as string[];
        if (Array.isArray(parsed)) setLocalUris(parsed.filter(Boolean).slice(0, MAX_IMAGES));
      } catch {
        /* ignore */
      }
    }
    if (p.pickedVariantId) {
      void searchCatalog(p.query || p.itemName || '').then((list) => {
        const hit = list.find((h) => h.variant.id === p.pickedVariantId);
        if (hit) setPicked(hit);
      });
    }
    // restore once after login
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      void searchCatalog(query)
        .then((list) => {
          if (!cancelled) setHits(list);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, searchCatalog]);

  const brandOptions = useMemo(
    () => [...brands, { id: 'new', name: '+ 新建品牌' }],
    [brands],
  );

  const onCategoryChange = (next: ItemCategory) => {
    setCategory(next);
    setCut(CUTS_BY_CATEGORY[next][0]);
  };

  const applyHit = (hit: CatalogHit) => {
    setPicked(hit);
    setQuery(hit.label);
    setBrandId(hit.brand.id);
    setItemName(hit.item.name);
    setCategory(hit.item.category);
    setCut(hit.variant.cut);
    setColorName(hit.variant.colorName);
    setBaseColor(hit.variant.baseColor);
  };

  const clearPick = () => {
    setPicked(null);
    setQuery('');
  };

  const draftPayload = () => ({
    query,
    itemName,
    colorName,
    brandId,
    newBrandName,
    category,
    cut,
    baseColor,
    status,
    size,
    deposit,
    balance,
    dueAt,
    pickedLabel: picked?.label,
    pickedVariantId: picked?.variant.id,
    localUris: JSON.stringify(localUris),
  });

  const gateCreate = () => {
    requireLogin({
      returnTo: '/wardrobe-add',
      payload: draftPayload(),
    });
  };

  const addImages = async (fromCamera: boolean) => {
    if (localUris.length >= MAX_IMAGES) {
      Alert.alert('最多 6 张图');
      return;
    }
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('需要相机权限', '请在系统设置中允许相机。');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setLocalUris((prev) => [...prev, result.assets[0].uri].slice(0, MAX_IMAGES));
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('需要相册权限', '请在系统设置中允许访问照片。');
      return;
    }
    const remain = MAX_IMAGES - localUris.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: remain,
    });
    if (result.canceled || !result.assets?.length) return;
    setLocalUris((prev) =>
      [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_IMAGES),
    );
  };

  const removeImage = (uri: string) => {
    setLocalUris((prev) => prev.filter((u) => u !== uri));
  };

  const submit = async () => {
    try {
      if (!picked && (!itemName.trim() || !colorName.trim())) {
        Alert.alert('请填写裙名与色名，或从搜索选择同款');
        return;
      }
      if (!signedIn) {
        requireLogin({
          returnTo: '/wardrobe-add',
          payload: draftPayload(),
        });
        return;
      }
      if (status === 'on_order') {
        if (!dueAt.trim() || balance === '') {
          Alert.alert('预订中需填写尾款金额与截止日期');
          return;
        }
      }
      setBusy(true);
      const userImageUris: string[] = [];
      for (const local of localUris) {
        const up = await api.uploadImage(local);
        userImageUris.push(up.uri);
      }
      const result = await addToWardrobe({
        brandId,
        brandName: brandId === 'new' ? newBrandName : undefined,
        itemName: picked?.item.name ?? itemName,
        category: picked?.item.category ?? category,
        cut: picked?.variant.cut ?? cut,
        colorName: picked?.variant.colorName ?? colorName,
        baseColor: picked?.variant.baseColor ?? baseColor,
        status,
        size: size.trim() || undefined,
        depositAmountCny: status === 'on_order' ? Number(deposit) || 0 : undefined,
        balanceAmountCny: status === 'on_order' ? Number(balance) : undefined,
        balanceDueAt: status === 'on_order' ? dueAt : undefined,
        existingVariantId: picked?.variant.id,
        userImageUris: userImageUris.length ? userImageUris : undefined,
      });
      if (!result.entryId) {
        Alert.alert('保存失败', '请检查裁式与品类是否匹配');
        return;
      }
      if (!profile.reduceMotion) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      router.push(`/entry/${result.entryId}`);
    } catch (e) {
      const raw = e instanceof Error ? e.message : '';
      if (raw === 'NEED_LOGIN' || /NEED_LOGIN/.test(raw)) {
        requireLogin({ returnTo: '/wardrobe-add', payload: draftPayload() });
        return;
      }
      Alert.alert('无法保存', formatErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Animated.View entering={profile.reduceMotion ? undefined : FadeInDown.duration(420)}>
        <Text style={styles.heading}>录入到衣橱</Text>
        <Text style={styles.hint}>
          {signedIn
            ? '先搜索全局目录；没有再新建。试试输入「Holy」。'
            : '游客可搜索浏览全局目录；加入衣橱或新建需登录。'}
        </Text>

        <Label>搜索同款</Label>
        <TextInput
          style={styles.input}
          placeholder="品牌 / 裙名 / 色名"
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setPicked(null);
          }}
          placeholderTextColor={colors.inkMuted}
        />
        {picked ? (
          <Pressable onPress={clearPick} style={styles.picked}>
            <Text style={styles.pickedText}>已选：{picked.label}</Text>
            <Text style={styles.pickedClear}>清除重选</Text>
          </Pressable>
        ) : null}
        {!picked && hits.length > 0 ? (
          <View style={styles.hits}>
            <Text style={styles.hitsTitle}>是不是这条？</Text>
            {hits.map((hit) => (
              <Pressable key={hit.variant.id} style={styles.hit} onPress={() => applyHit(hit)}>
                <Text style={styles.hitLabel}>{hit.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {!picked && signedIn ? (
          <>
            <Label>品牌</Label>
            <ChipRow
              options={brandOptions.map((b) => ({ id: b.id, label: b.name }))}
              value={brandId}
              onChange={setBrandId}
            />
            {brandId === 'new' ? (
              <TextInput
                style={styles.input}
                placeholder="新品牌名"
                value={newBrandName}
                onChangeText={setNewBrandName}
                placeholderTextColor={colors.inkMuted}
              />
            ) : null}

            <Label>裙名 / 品名</Label>
            <TextInput
              style={styles.input}
              placeholder="例如 Holy Lantern"
              value={itemName}
              onChangeText={setItemName}
              placeholderTextColor={colors.inkMuted}
            />

            <Label>品类</Label>
            <ChipRow
              options={CATEGORIES.map((c) => ({ id: c, label: CATEGORY_LABEL[c] }))}
              value={category}
              onChange={(id) => onCategoryChange(id as ItemCategory)}
            />

            <Label>裁式</Label>
            <ChipRow
              options={cuts.map((c) => ({ id: c, label: CUT_LABEL[c] }))}
              value={cut}
              onChange={(id) => setCut(id as typeof cut)}
            />

            <Label>色名</Label>
            <TextInput
              style={styles.input}
              placeholder="官方色名或口语色，如 Mimosa"
              value={colorName}
              onChangeText={setColorName}
              placeholderTextColor={colors.inkMuted}
            />

            <Label>基色（必填）</Label>
            <ChipRow
              options={BASE_COLORS.map((c) => ({ id: c, label: BASE_COLOR_LABEL[c] }))}
              value={baseColor}
              onChange={(id) => setBaseColor(id as BaseColor)}
            />
          </>
        ) : null}

        {!picked && !signedIn ? (
          <Pressable style={styles.loginCue} onPress={gateCreate}>
            <Text style={styles.loginCueText}>没有搜到？登录后可新建目录条目</Text>
          </Pressable>
        ) : null}

        <Label>状态</Label>
        <ChipRow
          options={STATUSES.map((s) => ({ id: s, label: STATUS_LABEL[s] }))}
          value={status}
          onChange={(id) => setStatus(id as WardrobeStatus)}
        />

        <Label>尺码（可选）</Label>
        <TextInput
          style={styles.input}
          placeholder="S / M / 自由填写"
          value={size}
          onChangeText={setSize}
          placeholderTextColor={colors.inkMuted}
        />

        <Label>实拍图（可选，最多 6 张）</Label>
        {localUris.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
            {localUris.map((uri) => (
              <View key={uri} style={styles.previewWrap}>
                <Image source={{ uri: resolveMediaUri(uri) || uri }} style={styles.preview} />
                <Pressable style={styles.removeImg} onPress={() => removeImage(uri)}>
                  <Text style={styles.removeImgText}>移除</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.coverEmpty}>
            <Text style={styles.coverEmptyText}>还没有图片</Text>
          </View>
        )}
        <View style={styles.coverActions}>
          <Pressable style={styles.coverBtn} onPress={() => void addImages(false)}>
            <Text style={styles.coverBtnText}>从相册选择</Text>
          </Pressable>
          <Pressable style={styles.coverBtnSecondary} onPress={() => void addImages(true)}>
            <Text style={styles.coverBtnSecondaryText}>拍照</Text>
          </Pressable>
        </View>

        {status === 'on_order' ? (
          <View style={styles.box}>
            <Text style={styles.boxTitle}>预订记录（人民币）</Text>
            <Label>定金（可为 0）</Label>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={deposit}
              onChangeText={setDeposit}
              placeholderTextColor={colors.inkMuted}
            />
            <Label>尾款金额</Label>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={balance}
              onChangeText={setBalance}
              placeholder="例如 1500"
              placeholderTextColor={colors.inkMuted}
            />
            <Label>尾款截止日期</Label>
            <TextInput
              style={styles.input}
              value={dueAt}
              onChangeText={setDueAt}
              placeholder="日期，如 2026-08-09"
              placeholderTextColor={colors.inkMuted}
            />
          </View>
        ) : null}

        <Pressable
          style={[styles.submit, busy && { opacity: 0.6 }]}
          disabled={busy}
          onPress={() => void submit()}>
          <Text style={styles.submitText}>
            {busy ? '保存中…' : signedIn ? '加入衣橱' : '登录后加入衣橱'}
          </Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.md, paddingBottom: 48 },
  heading: { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  hint: { color: colors.inkMuted, marginBottom: spacing.md, fontSize: 13 },
  label: { marginTop: spacing.md, marginBottom: spacing.xs, color: colors.ink, fontWeight: '600' },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.ink,
  },
  hits: {
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.carmine,
    overflow: 'hidden',
  },
  hitsTitle: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    color: colors.carmine,
    fontWeight: '700',
    fontSize: 12,
  },
  hit: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  hitLabel: { color: colors.ink, fontSize: 13 },
  picked: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#F8E6E9',
    borderRadius: radii.md,
  },
  pickedText: { color: colors.ink, fontWeight: '600' },
  pickedClear: { marginTop: 4, color: colors.carmine, fontSize: 12 },
  loginCue: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.white,
  },
  loginCueText: { color: colors.carmine, fontWeight: '600', textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  box: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boxTitle: { fontWeight: '700', color: colors.ink, marginBottom: spacing.sm },
  previewRow: { maxHeight: 140 },
  previewWrap: { marginRight: 8 },
  preview: {
    width: 140,
    height: 105,
    borderRadius: radii.md,
    backgroundColor: colors.creamDeep,
  },
  removeImg: { marginTop: 4 },
  removeImgText: { color: colors.inkMuted, fontSize: 12, fontWeight: '600' },
  coverEmpty: {
    height: 140,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  coverEmptyText: { color: colors.inkMuted },
  coverActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  coverBtn: {
    backgroundColor: colors.carmine,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  coverBtnText: { color: '#fff', fontWeight: '700' },
  coverBtnSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  coverBtnSecondaryText: { color: colors.ink, fontWeight: '600' },
  submit: {
    marginTop: spacing.lg,
    backgroundColor: colors.carmine,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
