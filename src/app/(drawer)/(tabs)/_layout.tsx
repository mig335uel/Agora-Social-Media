import { Tabs, useNavigation } from 'expo-router';
import { Ionicons, Octicons } from '@expo/vector-icons';
import {
  StyleSheet,
  useColorScheme,
  View,
  DeviceEventEmitter,
} from 'react-native';
import { BlurView } from 'expo-blur';
import useAuth from '@/hooks/useAuth';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@lib/supbase/supabase';
import { LiquidGlassIndicator } from '@/Components/LiquidGlassTabBar';

// Tabs visibles (mismo orden que las Tabs.Screen con href != null)
const VISIBLE_TABS = ['feed', 'search', 'newpost', 'notifications', 'profile'];

export default function TabLayout() {
  const user = useAuth();
  const navigation = useNavigation();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [notificationNumber, setNotificationNumber] = useState<number>(0);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  // ── Medimos el ancho REAL de la barra con onLayout para posicionar
  //    la píldora exactamente sobre cada icono, sin cálculos manuales.
  const [barWidth, setBarWidth] = useState<number>(0);

  const onBarLayout = useCallback((e: any) => {
    setBarWidth(e.nativeEvent.layout.width);
  }, []);

  // ── Badge de notificaciones ────────────────────────────────────────────────
  const fetchNotificationNumber = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('is_read', false);
    if (error) {
      console.error('Error obteniendo notificaciones:', error.message);
    } else {
      setNotificationNumber(data?.length || 0);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchNotificationNumber();

    const subscription = DeviceEventEmitter.addListener('notificationReceived', () => {
      fetchNotificationNumber();
    });

    const readSubscription = DeviceEventEmitter.addListener('notificationsRead', () => {
      setNotificationNumber(0);
    });

    const focusListener = navigation.addListener('focus', () => {
      fetchNotificationNumber();
    });

    return () => {
      subscription.remove();
      readSubscription.remove();
      focusListener();
    };
  }, [user?.id, navigation]);

  // return (
  //   <Tabs
  //     screenListeners={{
  //       tabPress: (e) => {
  //         const tabName = (e.target as string)?.split('-')[0];
  //         const idx = VISIBLE_TABS.indexOf(tabName);
  //         if (idx !== -1) setActiveIndex(idx);
  //       },
  //       state: (e) => {
  //         const routes = e.data?.state?.routes as any[];
  //         const index  = e.data?.state?.index as number;
  //         if (routes && index != null) {
  //           const name = routes[index]?.name;
  //           const idx  = VISIBLE_TABS.indexOf(name);
  //           if (idx !== -1) setActiveIndex(idx);
  //         }
  //       },
  //     }}
  //     screenOptions={{
  //       tabBarStyle: {
  //         position: 'absolute',
  //         backgroundColor: 'transparent',
  //         shadowColor: '#1DA1F2',
  //         shadowOpacity: 0.18,
  //         shadowRadius: 16,
  //         shadowOffset: { width: 0, height: 4 },
  //         backfaceVisibility: 'hidden',
  //         borderStyle: 'solid',
  //         borderWidth: 0.8,
  //         borderColor: isDark ? 'rgba(29,161,242,0.35)' : 'rgba(29,161,242,0.22)',
  //         borderTopColor: isDark ? 'rgba(29,161,242,0.45)' : 'rgba(29,161,242,0.30)',
  //         bottom: 24,
  //         left: 12,
  //         right: 12,
  //         height: 70,
  //         borderRadius: 35,
  //         borderTopWidth: 0,
  //         marginHorizontal: 4,
  //         elevation: 0,
  //       },
  //       tabBarItemStyle: {
  //         height: 70,
  //         justifyContent: 'center',
  //         alignItems: 'center',
  //         paddingTop: 14,
  //       },
  //       tabBarIconStyle: {
  //         justifyContent: 'center',
  //         alignItems: 'center',
  //       },
  //       tabBarBackground: () => (
  //         // onLayout mide el ancho exacto que React Native asigna a la barra
  //         <View style={StyleSheet.absoluteFill} onLayout={onBarLayout}>
  //           {/* Fondo blur — cristal base */}
  //           <BlurView
  //             intensity={100}
  //             tint={isDark ? 'dark' : 'light'}
  //             blurReductionFactor={50}
  //             style={[StyleSheet.absoluteFill, { borderRadius: 30, overflow: 'hidden' }]}
  //           />
  //           {/* Píldora Liquid Glass que salta entre tabs */}
  //           {barWidth > 0 && (
  //             <LiquidGlassIndicator
  //               activeIndex={activeIndex}
  //               tabCount={VISIBLE_TABS.length}
  //               barWidth={barWidth}
  //             />
  //           )}
  //         </View>
  //       ),
  //       tabBarShowLabel: false,
  //       headerShown: false,

  //     }}
  //   >
  //     <Tabs.Screen name="feed" options={{
  //       title: 'Feed',
  //       tabBarIcon: ({ color, size }) => (
  //         <Octicons name="home-fill" size={size} color={color} />
  //       ),
  //     }} />
  //     <Tabs.Screen name="index" options={{ href: null }} />
  //     <Tabs.Screen name="search" options={{
  //       title: 'Buscar',
  //       tabBarIcon: ({ color, size }) => (
  //         <Octicons name="search" size={size} color={color} />
  //       ),
  //     }} />
  //     <Tabs.Screen name="newpost" options={{
  //       title: 'Nuevo Post',
  //       tabBarIcon: ({ color, size }) => (
  //         <Ionicons name="add-circle" size={size} color={color} />
  //       ),
  //     }} />
  //     <Tabs.Screen name="notifications" options={{
  //       title: 'Notificaciones',
  //       tabBarIcon: ({ color, size }) => (
  //         <Octicons name="bell-fill" size={size} color={color} />
  //       ),
  //       tabBarBadge: notificationNumber > 0 ? notificationNumber : undefined,
  //       tabBarBadgeStyle: {
  //         backgroundColor: '#ff0000',
  //         color: '#fff',
  //       },
  //     }} />
  //     <Tabs.Screen name="profile" options={{
  //       title: 'Perfil',
  //       tabBarIcon: ({ color, size }) => (
  //         <Octicons name="person-fill" size={size} color={color} />
  //       ),
  //     }} />
  //   </Tabs>
  // );
  return (
    <Tabs
      
      screenOptions={{
        tabBarStyle: {
          position: 'relative',
          backgroundColor: isDark ? "#000000" : "#ffffff",
          borderTopColor: isDark ? "#000000" : "#ffffff",
          
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 8,
        },
        tabBarIconStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        
        tabBarShowLabel: false,
        headerShown: false,

      }}
    >
      <Tabs.Screen name="feed" options={{
        title: 'Feed',
        tabBarIcon: ({ color, size }) => (
          <Octicons name="home-fill" size={size} color={color} />
        ),
      }} />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="search" options={{
        title: 'Buscar',
        tabBarIcon: ({ color, size }) => (
          <Octicons name="search" size={size} color={color} />
        ),
      }} />
      <Tabs.Screen name="newpost" options={{
        title: 'Nuevo Post',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="add-circle" size={size} color={color} />
        ),
      }} />
      <Tabs.Screen name="notifications" options={{
        title: 'Notificaciones',
        tabBarIcon: ({ color, size }) => (
          <Octicons name="bell-fill" size={size} color={color} />
        ),
        tabBarBadge: notificationNumber > 0 ? notificationNumber : undefined,
        tabBarBadgeStyle: {
          backgroundColor: '#ff0000',
          color: '#fff',
        },
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Perfil',
        tabBarIcon: ({ color, size }) => (
          <Octicons name="person-fill" size={size} color={color} />
        ),
      }} />
      {/* Pantallas puente para iPad — ocultas en la tab bar de Android/iPhone */}
      <Tabs.Screen name="messaging" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}