import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import { formatErrorMessage, api } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';

export default function PlusHubScreen() {
  const { requireLogin, user } = useAuth();

  const goCompose = (type: 'outfit' | 'tutorial') => {
    if (!user) {
      requireLogin({ returnTo: `/compose?type=${type}` });
      return;
    }
    router.push(`/compose?type=${type}`);
  };

  const goCoordinates = () => {
    if (!user) {
      requireLogin({ returnTo: '/coordinates' });
      return;
    }
    router.push('/coordinates');
  };

  const createCoordinate = () => {
    if (!user) {
      requireLogin({ returnTo: '/coordinates' });
      return;
    }
    void api
      .createCoordinate({ title: '未命名搭配' })
      .then((c) => router.push(`/coordinate/${c.id}`))
      .catch((e) =>
        Alert.alert('创建失败', formatErrorMessage(e)),
      );
  };

  return (
    <View style={styles.flex}>
      <Text style={styles.heading}>发布</Text>
      <Text style={styles.hint}>发帖为一级入口；录入衣橱与组搭在「更多」。</Text>

      <Pressable style={styles.primary} onPress={() => goCompose('outfit')}>
        <Text style={styles.primaryText}>发穿搭分享</Text>
        <Text style={styles.primarySub}>至少挂 1 个变体 · 支持「想要」</Text>
      </Pressable>

      <Pressable style={styles.secondary} onPress={() => goCompose('tutorial')}>
        <Text style={styles.secondaryText}>发教程心得</Text>
        <Text style={styles.secondarySub}>变体标签可选</Text>
      </Pressable>

      <Text style={styles.moreLabel}>更多</Text>
      <Pressable style={styles.more} onPress={() => router.push('/wardrobe-add')}>
        <Text style={styles.moreText}>录入衣橱</Text>
      </Pressable>
      <Pressable style={styles.more} onPress={createCoordinate}>
        <Text style={styles.moreText}>创建搭配</Text>
      </Pressable>
      <Pressable style={styles.more} onPress={goCoordinates}>
        <Text style={styles.moreText}>我的搭配</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream, padding: spacing.lg },
  heading: { fontSize: 24, fontWeight: '800', color: colors.ink },
  hint: { color: colors.inkMuted, marginTop: 6, marginBottom: spacing.lg, lineHeight: 20 },
  primary: {
    backgroundColor: colors.carmine,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  primarySub: { color: 'rgba(255,255,255,0.85)', marginTop: 6, fontSize: 13 },
  secondary: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  secondaryText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  secondarySub: { color: colors.inkMuted, marginTop: 4, fontSize: 13 },
  moreLabel: { color: colors.inkMuted, fontWeight: '600', marginBottom: spacing.sm },
  more: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  moreText: { color: colors.ink, fontWeight: '600' },
});
