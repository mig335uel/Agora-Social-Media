import React from 'react';
import { View, Text, Pressable, StyleSheet, useColorScheme, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { signOut } from '@/Services/authService';

function DrawerButton({ label, onPress }: { label: string; onPress: () => void }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.buttonText, { color: isDark ? '#fff' : '#111' }]}>{label}</Text>
    </Pressable>
  );
}

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const handleGoHome = () => {
    props.navigation.closeDrawer();
    router.push('/'); // cae en /(drawer)/(tabs) por tu estructura
  };

  const handleSignOut = async () => {
    try {
      props.navigation.closeDrawer();
      await signOut();
      router.replace('/login');
    } catch (e) {
      Alert.alert('Error', 'No se pudo cerrar sesión.');
    }
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: isDark ? '#000' : '#fff' },
      ]}
    >
      <View style={styles.headerWrap}>
        <BlurView intensity={35} tint={isDark ? 'dark' : 'light'} style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#111' }]}>Agora</Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? '#cfcfcf' : '#444' }]}>
            Menú
          </Text>
        </BlurView>
      </View>

      <View>
        <DrawerButton label="Inicio" onPress={handleGoHome} />
        <DrawerButton
          label="Ajustes (placeholder)"
          onPress={() => {
            props.navigation.closeDrawer();
            // cuando crees la ruta, por ejemplo /(drawer)/(tabs)/settings:
            // router.push('/settings');
          }}
        />
      </View>

      <View style={styles.section}>
        <DrawerButton label="Cerrar sesión" onPress={handleSignOut} />
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  header: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
    borderWidth: 1,
    borderRadius: 100,

    justifyContent: 'center'
  },
  button: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

