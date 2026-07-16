import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, useColorScheme, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Usuario } from '@/Types/Users';
import { supabase } from '@/lib/supbase/supabase';
import { useProfileRefresh } from '@/Controller/_context';


import { toggleFollow, blockUser, unblockUser } from '@/Services/UserService';
import useAuth from '@/hooks/useAuth';
import VerifiedBadge from '@/Components/verifiedBadge';

interface ProfileHeaderProps {
  user?: Usuario;
  isMe?: boolean;
  isFollowing?: boolean;
  isPending?: boolean;
  isBlocked?: boolean;
  onFollowChange?: (following: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
  onBlockChange?: (blocked: boolean) => void;
}

export default function ProfileHeader({ user, isMe, isFollowing, isPending, isBlocked, onFollowChange, onPendingChange, onBlockChange }: ProfileHeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const currentUser = useAuth();
  const userId = useMemo(() => user?.id, [user?.id]);
  const effectiveIsMe = isMe ?? (currentUser?.id === userId);

  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);



  const fetchData = useCallback(async (isPullToRefresh = false) => {
    if (!userId) return;

    if (isPullToRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const [postsCountRes, followersCountRes, followingCountRes] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
      ]);

      setStats({
        posts: postsCountRes.count || 0,
        followers: followersCountRes.count || 0,
        following: followingCountRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleFollow = async () => {
    if (!currentUser || !userId || effectiveIsMe || followLoading) return;

    setFollowLoading(true);
    try {
      const { toggleFollow, FollowsPrivateUsers, cancelFollowRequest } = require('@/Services/UserService');

      if (isFollowing) {
        const nowFollowing = await toggleFollow(currentUser.id, userId);
        if (onFollowChange) onFollowChange(nowFollowing);
        setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      } else if (isPending) {
        await cancelFollowRequest(currentUser.id, userId);
        if (onPendingChange) onPendingChange(false);
      } else if (user?.is_private) {
        await FollowsPrivateUsers(currentUser.id, userId);
        if (onPendingChange) onPendingChange(true);
      } else {
        const nowFollowing = await toggleFollow(currentUser.id, userId);
        if (onFollowChange) onFollowChange(nowFollowing);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error) {
      console.error("Error en handleToggleFollow:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleToggleBlock = () => {
    if (!currentUser || !userId) return;
    if (isBlocked) {
      // Desbloquear
      Alert.alert(
        "Desbloquear usuario",
        `¿Deseas desbloquear a @${user?.username}? Podrá volver a seguirte y ver tu contenido.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Desbloquear",
            onPress: async () => {
              try {
                await unblockUser(currentUser.id, userId);
                if (onBlockChange) onBlockChange(false);
              } catch (e) {
                Alert.alert("Error", "No se pudo desbloquear al usuario.");
              }
            }
          }
        ]
      );
    } else {
      // Bloquear
      Alert.alert(
        "Bloquear usuario",
        `Esta persona no podrá ver tu perfil ni tus publicaciones. ¿Deseas bloquear a @${user?.username}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Bloquear",
            style: "destructive",
            onPress: async () => {
              try {
                await blockUser(currentUser.id, userId);
                if (onBlockChange) onBlockChange(true);
                // Si lo seguia, el follow ya lo borra blockUser
                if (isFollowing && onFollowChange) onFollowChange(false);
                if (isPending && onPendingChange) onPendingChange(false);
                Alert.alert("Usuario bloqueado", "Ya no verás contenido de esta persona.");
              } catch (e) {
                Alert.alert("Error", "No se pudo bloquear al usuario.");
              }
            }
          }
        ]
      );
    }
  };

  const refreshStats = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const { setRefreshStats } = useProfileRefresh();

  // Stability: setRefreshStats should only be called once or when refreshStats changes
  useEffect(() => {
    setRefreshStats(() => refreshStats);
  }, [refreshStats, setRefreshStats]);


  return (

    <View className="items-center pb-6">
      {/* Background Decor - Less 'Twitter Cover', more 'Agora Brand' */}
      <View style={StyleSheet.absoluteFillObject} className="opacity-10">
        <LinearGradient
          colors={isDark ? ['#3b82f6', '#8b5cf6'] : ['#60a5fa', '#a78bfa']}
          style={{ height: 200, width: '100%' }}
        />
      </View>

      <View className="mt-4 items-center">
        {/* Avatar - Rounded Square/Squircle for a different look */}
        <View style={styles.avatarWrapper} className="shadow-2xl">
          <LinearGradient
            colors={['#3b82f6', '#fbbf24']} // Agora Theme Colors?
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}
          >
            {user?.profile_picture_url ? (
              <Image
                source={{ uri: user.profile_picture_url }}
                style={styles.avatar}
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-gray-100 dark:bg-gray-800 m-[2px] rounded-[22px]">
                <Ionicons name="person" size={48} color={isDark ? '#4b5563' : '#9ca3af'} />
              </View>
            )}
          </LinearGradient>
        </View>

        {/* User Identity */}
        <View className="items-center mt-4 px-6">
          <View className="flex-row items-center gap-1">
            <Text className="text-3xl font-black text-black dark:text-white text-center">
              {user?.display_name || 'Agora User'}
            </Text>
            {user?.is_verified === true && (
              <VerifiedBadge width={24} height={24} />
            )}
          </View>
          <View className="flex-row items-center mt-1 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
            <Text className="text-blue-600 dark:text-blue-400 font-bold text-sm italic">
              @{user?.username || 'username'}
            </Text>
          </View>

          {user?.bio !== null && (
            <Text className="mt-4 text-center text-gray-700 dark:text-gray-300 px-4 leading-5 text-sm">
              {user?.bio}
            </Text>
          )}
        </View>

        {/* Action Buttons - Floating Style */}
        <View className="flex-row gap-4 mt-6">
          {effectiveIsMe ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  if (user?.id) {
                    router.push({ pathname: '/(drawer)/editar/[id]', params: { id: user.id } });
                  } else {
                    Alert.alert("Cargando", "Por favor, espera un momento mientras cargamos tus datos.");
                  }
                }}
                className="flex-row items-center gap-2 px-6 py-3 bg-black dark:bg-white rounded-2xl"
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={18} color={isDark ? '#000' : '#fff'} />
                <Text className="text-white dark:text-black font-bold">editar perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl"
                activeOpacity={0.8}
                onPress={() => { router.push('/(drawer)/settings') }}
              >
                <Ionicons name="settings-outline" size={20} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Botón seguir/pendiente/dejar de seguir — oculto si está bloqueado */}
              {!isBlocked && (
                <TouchableOpacity
                  className={`flex-row items-center gap-2 px-10 py-3 rounded-2xl ${isFollowing || isPending ? 'bg-gray-200 dark:bg-gray-800' : 'bg-black dark:bg-white'}`}
                  activeOpacity={0.8}
                  onPress={handleToggleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={isFollowing ? (isDark ? '#fff' : '#000') : (isDark ? '#000' : '#fff')} />
                  ) : (
                    <>
                      <Ionicons
                        name={isFollowing ? "person-remove-outline" : (isPending ? "time-outline" : "person-add-outline")}
                        size={20}
                        color={isFollowing || isPending ? (isDark ? '#fff' : '#000') : (isDark ? '#000' : '#fff')}
                      />
                      <Text className={`font-bold ${isFollowing || isPending ? 'text-black dark:text-white' : 'text-white dark:text-black'}`}>
                        {isFollowing ? 'dejar de seguir' : (isPending ? 'pendiente' : 'seguir')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Botón DM — solo si no está bloqueado */}
              {!isBlocked && (
                <TouchableOpacity
                  className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl"
                  activeOpacity={0.8}
                  onPress={() => {
                    // Navegar al chat con este usuario
                    router.push(`/messaging` as any);
                  }}
                >
                  <Ionicons name="mail-outline" size={20} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
              )}

              {/* Botón bloquear/desbloquear */}
              <TouchableOpacity
                className={`p-3 rounded-2xl ${isBlocked
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                activeOpacity={0.8}
                onPress={handleToggleBlock}
              >
                <Ionicons
                  name={isBlocked ? "lock-open-outline" : "ban-outline"}
                  size={20}
                  color={isBlocked ? '#ef4444' : (isDark ? '#fff' : '#000')}
                />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Stats Section - Card Layout with Blur */}
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 20 : 40}
            tint={isDark ? 'dark' : 'light'}
            className="mx-4 mt-8 flex-row rounded-3xl overflow-hidden border border-gray-200/50 dark:border-white/10"
          >
            <View className="flex-1 p-4 items-center">
              <Text className="text-xl font-black text-black dark:text-white">{stats.posts}</Text>
              <Text className="text-[9.5px] font-bold text-gray-500 uppercase">publicaciones</Text>
            </View>
            <View className="w-[1px] bg-gray-200/50 dark:bg-white/10 my-4" />
            <TouchableOpacity onPress={() => router.push({ pathname: '/perfil/followers', params: { userId: user?.id } })} className="flex-1 p-4 items-center">
              <Text className="text-xl font-black text-black dark:text-white">{stats.followers}</Text>
              <Text className="text-[9.5px] font-bold text-gray-500 uppercase">seguidores</Text>
            </TouchableOpacity>
            <View className="w-[1px] bg-gray-200/50 dark:bg-white/10 my-4" />
            <TouchableOpacity onPress={() => router.push({ pathname: '/perfil/following', params: { userId: user?.id } })} className="flex-1 p-4 items-center">
              <Text className="text-xl font-black text-black dark:text-white">{stats.following}</Text>
              <Text className="text-[9.5px] font-bold text-gray-500 uppercase">seguidos</Text>
            </TouchableOpacity>
          </BlurView>
        ) : (
          <View className="mx-4 mt-8 flex-row rounded-3xl overflow-hidden border border-gray-200/50 dark:border-white/10">
            <View className="flex-1 p-4 items-center">
              <Text className="text-xl font-black text-black dark:text-white">{stats.posts}</Text>
              <Text className="text-[10px] font-bold text-gray-500 uppercase">publicaciones</Text>
            </View>
            <View className="w-[1px] bg-gray-200/50 dark:bg-white/10 my-4" />
            <TouchableOpacity onPress={() => router.push({ pathname: '/perfil/followers', params: { userId: user?.id } })} className="flex-1 p-4 items-center" activeOpacity={0.7}>
              <Text className="text-xl font-black text-black dark:text-white">{stats.followers}</Text>
              <Text className="text-[10px] font-bold text-gray-500 uppercase">seguidores</Text>
            </TouchableOpacity>
            <View className="w-[1px] bg-gray-200/50 dark:bg-white/10 my-4" />
            <TouchableOpacity onPress={() => router.push({ pathname: '/perfil/following', params: { userId: user?.id } })} className="flex-1 p-4 items-center" activeOpacity={0.7}>
              <Text className="text-xl font-black text-black dark:text-white">{stats.following}</Text>
              <Text className="text-[10px] font-bold text-gray-500 uppercase">seguidos</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 24,
    padding: 3,
    backgroundColor: 'transparent',
  },
  avatarGradient: {
    flex: 1,
    borderRadius: 24,
    padding: 3,
  },
  avatar: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  }
});
