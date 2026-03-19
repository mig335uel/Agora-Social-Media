import React from 'react';
import { View, Text, Pressable, StyleSheet, useColorScheme, Alert, TouchableNativeFeedback } from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { BlurView } from 'expo-blur';
import { router, useNavigation } from 'expo-router';
import { signOut } from '@/Services/authService';
import { Octicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import ProfileLayout from '@/app/(drawer)/(tabs)/profile/_layout';
import { PureNativeButton } from 'react-native-gesture-handler';

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
        <TouchableOpacity
          onPress={() => {
            router.push("/(tabs)/profile")
            props.navigation.closeDrawer();
          }}
          
          className='flex-row p-3 gap-3 border rounded-full px-5 shadow-current drop-shadow-sm'

          style={[styles.ButtonProfile, isDark ? { borderColor: '#fff' } : { borderColor: '#000' } ]}
        >
          <Octicons name="person-fill" size={24} color={isDark ? '#fff' : '#000'} />
          <Text className='font-bold text-xl' style={{ color: isDark ? '#fff' : '#000' }}>Perfil</Text>
        </TouchableOpacity>

      </View>
      
      <View style={styles.section}>
          <TouchableNativeFeedback className={`border border-white rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}>
            <Text className={`font-bold text-xl ${isDark ? 'text-white' : 'text-black'}`}>Hola</Text>

          </TouchableNativeFeedback>
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
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconRowText: {
    fontSize: 15,
    fontWeight: '700',
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

  ButtonProfile: {
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,

  }
});

