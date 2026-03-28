import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getFollowsFeed } from '@/Services/FeedService';
import { recordInteractions, InteractionPayload } from '@/Services/InteractionService';
import useAuth from '@/hooks/useAuth';
import PostCard from '@/Components/Posts/PostsCard';
import { RankedPost } from '@/Services/FeedService';

export default function Follows() {
    const [posts, setPosts] = useState<RankedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Tracking de dwell time
    const visibleItems = useRef<Set<string>>(new Set());
    const dwellBuffer = useRef<{ [postId: string]: number }>({});
    const lastSyncTime = useRef(Date.now());
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const user = useAuth();

    const fetchFeed = useCallback(async () => {
        try {
            const feed = await getFollowsFeed();
            setPosts(feed);
        } catch (error) {
            console.error("Error fetching follows feed:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchFeed();
        }, [fetchFeed])
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

    // Configuración para detectar qué items son visibles
    const onViewableItemsChanged = useCallback(({ viewableItems: currentlyViewable }: any) => {
        const newVisible = new Set<string>();
        currentlyViewable.forEach((item: any) => {
            if (item.item && item.item.id) newVisible.add(item.item.id);
        });
        visibleItems.current = newVisible;
    }, []);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50 // Se considera visible si aparece el 50%
    }).current;

    return (
        <View style={{ flex: 1 }} className={`h-full ${isDark ? 'bg-black' : 'bg-white'}`}>
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#1DA1F2" />
                </View>
            ) : posts.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Ionicons name="people-outline" size={80} color={isDark ? '#333' : '#eee'} />
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#fff' : '#000', marginTop: 10 }}>
                        Aún no sigues a nadie
                    </Text>
                    <Text style={{ textAlign: 'center', color: isDark ? '#999' : '#666', marginTop: 5 }}>
                        Sigue a otros usuarios para ver sus publicaciones aquí o explora el feed Para Ti.
                    </Text>
                    <TouchableOpacity
                        style={{ marginTop: 20, backgroundColor: '#1DA1F2', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
                        onPress={() => router.push('/(drawer)/(tabs)/feed/foryou')}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Explorar Para Ti</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <PostCard
                    posts={posts}
                    onRefresh={onRefresh}
                    refreshing={refreshing}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                />
            )}
        </View>
    );
}