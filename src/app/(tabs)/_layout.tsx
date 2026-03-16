import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome, Octicons } from '@expo/vector-icons';
import { Platform, StyleSheet, useColorScheme, View, Text } from 'react-native';
import { GlassContainer, GlassView } from 'expo-glass-effect';
import { NativeTabs } from 'expo-router/build/native-tabs';
import "../../../global.css";
import { SafeAreaView } from 'react-native-safe-area-context';





export default function TabLayout() {

  // Guardamos si es iOS en una constante para que el código quede más limpio
  const isIOS = Platform.OS === 'ios';
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const backgroundIOSStyle = {
    backgroundColor: 'transparent',

  }

  if (Platform.OS === 'android') {
    return (
      <Tabs

        screenOptions={{
          tabBarStyle: {
            backgroundColor: isDark ? '#141414' : '#fff',
            overflow: 'visible',
            shadowColor: isDark ? '#fff' : '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            backfaceVisibility: 'hidden',
            borderStyle: 'solid',
            borderTopColor: 'transparent',
            
          },
          tabBarActiveTintColor: isDark ? '#00FF00' : '#00FF00',
          tabBarInactiveTintColor: isDark ? '#008000' : '#008000',
          tabBarShowLabel: false,
          headerShown: false,
          tabBarVisibilityAnimationConfig: {
            hide: {
              
              animation: 'spring',
              config: {
                damping: 13,
                stiffness: 144,
                mass: 1,
              }
            },
            show: {
              animation: 'spring',
              config: {
                damping: 13,
                stiffness: 144,
                mass: 1,
              }
            }

          }

        }}
      >


        <Tabs.Screen name="index" options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Octicons name="home-fill" size={size} color={color} />

          ),

        }} />
        <Tabs.Screen name="search" options={{
          title: "Buscar",
          tabBarIcon: ({ color, size }) => (
            <Octicons name="search" size={size} color={color} />
          ),
        }} />
      </Tabs>
    );
  }

  return (
    <NativeTabs backgroundColor={isIOS ? 'transparent' : isDark ? '#141414' : '#fff'} tintColor={isDark ? '#fff' : '#000'}

    >
      <NativeTabs.Trigger
        name="index"
      >
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="search"

      >
        <NativeTabs.Trigger.Label>Buscar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}