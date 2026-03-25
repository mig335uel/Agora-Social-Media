import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supbase/supabase';
import { View, ActivityIndicator, Appearance, useColorScheme } from 'react-native';
import { useState } from 'react';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import "../../global.css";
export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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
  useEffect(() => {
    // 2. Escuchar cuando LLEGA la notificación (App en primer plano)
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notificación recibida en primer plano:', notification.request.content.title);
      // Aquí podrías actualizar un contador rojo de notificaciones en tu menú, por ejemplo.
    });

    // 3. Escuchar cuando el usuario TOCA la notificación (App abierta o en segundo plano)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // Aquí extraemos exactamente el "data" que mandaste desde Node.js
      const data = response.notification.request.content.data;
      console.log('👆 Usuario tocó la notificación. Datos:', data);

      // Si viene el postId, navegamos directamente a esa publicación
      if (data && data.postId) {
        console.log(`Navegando al post ID: ${data.postId}`);

        // EJEMPLO CON EXPO ROUTER:
        // router.push(`/agoras/post/${data.postId}`);

        // EJEMPLO CON REACT NAVIGATION:
        // navigation.navigate('PostDetail', { id: data.postId });
      }
    });

    // 4. Limpiar los escuchadores cuando se cierra el componente (Buenas prácticas)
  }, []);
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