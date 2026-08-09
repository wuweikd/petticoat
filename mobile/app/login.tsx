import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/store/AuthContext';
import { formatErrorMessage } from '@/lib/api';

/** 固定验收账号 */
export const FIXED_TEST_PHONE = '13800138000';
export const FIXED_TEST_CODE = '0000';

export default function LoginScreen() {
  const { autologin, returnTo: returnToParam } = useLocalSearchParams<{
    autologin?: string;
    returnTo?: string;
  }>();
  const { login, sendCode, pendingDraft, logout, user } = useAuth();
  const [phone, setPhone] = useState(FIXED_TEST_PHONE);
  const [code, setCode] = useState(FIXED_TEST_CODE);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | undefined>();
  const autoTried = useRef(false);

  const onSend = async () => {
    try {
      const h = await sendCode(phone.trim());
      setHint(h);
      Alert.alert('验证码已发送', h || '请查看返回提示');
    } catch (e) {
      Alert.alert('发送失败', formatErrorMessage(e));
    }
  };

  const onLogin = async () => {
    setBusy(true);
    try {
      const returnTo =
        returnToParam ||
        (pendingDraft?.returnTo as string | undefined) ||
        '/(tabs)/wardrobe';
      await login(phone.trim(), code.trim());
      router.replace(returnTo as never);
    } catch (e) {
      Alert.alert('登录失败', formatErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // 开发态：/login?autologin=1 用固定账号自动登录（便于模拟器验收）
  useEffect(() => {
    if (!__DEV__ || autologin !== '1' || autoTried.current) return;
    autoTried.current = true;
    void (async () => {
      try {
        if (user) await logout();
      } catch {
        // ignore
      }
      setPhone(FIXED_TEST_PHONE);
      setCode(FIXED_TEST_CODE);
      setBusy(true);
      try {
        const returnTo = returnToParam || '/(tabs)/wardrobe';
        await login(FIXED_TEST_PHONE, FIXED_TEST_CODE);
        router.replace(returnTo as never);
      } catch (e) {
        Alert.alert('自动登录失败', formatErrorMessage(e));
      } finally {
        setBusy(false);
      }
    })();
  }, [autologin, login, logout, returnToParam, user]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>手机号登录</Text>
        <Text style={styles.sub}>
          需先获取验证码。固定测试号 {FIXED_TEST_PHONE} 可用验证码{' '}
          {FIXED_TEST_CODE}；其它号码请使用获取验证码返回的提示或开发验证码。
        </Text>
        {pendingDraft ? (
          <Text style={styles.draft}>登录后将回到刚才的录入进度</Text>
        ) : null}
        <Text style={styles.label}>手机号</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={phone}
          onChangeText={setPhone}
          placeholder="11 位手机号"
        />
        <Text style={styles.label}>验证码</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.code]}
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            placeholder="0000"
          />
          <Pressable style={styles.ghost} onPress={() => void onSend()}>
            <Text style={styles.ghostText}>获取验证码</Text>
          </Pressable>
        </View>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        <Pressable
          style={[styles.primary, busy && { opacity: 0.6 }]}
          disabled={busy}
          onPress={() => void onLogin()}>
          <Text style={styles.primaryText}>{busy ? '登录中…' : '登录'}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>暂不登录</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  sub: { color: colors.inkMuted, marginTop: 8, marginBottom: 16, lineHeight: 20 },
  draft: { color: colors.carmine, marginBottom: 12, fontWeight: '600' },
  label: { color: colors.inkMuted, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.cream,
    color: colors.ink,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  code: { flex: 1 },
  ghost: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.carmine,
  },
  ghostText: { color: colors.carmine, fontWeight: '600' },
  hint: { color: colors.inkMuted, marginTop: 8, fontSize: 12 },
  primary: {
    marginTop: 20,
    backgroundColor: colors.carmine,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  back: {
    textAlign: 'center',
    marginTop: 16,
    color: colors.inkMuted,
  },
});
