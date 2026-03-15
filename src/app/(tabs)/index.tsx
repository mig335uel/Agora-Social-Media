import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { signOut } from '../../Services/authService';
import CreatePostScreen from '../../Components/createPosts';
import { getForYouFeed, RankedPost } from '../../Services/FeedService';
import { recordInteractions, InteractionPayload } from '../../Services/InteractionService';

export default function Home() {
    const [posts, setPosts] = useState<RankedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Tracking de dwell time
    const visibleItems = useRef<Set<string>>(new Set());
    const dwellBuffer = useRef<{ [postId: string]: number }>({});
    const lastSyncTime = useRef(Date.now());

    const fetchFeed = async () => {
        try {
            const feed = await getForYouFeed();
            setPosts(feed);
        } catch (error) {
            console.error("Error fetching feed:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchFeed();
        
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

    const onRefresh = () => {
        setRefreshing(true);
        fetchFeed();
        syncInteractions(); // Aprovechamos para limpiar buffer
    };

    const logout = async () => {
        try {
            const results = await signOut();
            if(results) router.replace('/login');
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
        itemVisiblePercentThreshold: 50 // Se considera visible si aparece el 50%
    }).current;

    const renderPost = ({ item: post }: { item: RankedPost }) => (
        <View style={{ marginBottom: 25, borderBottomWidth: 0.5, borderBottomColor: '#eee', paddingBottom: 20, paddingHorizontal: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Image 
                    source={{ uri: post.profile_picture_url || 'https://via.placeholder.com/40' }} 
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#eee', marginRight: 12 }} 
                />
                <View>
                    <Text style={{ fontWeight: 'bold', fontSize: 15 }}>{post.display_name}</Text>
                    <Text style={{ color: '#666', fontSize: 13 }}>@{post.username}</Text>
                </View>
            </View>
            
            <Text style={{ fontSize: 16, lineHeight: 22, color: '#111', marginBottom: 12 }}>
                {post.content.replace(/<[^>]*>?/gm, '')}
            </Text>

            {post.media_url && (
                <View style={{ width: '100%', height: 250, backgroundColor: '#f0f0f0', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                    <Image source={{ uri: post.media_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 5 }}>
                <Text style={{ color: '#666', fontSize: 13 }}>💬 {post.replies_count}</Text>
                <Text style={{ color: '#666', fontSize: 13 }}>🔁 {post.reposts_count}</Text>
                <Text style={{ color: '#666', fontSize: 13 }}>❤️ {post.likes_count}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#eee' }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Agora</Text>
                <TouchableOpacity onPress={logout}>
                    <Text style={{ color: '#007AFF' }}>Cerrar sesión</Text>
                </TouchableOpacity>
            </View>
            
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={renderPost}
                ListHeaderComponent={
                    <View>
                        <CreatePostScreen />
                        <Text style={{ fontSize: 18, fontWeight: 'bold', margin: 15 }}>Para ti</Text>
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator color="#000" style={{ marginTop: 40 }} />
                    ) : (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Text style={{ color: '#666', fontSize: 16 }}>No hay publicaciones todavía.</Text>
                        </View>
                    )
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />
                }
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
            />
        </SafeAreaView>
    );
}