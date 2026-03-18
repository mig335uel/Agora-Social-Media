import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome, Octicons } from '@expo/vector-icons';
import { Platform, StyleSheet, useColorScheme, View, Text, Button, TouchableOpacity } from 'react-native';
import { GlassContainer, GlassView } from 'expo-glass-effect';
import { NativeTabs } from 'expo-router/build/native-tabs';
import "/global.css";
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeTabsBottomAccessory } from 'expo-router/build/native-tabs/common/elements';





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
            backgroundColor: isDark ? '#000' : '#fff',

            shadowColor: isDark ? '#fff' : '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            backfaceVisibility: 'hidden',
            borderStyle: 'solid',
            borderTopColor: isDark ? '#fff' : '#000',

          },

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


        <Tabs.Screen name="feed" options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => (
            <Octicons name="home-fill" size={size} color={color} />
          ),
        }} />
        <Tabs.Screen name="index" options={{
          href: null, // Ocultamos el index si vamos a usar /feed
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
    <>
      <NativeTabs backgroundColor={isDark ? '#141414' : '#fff'} 

      >
        <NativeTabs.Trigger
          name="feed"
        >
          <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          name="search">
          <NativeTabs.Trigger.Label>Buscar</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}