
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, Image, ActivityIndicator, useColorScheme, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { signOut } from '@/Services/authService';
import CreatePostScreen from '@/Components/createPosts';
import { getForYouFeed, RankedPost } from '@/Services/FeedService';
import { recordInteractions, InteractionPayload } from '@/Services/InteractionService';
import useAuth from '@/hooks/useAuth';
import { Usuario } from '@/Types/Users';
import UserAvatar from '@/Components/UserAvatar';
import AppBar from '@/Components/AppBar';

import PostCard from '@/Components/Posts/PostsCard';
import { Post } from '@/Types/Posts';


export default function ForYou() {
    const [posts, setPosts] = useState<RankedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    // Tracking de dwell time
    const visibleItems = useRef<Set<string>>(new Set());
    const dwellBuffer = useRef<{ [postId: string]: number }>({});
    const lastSyncTime = useRef(Date.now());
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

    const PAGE_SIZE = 20;

    const fetchFeed = useCallback(async () => {
        try {
            const feed = await getForYouFeed(PAGE_SIZE, 0);
            setPosts(feed);
            setHasMore(feed.length >= PAGE_SIZE);
        } catch (error) {
            console.error("Error fetching feed:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const fetchMorePosts = useCallback(async () => {
        if (loadingMore || !hasMore || loading || refreshing) return;

        setLoadingMore(true);
        try {
            const nextOffset = posts.length;
            const newPosts = await getForYouFeed(PAGE_SIZE, nextOffset);
            if (!newPosts || newPosts.length === 0) {
                setHasMore(false);
            } else {
                setPosts(prevPosts => {
                    const existingIds = new Set(prevPosts.map(p => p.id));
                    const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
                    return [...prevPosts, ...uniqueNewPosts];
                });
                if (newPosts.length < PAGE_SIZE) {
                    setHasMore(false);
                }
            }
        } catch (error) {
            console.error("Error fetching more posts:", error);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, loading, refreshing, posts.length]);

    useFocusEffect(
        useCallback(() => {
            fetchFeed();
        }, [])
    );

    useEffect(() => {
        // Timer para acumular dwell time cada segundo
        const timer = setInterval(() => {
            visibleItems.current.forEach(postId => {
                dwellBuffer.current[postId] = (dwellBuffer.current[postId] || 0) + 1;
            });

            // Sincronizar con Supabase cada 30 segundos si hay datos
            if (Date.now() - lastSyncTime.current > 30000) {
                syncInteractions();
            }
        }, 1000);

        return () => {
            clearInterval(timer);
            syncInteractions(); // Sincronización final
        };
    }, []);

    const syncInteractions = async () => {
        const payload: InteractionPayload[] = Object.keys(dwellBuffer.current).map(postId => ({
            post_id: postId,
            dwell_time_seconds: dwellBuffer.current[postId]
        }));

        if (payload.length > 0) {
            await recordInteractions(payload);
            dwellBuffer.current = {}; // Limpiamos buffer
            lastSyncTime.current = Date.now();
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchFeed();
        setRefreshing(false);
    }, [fetchFeed]);

    const logout = async () => {
        try {
            const results = await signOut();
            if (results) router.replace('/login');
        } catch (error) {
            console.log(error);
        }
    }

    // Configuración para detectar qué items son visibles
    const onViewableItemsChanged = useCallback(({ viewableItems: currentlyViewable }: any) => {
        const newVisible = new Set<string>();
        currentlyViewable.forEach((item: any) => {
            if (item.item && item.item.id) newVisible.add(item.item.id);
        });
        visibleItems.current = newVisible;
    }, []);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 70, // Se considera visible si aparece el 70% del post
        minimumViewTime: 1500,           // Exige al menos 1.5s antes de considerar el post como visto
    }).current;

    return (
        <View style={{ flex: 1 }} className={`h-full ${isDark ? 'bg-black' : 'bg-white'}`}>
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#1DA1F2" />
                </View>
            ) : posts.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Ionicons name="chatbubbles-outline" size={80} color={isDark ? '#333' : '#eee'} />
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#fff' : '#000', marginTop: 10 }}>
                        No hay publicaciones aún
                    </Text>
                    <Text style={{ textAlign: 'center', color: isDark ? '#999' : '#666', marginTop: 5 }}>
                        Sé el primero en compartir algo con la comunidad o espera a que otros publiquen.
                    </Text>
                    <TouchableOpacity 
                        style={{ marginTop: 20, backgroundColor: '#1DA1F2', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
                        onPress={() => router.push('/(drawer)/post/create')}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Crear Publicación</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <PostCard 
                    posts={posts} 
                    onRefresh={onRefresh} 
                    refreshing={refreshing} 
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    onEndReached={fetchMorePosts}
                    onEndReachedThreshold={0.5}
                    loadingMore={loadingMore}
                />
            )}
        </View>
    );
}
