import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supbase/supabase';
import { View, ActivityIndicator, Appearance, useColorScheme } from 'react-native';
import { useState } from 'react';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import "../../global.css";
import { requestNotificationPermission, saveDeviceToken } from '@/Services/NotificacitonService';
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const notificationListener = useRef<Notifications.EventSubscription>(null);
  const responseListener = useRef<Notifications.EventSubscription>(null);
  useEffect(() => {
    // Escuchar cambios de sesión en tiempo real
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    const registrarDispositivo = async () => {
      // Como estamos dentro del componente, "session" sí existe aquí
      if (session?.user) {
        console.log("Sesión detectada, verificando token de notificaciones...");
        const token = await requestNotificationPermission();
        
        if (token) {
          await saveDeviceToken(session.user.id, token);
        }
      }
    };

    registrarDispositivo();
  }, [session]);
  useEffect(() => {
    // 2. Cuando LLEGA una notificación (App abierta en pantalla)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notificación en pantalla:', notification.request.content.title);
    });

    // 3. Cuando el usuario TOCA la notificación (App abierta, en segundo plano o cerrada)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('👆 Usuario tocó la notificación. Datos:', data);

      // Extraemos el postId que envías desde Node.js
      if (data && data.postId) {
        console.log(`Navegando al post ID: ${data.postId}`);
        // Redirigimos al post exacto dentro de tu Drawer
        router.push(`/post/${data.postId}`);
      }
    });

    // 4. Limpieza de memoria (Vital en React Native)
    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(drawer)';

    if (!session && inAuthGroup) {
      // Si no hay sesión y quiere entrar a la red social -> Al Login
      router.replace('/login');
    } else if (session && segments[0] !== '(drawer)') {
      // Si hay sesión y está en login -> Al Muro Principal
      router.replace('/');
    }
  }, [session, loading, segments]);
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: isDark ? '#141414' : '#fff' } }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(drawer)" />
      </Stack>
    </>
  );
}