import { Tabs } from 'expo-router';
import {
  CalendarDays,
  Home,
  Plus,
  Shirt,
  UserRound,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

function PlusButton({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.plusWrap, focused && styles.plusFocused]}>
      <Plus color={colors.white} size={28} strokeWidth={2.5} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.carmine,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        sceneStyle: { backgroundColor: colors.cream },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          headerTitle: 'Petticoat',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: '衣橱',
          tabBarIcon: ({ color, size }) => <Shirt color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '发布',
          tabBarIcon: ({ focused }) => <PlusButton focused={focused} />,
          tabBarLabel: '发布',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: '日历',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  plusWrap: {
    width: 52,
    height: 52,
    marginTop: -16,
    borderRadius: 18,
    backgroundColor: colors.carmine,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  plusFocused: {
    backgroundColor: colors.carmineDeep,
  },
});
