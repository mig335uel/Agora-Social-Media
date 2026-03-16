import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { GlassContainer, GlassView } from 'expo-glass-effect';
import { NativeTabs } from 'expo-router/build/native-tabs';





export default function TabLayout() {

  // Guardamos si es iOS en una constante para que el código quede más limpio
  const isIOS = Platform.OS === 'ios';

  return (
    <NativeTabs backgroundColor={isIOS ? 'transparent' : '#141414'}
      
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