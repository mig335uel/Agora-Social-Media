import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    useColorScheme,
    ActivityIndicator,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Alert,
    ActionSheetIOS,
    Platform,
    Share,
    StyleSheet
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import useAuth from "@/hooks/useAuth";
import { useProfileRefresh } from "../../../../Controller/_context";
import { getUserPosts, getUserReplies, getUserLikes, RankedPost } from "@/Services/FeedService";
import { toggleLike, repostPost, recordShare, deletePost } from "@/Services/PostService";
import PostCardItem from "@/Components/Posts/PostCard";
import ProfileAppBar from "@/Components/MyProfileScreen/AppBar";
import ProfileHeader from "@/Components/MyProfileScreen/ProfileHeader";
import ProfileCustomTabBar from "@/Components/MyProfileScreen/ProfileCustomTabBar";

export default function Profile() {
    const isDark = useColorScheme() === 'dark';
    const user = useAuth();
    const { refreshStats } = useProfileRefresh();

    const [posts, setPosts] = useState<RankedPost[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState("posts");

    const fetchTabPosts = useCallback(async (tab: string, showLoadingIndicator = true) => {
        if (!user?.id) return;
        if (showLoadingIndicator) setLoadingPosts(true);
        try {
            let data: RankedPost[] = [];
            if (tab === "posts") {
                data = await getUserPosts(user.id);
            } else if (tab === "replies") {
                data = await getUserReplies(user.id);
            } else if (tab === "likes") {
                data = await getUserLikes(user.id);
            }
            setPosts(data || []);
        } catch (error) {
            console.error(`Error fetching ${tab}:`, error);
        } finally {
            if (showLoadingIndicator) setLoadingPosts(false);
        }
    }, [user?.id]);

    // Cargar publicaciones al cambiar de pestaña o usuario
    useEffect(() => {
        fetchTabPosts(activeTab, true);
    }, [fetchTabPosts, activeTab]);

    // Recargar silenciosamente al volver a la pantalla
    useFocusEffect(
        useCallback(() => {
            fetchTabPosts(activeTab, false);
        }, [fetchTabPosts, activeTab])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            fetchTabPosts(activeTab, false),
            refreshStats ? refreshStats() : Promise.resolve()
        ]);
        setRefreshing(false);
    }, [fetchTabPosts, refreshStats, activeTab]);

    const handleLike = async (postId: string) => {
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                const liked = !p.is_liked;
                return {
                    ...p,
                    is_liked: liked,
                    likes_count: Math.max(0, (p.likes_count || 0) + (liked ? 1 : -1))
                };
            }
            return p;
        }));
        try {
            await toggleLike(postId);
        } catch (e) {
            fetchTabPosts(activeTab, false);
        }
    };

    const handleRepost = async (postId: string) => {
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                const reposted = !p.is_reposted;
                return {
                    ...p,
                    is_reposted: reposted,
                    reposts_count: Math.max(0, (p.reposts_count || 0) + (reposted ? 1 : -1))
                };
            }
            return p;
        }));
        try {
            await repostPost(postId);
        } catch (e) {
            fetchTabPosts(activeTab, false);
        }
    };

    const handleShare = async (postId: string) => {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, shares_count: (p.shares_count || 0) + 1 } : p));
        try {
            await recordShare(postId);
            await Share.share({
                url: `https://agoras.es/posts/${postId}`,
                title: '¡Mira esta publicación en Ágoras!'
            });
        } catch (e) {
            console.error("Error sharing post:", e);
        }
    };

    const handleDelete = async (postId: string) => {
        Alert.alert(
            "Eliminar Publicación",
            "¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        setPosts(prev => prev.filter(p => p.id !== postId));
                        try {
                            await deletePost(postId);
                            if (refreshStats) refreshStats();
                        } catch (error) {
                            console.error("Error deleting post:", error);
                            fetchTabPosts(activeTab, false);
                        }
                    }
                }
            ]
        );
    };

    const handleOptionsPress = (post: RankedPost) => {
        const isOwner = user?.id === post.user_id;
        if (Platform.OS === 'ios') {
            const options = ['Cancelar'];
            if (isOwner) {
                options.unshift('Eliminar Publicación');
            }
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    destructiveButtonIndex: isOwner ? 0 : undefined,
                    cancelButtonIndex: options.length - 1,
                    title: 'Opciones de Publicación',
                },
                (buttonIndex) => {
                    if (isOwner && buttonIndex === 0) {
                        handleDelete(post.id);
                    }
                }
            );
        } else {
            if (isOwner) {
                Alert.alert('Opciones', '¿Qué deseas hacer?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => handleDelete(post.id) }
                ]);
            }
        }
    };

    // ── Header que se monta como ListHeaderComponent ─────────────────
    const renderHeader = () => (
        <View style={{ backgroundColor: isDark ? '#000' : '#fff' }}>
            <ProfileAppBar user={user || undefined} isMe={true} />
            <ProfileHeader user={user || undefined} isMe={true} />
            <ProfileCustomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        </View>
    );

    const renderEmpty = () => {
        if (loadingPosts) {
            return (
                <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#1DA1F2" />
                </View>
            );
        }

        let iconName: any = "document-text-outline";
        let title = "No has publicado nada aún";
        let subtitle = "Comparte tus ideas o crea tu primer post para que aparezca aquí.";
        let showCreateBtn = true;

        if (activeTab === "replies") {
            iconName = "chatbubbles-outline";
            title = "Sin respuestas";
            subtitle = "Las respuestas que des a otras publicaciones aparecerán aquí.";
            showCreateBtn = false;
        } else if (activeTab === "likes") {
            iconName = "heart-outline";
            title = "Sin me gusta";
            subtitle = "Las publicaciones a las que des 'me gusta' aparecerán aquí.";
            showCreateBtn = false;
        }

        return (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 60 }}>
                <View
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16
                    }}
                >
                    <Ionicons name={iconName} size={36} color={isDark ? '#666' : '#999'} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#fff' : '#000', textAlign: 'center', marginBottom: 6 }}>
                    {title}
                </Text>
                <Text style={{ fontSize: 13, color: isDark ? '#888' : '#666', textAlign: 'center', lineHeight: 18, maxWidth: 300 }}>
                    {subtitle}
                </Text>
                {showCreateBtn && (
                    <TouchableOpacity
                        onPress={() => router.push('/(drawer)/post/create')}
                        style={{
                            marginTop: 20,
                            paddingHorizontal: 22,
                            paddingVertical: 10,
                            backgroundColor: isDark ? '#fff' : '#000',
                            borderRadius: 20
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={{ color: isDark ? '#000' : '#fff', fontWeight: '700', fontSize: 13 }}>
                            Crear Publicación
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <PostCardItem
                        post={item as any}
                        onLike={handleLike}
                        onRepost={handleRepost}
                        onShare={handleShare}
                        onReply={async () => fetchTabPosts(activeTab, false)}
                        onOptionsPress={() => handleOptionsPress(item)}
                        onPress={(p) => router.push({ pathname: '/(drawer)/post/[id]', params: { id: p.id } })}
                    />
                )}
                ListHeaderComponent={renderHeader()}
                ListEmptyComponent={renderEmpty()}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#1DA1F2"
                        colors={["#1DA1F2"]}
                    />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 110 }}
            />
        </View>
    );
}
