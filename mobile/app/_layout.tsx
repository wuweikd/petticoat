import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { StackBackButton } from '@/components/StackBackButton';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/store/AuthContext';
import { WardrobeProvider } from '@/store/WardrobeContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { loginPath, clearLoginPath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (loginPath) {
      router.push('/login');
      clearLoginPath();
    }
  }, [loginPath, router, clearLoginPath]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.cream },
          headerTintColor: colors.ink,
          contentStyle: { backgroundColor: colors.cream },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="entry/[id]"
          options={{
            title: '衣橱详情',
            headerBackVisible: false,
            headerLeft: () => <StackBackButton fallbackHref="/(tabs)/wardrobe" />,
          }}
        />
        <Stack.Screen
          name="post/[id]"
          options={{
            title: '帖子',
            headerBackVisible: false,
            headerLeft: () => <StackBackButton />,
          }}
        />
        <Stack.Screen
          name="compose"
          options={{
            title: '发帖',
            presentation: 'modal',
            headerBackVisible: false,
            headerLeft: () => <StackBackButton fallbackHref="/(tabs)/add" />,
          }}
        />
        <Stack.Screen
          name="wardrobe-add"
          options={{
            title: '录入衣橱',
            headerBackVisible: false,
            headerLeft: () => <StackBackButton fallbackHref="/(tabs)/add" />,
          }}
        />
        <Stack.Screen
          name="coordinates"
          options={{
            title: '我的搭配',
            headerBackVisible: false,
            headerLeft: () => <StackBackButton fallbackHref="/(tabs)/add" />,
          }}
        />
        <Stack.Screen
          name="coordinate/[id]"
          options={{
            title: '编辑搭配',
            headerBackVisible: false,
            headerLeft: () => <StackBackButton fallbackHref="/coordinates" />,
          }}
        />
        <Stack.Screen
          name="user/[id]"
          options={{
            title: '用户',
            headerBackVisible: false,
            headerLeft: () => <StackBackButton />,
          }}
        />
        <Stack.Screen name="login" options={{ title: '登录', presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <WardrobeProvider>
          <RootNavigator />
        </WardrobeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
