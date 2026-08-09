import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
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

import { StackBackButton } from '@/components/StackBackButton';
import { colors, radii, spacing } from '@/constants/theme';
import type { CatalogHit } from '@/domain/search';
import { api, formatErrorMessage, resolveMediaUri } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';
import { useWardrobe } from '@/store/WardrobeContext';

const MAX_IMAGES = 6;

export default function ComposeScreen() {
  const { type: typeParam, coordinateId: coordParam } = useLocalSearchParams<{
    type?: string;
    coordinateId?: string;
  }>();
  const type = typeParam === 'tutorial' ? 'tutorial' : 'outfit';
  const { user, requireLogin, consumeDraft } = useAuth();
  const { searchCatalog, refresh } = useWardrobe();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<CatalogHit[]>([]);
  const [picked, setPicked] = useState<CatalogHit[]>([]);
  const [coordinateId, setCoordinateId] = useState<string | undefined>(coordParam);
  const [busy, setBusy] = useState(false);
  const [localUris, setLocalUris] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      requireLogin({
        returnTo: `/compose?type=${type}${coordParam ? `&coordinateId=${coordParam}` : ''}`,
        payload: { composeType: type, title, body, variantIds: picked.map((p) => p.variant.id) },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, type]);

  useEffect(() => {
    if (!user || !coordParam) return;
    setCoordinateId(coordParam);
    void api
      .getCoordinate(coordParam)
      .then((c) => {
        if (!title.trim() && c.title) setTitle(c.title);
        const hitsFromSlots: CatalogHit[] = c.slots.map((s) => ({
          brand: s.variant.item.brand,
          item: {
            id: s.variant.item.id,
            brandId: s.variant.item.brand.id,
            name: s.variant.item.name,
            category: s.variant.item.category as CatalogHit['item']['category'],
            createdByUserId: '',
          },
          variant: {
            id: s.variant.id,
            itemId: s.variant.item.id,
            colorName: s.variant.colorName,
            baseColor: s.variant.baseColor as CatalogHit['variant']['baseColor'],
            cut: s.variant.cut as CatalogHit['variant']['cut'],
          },
          score: 100,
          label: s.label,
        }));
        if (hitsFromSlots.length) setPicked(hitsFromSlots);
      })
      .catch((e) => {
        Alert.alert('无法加载搭配', formatErrorMessage(e));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, coordParam]);

  useEffect(() => {
    if (!user) return;
    const draft = consumeDraft();
    const p = draft?.payload as
      | { title?: string; body?: string; variantIds?: string[]; query?: string }
      | undefined;
    if (!p) return;
    if (p.title) setTitle(p.title);
    if (p.body) setBody(p.body);
    if (p.query) setQuery(p.query);
    if (p.variantIds?.length) {
      void (async () => {
        const bag = await searchCatalog(p.query || 'a').catch(() => [] as CatalogHit[]);
        const restored = p.variantIds!
          .map((id) => bag.find((h) => h.variant.id === id))
          .filter(Boolean) as CatalogHit[];
        if (restored.length < p.variantIds!.length) {
          const more = await searchCatalog('Holy').catch(() => [] as CatalogHit[]);
          for (const id of p.variantIds!) {
            if (!restored.some((h) => h.variant.id === id)) {
              const hit = more.find((h) => h.variant.id === id);
              if (hit) restored.push(hit);
            }
          }
        }
        if (restored.length) setPicked(restored);
      })();
    }
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

  const draftPayload = () => ({
    composeType: type,
    title,
    body,
    query,
    variantIds: picked.map((p) => p.variant.id),
  });

  const toggleHit = (hit: CatalogHit) => {
    setPicked((prev) => {
      if (prev.some((p) => p.variant.id === hit.variant.id)) {
        return prev.filter((p) => p.variant.id !== hit.variant.id);
      }
      return [...prev, hit];
    });
    setQuery('');
    setHits([]);
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
    if (!user) {
      requireLogin({ returnTo: `/compose?type=${type}`, payload: draftPayload() });
      return;
    }
    if (!title.trim()) {
      Alert.alert('请填写标题');
      return;
    }
    if (type === 'outfit' && picked.length < 1) {
      Alert.alert('穿搭分享至少挂 1 个变体');
      return;
    }
    if (type === 'outfit' && localUris.length < 1) {
      Alert.alert('请至少添加 1 张图', '穿搭分享需要图片，方便同好浏览。');
      return;
    }
    setBusy(true);
    try {
      const imageUris: string[] = [];
      for (const local of localUris) {
        const up = await api.uploadImage(local);
        imageUris.push(up.uri);
      }
      const post = await api.createPost({
        type,
        title: title.trim(),
        body: body.trim() || undefined,
        coverUri: imageUris[0],
        imageUris: imageUris.length ? imageUris : undefined,
        variantIds: picked.map((p) => p.variant.id),
        coordinateId,
        status: 'published',
      });
      await refresh().catch(() => {});
      router.replace(`/post/${post.id}`);
    } catch (e) {
      Alert.alert('发布失败', formatErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.flex}>
        <Stack.Screen
          options={{
            title: '发帖',
            headerBackVisible: false,
            headerLeft: () => <StackBackButton fallbackHref="/(tabs)/add" />,
          }}
        />
        <Text style={styles.hint}>登录后即可发帖；草稿会保留。</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: type === 'outfit' ? '发穿搭' : '发教程',
          headerBackVisible: false,
          headerLeft: () => <StackBackButton fallbackHref="/(tabs)/add" />,
        }}
      />
      <Text style={styles.heading}>{type === 'outfit' ? '发穿搭分享' : '发教程心得'}</Text>
      <Text style={styles.hint}>
        {coordinateId
          ? '已从搭配预填变体，请补图后发布（不会静默发帖）。'
          : type === 'outfit'
            ? '至少 1 张图（最多 6 张），并挂至少 1 个变体。'
            : '图片可选（最多 6 张）；变体标签可选。'}
      </Text>

      <Text style={styles.label}>
        图片{type === 'outfit' ? '（至少 1 张，最多 6）' : '（可选，最多 6）'}
      </Text>
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

      <Text style={styles.label}>标题</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="例如 Holy Lantern 初搭"
        placeholderTextColor={colors.inkMuted}
      />

      <Text style={styles.label}>正文（可选）</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={body}
        onChangeText={setBody}
        multiline
        placeholder="说说搭配或心得"
        placeholderTextColor={colors.inkMuted}
      />

      <Text style={styles.label}>挂变体</Text>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="搜索品牌 / 裙名 / 色名"
        placeholderTextColor={colors.inkMuted}
      />
      {hits.length > 0 ? (
        <View style={styles.hits}>
          {hits.map((hit) => {
            const on = picked.some((p) => p.variant.id === hit.variant.id);
            return (
              <Pressable
                key={hit.variant.id}
                style={[styles.hit, on && styles.hitOn]}
                onPress={() => toggleHit(hit)}>
                <Text style={styles.hitText}>{hit.label}</Text>
                <Text style={styles.hitAction}>{on ? '已选' : '添加'}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {picked.length > 0 ? (
        <View style={styles.pickedWrap}>
          {picked.map((p) => (
            <Pressable key={p.variant.id} style={styles.picked} onPress={() => toggleHit(p)}>
              <Text style={styles.pickedText}>{p.label}</Text>
              <Text style={styles.pickedClear}>移除</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        style={[styles.submit, busy && { opacity: 0.6 }]}
        disabled={busy}
        onPress={() => void submit()}>
        <Text style={styles.submitText}>{busy ? '发布中…' : '发布'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.md, paddingBottom: 48 },
  heading: { fontSize: 22, fontWeight: '800', color: colors.ink },
  hint: { color: colors.inkMuted, marginTop: 6, marginBottom: spacing.md, lineHeight: 20 },
  label: { marginTop: spacing.md, marginBottom: spacing.xs, color: colors.ink, fontWeight: '600' },
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
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.ink,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  hits: {
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.carmine,
    overflow: 'hidden',
  },
  hit: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  hitOn: { backgroundColor: '#F8E6E9' },
  hitText: { flex: 1, color: colors.ink, fontSize: 13 },
  hitAction: { color: colors.carmine, fontWeight: '700', fontSize: 12 },
  pickedWrap: { marginTop: spacing.sm, gap: 8 },
  picked: {
    padding: spacing.md,
    backgroundColor: '#F8E6E9',
    borderRadius: radii.md,
  },
  pickedText: { color: colors.ink, fontWeight: '600' },
  pickedClear: { marginTop: 4, color: colors.carmine, fontSize: 12 },
  submit: {
    marginTop: spacing.lg,
    backgroundColor: colors.carmine,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
