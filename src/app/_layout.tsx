import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supbase/supabase';
import { View, ActivityIndicator, Appearance } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import "../../global.css";
export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    // Tema inicial al abrir la app
    const colorTheme = Appearance.getColorScheme();
    if (colorTheme) {
      setColorScheme(colorTheme as "light" | "dark" | "system");
    }

    // Escuchador en tiempo real (CRÍTICO para Android)
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) {
        setColorScheme(colorScheme as "light" | "dark" | "system");
      }
    });

    // Limpieza del escuchador cuando se desmonta
    return () => subscription.remove();
  }, [setColorScheme]);
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: isDark ? '#141414' : '#fff' } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(drawer)" />
    </Stack>
  );
}