import { Tabs, useNavigation } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome, Octicons } from '@expo/vector-icons';
import { Platform, StyleSheet, useColorScheme, View, Text, Button, TouchableOpacity, Pressable, DeviceEventEmitter } from 'react-native';
import { GlassContainer, GlassView } from 'expo-glass-effect';
import { NativeTabTrigger, NativeTabs } from 'expo-router/build/native-tabs';
import "/global.css";
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeTabsBottomAccessory } from 'expo-router/build/native-tabs/common/elements';
import { signOut } from '@/Services/authService';
import { BlurView } from 'expo-blur';
import useAuth from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@lib/supbase/supabase'
import * as Device from 'expo-device';

export default function TabLayout() {
  const user = useAuth();
  const navigation = useNavigation();
  const [notificationNumber, setNotificationNumber] = useState<number>(0);

  const fetchNotificationNumber = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase.from('notifications').select('*').eq('receiver_id', user.id).eq('is_read', false);

    if (error) {
      console.error("Error obteniendo notificaciones:", error.message);
    } else {
      setNotificationNumber(data?.length || 0);
    }
  }
  useEffect(() => {
    if (!user?.id) return;

    fetchNotificationNumber();

    // 1. Escuchar el evento que mandamos desde el RootLayout cuando llega un push
    const subscription = DeviceEventEmitter.addListener('notificationReceived', () => {
      fetchNotificationNumber();
    });

    // 2. Cuando el usuario abre la pantalla de notificaciones y las marca como leídas,
    //    reseteamos el badge directamente a 0 sin necesidad de volver a consultar la BD.
    const readSubscription = DeviceEventEmitter.addListener('notificationsRead', () => {
      setNotificationNumber(0);
    });

    // 3. Refrescar cuando la pantalla gana el foco (por si venimos de leer las notis)
    const focusListener = navigation.addListener('focus', () => {
      fetchNotificationNumber();
    });

    return () => {
      subscription.remove();
      readSubscription.remove();
      focusListener();
    };
  }, [user?.id, navigation]);
  const isIOS = Platform.OS === 'ios';
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const isTablet = Device.deviceType === Device.DeviceType.TABLET;

  return (
    <>
      <NativeTabs backgroundColor={isDark ? '#141414' : '#fff'} labelVisibilityMode={isTablet ? 'labeled' : 'unlabeled'} sidebarAdaptable>
        <NativeTabs.Trigger name="feed">
          <NativeTabs.Trigger.Label hidden={!isTablet}>Inicio</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="search">
          <NativeTabs.Trigger.Label hidden={!isTablet}>Explorar</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="newpost">
          <NativeTabs.Trigger.Label hidden={!isTablet}>Publicar</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="plus.circle.fill" md="add" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="notifications">
          <NativeTabs.Trigger.Label hidden={!isTablet}>Notificaciones</NativeTabs.Trigger.Label>
          {notificationNumber > 0 && (
            <NativeTabs.Trigger.Badge>{notificationNumber.toString()}</NativeTabs.Trigger.Badge>
          )}
          <NativeTabs.Trigger.Icon sf="bell.fill" md="add" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Label hidden={!isTablet}>Cuenta</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
        </NativeTabs.Trigger>

        {/* ── Solo iPad: items extra que en iPhone están en el Drawer ── */}
        {isTablet && (
          <NativeTabs.Trigger name="messaging">
            <NativeTabs.Trigger.Label>Mensajes</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right.fill" md="chat" />
          </NativeTabs.Trigger>
        )}

        {isTablet && (
          <NativeTabs.Trigger name="settings">
            <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
          </NativeTabs.Trigger>
        )}
      </NativeTabs >
    </>
  );
}