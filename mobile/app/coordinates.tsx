import { Stack, router } from 'expo-router';
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
import { formatErrorMessage, api, type CoordinateDetail } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';

export default function CoordinatesListScreen() {
  const { user, requireLogin } = useAuth();
  const [list, setList] = useState<CoordinateDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setList(await api.listCoordinates());
    } catch (e) {
      Alert.alert('加载失败', formatErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!user) {
      requireLogin({ returnTo: '/coordinates' });
      return;
    }
    try {
      const c = await api.createCoordinate({ title: '未命名搭配' });
      router.push(`/coordinate/${c.id}`);
    } catch (e) {
      Alert.alert('创建失败', formatErrorMessage(e));
    }
  };

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          title: '我的搭配',
          headerBackVisible: false,
          headerLeft: () => <StackBackButton fallbackHref="/(tabs)/add" />,
          headerRight: () => (
            <Pressable onPress={() => void create()} hitSlop={12}>
              <Text style={styles.headerAction}>新建</Text>
            </Pressable>
          ),
        }}
      />

      {!user ? (
        <View style={styles.center}>
          <Text style={styles.hint}>登录后可创建搭配</Text>
          <Pressable
            style={styles.primary}
            onPress={() => requireLogin({ returnTo: '/coordinates' })}>
            <Text style={styles.primaryText}>去登录</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.carmine} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.hint}>还没有搭配。从衣橱选品填入主坑吧。</Text>
              <Pressable style={styles.primary} onPress={() => void create()}>
                <Text style={styles.primaryText}>创建第一套</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/coordinate/${item.id}`)}>
              <Text style={styles.title}>{item.title || '未命名搭配'}</Text>
              <Text style={styles.meta}>
                {item.slots.length} 个位置
                {item.slots.some((s) => s.notArrived) ? ' · 含未到手' : ''}
              </Text>
              {item.slots.length > 0 ? (
                <Text style={styles.slots} numberOfLines={2}>
                  {item.slots.map((s) => s.label).join('  /  ')}
                </Text>
              ) : (
                <Text style={styles.slots}>主坑还是空的</Text>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  list: { padding: spacing.md, paddingBottom: 40 },
  center: { padding: spacing.lg, alignItems: 'center' },
  hint: { color: colors.inkMuted, textAlign: 'center', marginBottom: spacing.md, lineHeight: 20 },
  headerAction: { color: colors.carmine, fontWeight: '700', marginRight: 8 },
  primary: {
    backgroundColor: colors.carmine,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  meta: { marginTop: 4, color: colors.inkMuted, fontSize: 12 },
  slots: { marginTop: 8, color: colors.carmine, fontSize: 12, lineHeight: 18 },
});
