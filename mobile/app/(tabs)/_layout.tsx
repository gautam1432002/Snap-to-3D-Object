import React from 'react';
import { Tabs } from 'expo-router';
import { GlassTabBar } from '../../components/GlassTabBar';
import { Colors } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.skyMid },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="creations" options={{ title: 'Vault' }} />
      <Tabs.Screen name="settings" options={{ title: 'Setup' }} />
    </Tabs>
  );
}
