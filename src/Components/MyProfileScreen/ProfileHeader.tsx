import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Usuario } from '@/Types/Users';
import { supabase } from '@/lib/supbase/supabase';
import { useProfileRefresh } from '@/Controller/_context';


import { toggleFollow } from '@/Services/UserService';
import useAuth from '@/hooks/useAuth';

interface ProfileHeaderProps {
  user?: Usuario;
  isMe?: boolean;
  isFollowing?: boolean;
  onFollowChange?: (following: boolean) => void;
}

export default function ProfileHeader({ user, isMe, isFollowing, onFollowChange }: ProfileHeaderProps) {
  const { colorScheme } = useColorScheme();
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
      const nowFollowing = await toggleFollow(currentUser.id, userId);
      if (onFollowChange) onFollowChange(nowFollowing);
      
      // Update local followers count optionally
      setStats(prev => ({
        ...prev,
        followers: prev.followers + (nowFollowing ? 1 : -1)
      }));
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setFollowLoading(false);
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
          <Text className="text-3xl font-black text-black dark:text-white text-center">

            {user?.display_name || 'Agora User'} {user?.is_verified === true ? <Ionicons name="checkmark-circle" size={24} color="#3b82f6" /> : null}
          </Text>
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
                className="flex-row items-center gap-2 px-6 py-3 bg-black dark:bg-white rounded-2xl"
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={18} color={isDark ? '#000' : '#fff'} />
                <Text className="text-white dark:text-black font-bold">editar perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl"
                activeOpacity={0.8}
              >
                <Ionicons name="settings-outline" size={20} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                className={`flex-row items-center gap-2 px-10 py-3 rounded-2xl ${isFollowing ? 'bg-gray-200 dark:bg-gray-800' : 'bg-black dark:bg-white'}`}
                activeOpacity={0.8}
                onPress={handleToggleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={isFollowing ? (isDark ? '#fff' : '#000') : (isDark ? '#000' : '#fff')} />
                ) : (
                  <>
                    <Ionicons 
                      name={isFollowing ? "person-remove-outline" : "person-add-outline"} 
                      size={18} 
                      color={isFollowing ? (isDark ? '#fff' : '#000') : (isDark ? '#000' : '#fff')} 
                    />
                    <Text className={`font-bold ${isFollowing ? 'text-black dark:text-white' : 'text-white dark:text-black'}`}>
                      {isFollowing ? 'dejar de seguir' : 'seguir'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl"
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={20} color={isDark ? '#fff' : '#000'} />
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
              <Text className="text-[10px] font-bold text-gray-500 uppercase">publicaciones</Text>
            </View>
            <View className="w-[1px] bg-gray-200/50 dark:bg-white/10 my-4" />
            <View className="flex-1 p-4 items-center">
              <Text className="text-xl font-black text-black dark:text-white">{stats.followers}</Text>
              <Text className="text-[10px] font-bold text-gray-500 uppercase">seguidores</Text>
            </View>
            <View className="w-[1px] bg-gray-200/50 dark:bg-white/10 my-4" />
            <View className="flex-1 p-4 items-center">
              <Text className="text-xl font-black text-black dark:text-white">{stats.following}</Text>
              <Text className="text-[10px] font-bold text-gray-500 uppercase">seguidos</Text>
            </View>
          </BlurView>
        ) : (
          <View className="mx-4 mt-8 flex-row rounded-3xl overflow-hidden border border-gray-200/50 dark:border-white/10">
            <View className="flex-1 p-4 items-center">
              <Text className="text-xl font-black text-black dark:text-white">{stats.posts}</Text>
              <Text className="text-[10px] font-bold text-gray-500 uppercase">publicaciones</Text>
            </View>
            <View className="w-[1px] bg-gray-200/50 dark:bg-white/10 my-4" />
            <View className="flex-1 p-4 items-center">
              <Text className="text-xl font-black text-black dark:text-white">{stats.followers}</Text>
              <Text className="text-[10px] font-bold text-gray-500 uppercase">seguidores</Text>
            </View>
            <View className="w-[1px] bg-gray-200/50 dark:bg-white/10 my-4" />
            <View className="flex-1 p-4 items-center">
              <Text className="text-xl font-black text-black dark:text-white">{stats.following}</Text>
              <Text className="text-[10px] font-bold text-gray-500 uppercase">seguidos</Text>
            </View>
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
