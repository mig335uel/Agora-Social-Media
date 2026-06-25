import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
  Image,
} from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { router } from 'expo-router';
import { signOut } from '@/Services/authService';
import { Ionicons } from '@expo/vector-icons';
import useAuth from '@/hooks/useAuth';
import { supabase } from '@/lib/supbase/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────────────────────────────
// Ítem de menú — mismo aspecto que SettingItem en settings/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
function DrawerItem({
  icon,
  label,
  onPress,
  isDestructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
}) {
  const isDark = useColorScheme() === 'dark';
  const textColor = isDestructive ? '#ef4444' : isDark ? '#e5e7eb' : '#1f2937';
  const iconBg = isDestructive
    ? isDark
      ? 'rgba(239,68,68,0.15)'
      : '#fee2e2'
    : isDark
      ? '#1f2937'
      : '#f3f4f6';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.item,
        { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
      ]}
    >
      {/* Ícono circular */}
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={textColor} />
      </View>

      {/* Texto */}
      <Text style={[styles.itemLabel, { color: textColor, flex: 1 }]}>{label}</Text>

      {/* Chevron (solo en no-destructivos) */}
      {!isDestructive && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDark ? '#4b5563' : '#9ca3af'}
        />
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer principal
// ─────────────────────────────────────────────────────────────────────────────
export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const isDark = useColorScheme() === 'dark';
  const user = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [counts, setCounts] = useState<{ following: number; followers: number } | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user?.id) return;

    // Datos del perfil
    supabase
      .from('users')
      .select('display_name, username, profile_picture_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });

    // Seguidores y seguidos en paralelo
    Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    ]).then(([following, followers]) => {
      setCounts({
        following: following.count ?? 0,
        followers: followers.count ?? 0,
      });
    });
  }, [user?.id]);

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres desconectar tu cuenta de este dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            props.navigation.closeDrawer();
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#000' : '#fff' }]}>

      {/* ── Cabecera fija de perfil (FUERA del ScrollView) ── */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          router.push('/(drawer)/(tabs)/profile');
          props.navigation.closeDrawer();
        }}
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            backgroundColor: isDark ? '#000' : '#fff',
            borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          },
        ]}
      >
        {/* Avatar */}
        {profile?.profile_picture_url ? (
          <Image source={{ uri: profile.profile_picture_url }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarPlaceholder,
              { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' },
            ]}
          >
            <Ionicons name="person" size={30} color={isDark ? '#4b5563' : '#9ca3af'} />
          </View>
        )}

        {/* Nombre + username + stats */}
        <View style={styles.headerTexts}>
          {profile ? (
            <>
              <Text
                style={[styles.displayName, { color: isDark ? '#fff' : '#000' }]}
                numberOfLines={1}
              >
                {profile.display_name}
              </Text>
              <Text
                style={[styles.username, { color: isDark ? '#9ca3af' : '#6b7280' }]}
                numberOfLines={1}
              >
                @{profile.username}
              </Text>

              {counts !== null && (
                <View style={styles.statsRow}>
                  <Text style={[styles.statNumber, { color: isDark ? '#fff' : '#000' }]}>
                    {counts.following.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                    {' '}Siguiendo{'  '}
                  </Text>
                  <Text style={[styles.statNumber, { color: isDark ? '#fff' : '#000' }]}>
                    {counts.followers.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                    {' '}Seguidores
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <View
                style={[
                  styles.skeleton,
                  { width: 130, height: 17, marginBottom: 8, backgroundColor: isDark ? '#374151' : '#e5e7eb' },
                ]}
              />
              <View
                style={[
                  styles.skeleton,
                  { width: 85, height: 13, backgroundColor: isDark ? '#374151' : '#e5e7eb' },
                ]}
              />
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* ── Lista de opciones (scrollable) ── */}
      <DrawerContentScrollView
        {...props}
       
        contentContainerStyle={{ paddingTop: 3, paddingBottom: 0 }}
      >
        <View style={{ paddingTop: 0 }}>
          <DrawerItem
            icon="home-outline"
            label="Inicio"
            onPress={() => {
              router.push('/(drawer)/(tabs)/index');
              props.navigation.closeDrawer();
            }}
          />
          <DrawerItem
            icon="person-outline"
            label="Mi Perfil"
            onPress={() => {
              router.push('/(drawer)/(tabs)/profile');
              props.navigation.closeDrawer();
            }}
          />
          <DrawerItem
            icon="chatbubbles-outline"
            label="Mensajes"
            onPress={() => {
              router.push('/messaging' as any);
              props.navigation.closeDrawer();
            }}
          />
          <DrawerItem
            icon="settings-outline"
            label="Ajustes y privacidad"
            onPress={() => {
              router.push('/(drawer)/settings');
              props.navigation.closeDrawer();
            }}
          />
        </View>
      </DrawerContentScrollView>


      {/* ── Footer fijo: Cerrar sesión ── */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            paddingBottom: insets.bottom || 24,
          },
        ]}
      >
        <DrawerItem
          icon="log-out-outline"
          label="Cerrar sesión"
          isDestructive
          onPress={handleSignOut}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  displayName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 3,
  },
  username: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '400',
  },
  skeleton: {
    borderRadius: 4,
  },
  // Items
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Footer
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
  },
});
