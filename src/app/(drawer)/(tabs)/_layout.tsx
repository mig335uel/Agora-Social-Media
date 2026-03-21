import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome, Octicons } from '@expo/vector-icons';
import { Platform, StyleSheet, useColorScheme, View, Text, Button, TouchableOpacity, Pressable } from 'react-native';
import { GlassContainer, GlassView } from 'expo-glass-effect';
import { NativeTabTrigger, NativeTabs } from 'expo-router/build/native-tabs';
import "/global.css";
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeTabsBottomAccessory } from 'expo-router/build/native-tabs/common/elements';
import { signOut } from '@/Services/authService';
import { BlurView } from 'expo-blur';


export default function TabLayout() {

  // Guardamos si es iOS en una constante para que el código quede más limpio
  const isIOS = Platform.OS === 'ios';
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  if (Platform.OS === 'android') {
    return (
      <Tabs

        screenOptions={{

          tabBarStyle: {
            position: 'absolute',
            backgroundColor: isDark
              ? 'rgba(0, 0, 0, 0.5)'
              : 'rgba(255, 255, 255, 0.5)',

            shadowColor: isDark ? '#fff' : '#000',
            backfaceVisibility: 'hidden',
            borderStyle: 'dashed',
            borderTopColor: isDark ? '#fff' : '#000',
            bottom: 20,           // Margen inferior
            left: 20,             // Margen izquierdo
            right: 20,            // Margen derecho
            height: 60,           // Altura fija
            borderRadius: 30,     // Bordes muy redondeados
            borderTopWidth: 0,
            marginHorizontal: 10,
            elevation: 0,         // Quitar sombra en Android
            overflow: 'hidden',
          },
          tabBarItemStyle: {
            height: 60,
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 12, // Push icon down to center it visually without label
          },
          tabBarIconStyle: {
            justifyContent: 'center',
            alignItems: 'center',
          },

          tabBarBackground: () => (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              blurReductionFactor={50}
              style={StyleSheet.absoluteFill}
            />
          ),

          tabBarShowLabel: false,
          headerShown: false,

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

        <Tabs.Screen name="newpost" options={{
          title: "Nuevo Post",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }} />


        <Tabs.Screen name="search" options={{
          title: "Buscar",
          tabBarIcon: ({ color, size }) => (
            <Octicons name="search" size={size} color={color} />
          ),
        }} />
        <Tabs.Screen name="profile" options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Octicons name="person-fill" size={size} color={color} />
          ),
        }} />
      </Tabs>
    );
  }

  return (
    <>
      <NativeTabs backgroundColor={isDark ? '#141414' : '#fff'}>
        <NativeTabs.Trigger name="feed">
          <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="search" role="search">
          <NativeTabs.Trigger.Label>Explorar</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="newpost">
          <NativeTabs.Trigger.Label>Publicar</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="plus.circle.fill" md="add" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Label>Cuenta</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
        </NativeTabs.Trigger>
      </NativeTabs >
    </>
  );
}