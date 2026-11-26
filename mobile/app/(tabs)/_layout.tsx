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
        sceneStyle: { backgroundColor: Colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Studio' }} />
      <Tabs.Screen name="creations" options={{ title: 'Creations' }} />
      <Tabs.Screen name="badges" options={{ title: 'Badges' }} />
      <Tabs.Screen name="guide" options={{ title: 'Guide' }} />
    </Tabs>
  );
}
