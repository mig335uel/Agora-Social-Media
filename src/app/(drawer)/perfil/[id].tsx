import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, useColorScheme, RefreshControl, FlatList } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getUserPosts, RankedPost } from "@/Services/FeedService";
import { toggleLike, repostPost, recordShare } from "@/Services/PostService";
import { Ionicons } from "@expo/vector-icons";
import PostCardItem from "@/Components/Posts/PostCard";
import { useProfileRefresh } from "@/Controller/_context";
import ProfileAppBar from "@/Components/MyProfileScreen/AppBar";
import ProfileHeader from "@/Components/MyProfileScreen/ProfileHeader";
import ProfileCustomTabBar from "@/Components/MyProfileScreen/ProfileCustomTabBar";

// Importar el contexto del layout (¡Magia!)
import { useProfileData } from "./_layout";

export default function Perfil() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // 1. Usar el Layout como ÚNICA fuente de la verdad
    const { 
        profileUser: user, 
        isFollowing, 
        isMe, 
        loadingProfile, 
        setIsFollowing, 
        fetchProfileData 
    } = useProfileData();

    const { refreshStats } = useProfileRefresh();

    const [posts, setPosts] = useState<RankedPost[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState("posts");

    // 2. Este componente AHORA solo se encarga del FEED
    const fetchPosts = useCallback(async () => {
        if (!id) return;
        try {
            const response = await getUserPosts(id);
            setPosts(response || []);
        } catch (error) {
            console.error("Error fetching posts:", error);
        } finally {
            setLoadingPosts(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            fetchProfileData(), // Refresca cabecera desde layout
            fetchPosts(),       // Refresca feed desde aquí
            refreshStats()      // Refresca stats
        ]);
        setRefreshing(false);
    }, [fetchProfileData, fetchPosts, refreshStats]);

    const handleLike = async (postId: string) => {
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                const liked = !p.is_liked;
                return { ...p, is_liked: liked, likes_count: Math.max(0, (p.likes_count || 0) + (liked ? 1 : -1)) };
            }
            return p;
        }));
        try { await toggleLike(postId); } catch (e) { fetchPosts(); }
    };

    const handleRepost = async (postId: string) => {
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                const reposted = !p.is_reposted;
                return { ...p, is_reposted: reposted, reposts_count: Math.max(0, (p.reposts_count || 0) + (reposted ? 1 : -1)) };
            }
            return p;
        }));
        try { await repostPost(postId); } catch (e) { fetchPosts(); }
    };

    const handleShare = async (postId: string) => {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, shares_count: (p.shares_count || 0) + 1 } : p));
        try { await recordShare(postId); } catch (e) {}
    };

    const renderItem = ({ item }: { item: RankedPost }) => (
        <PostCardItem 
            post={item as any} 
            onLike={handleLike} 
            onRepost={handleRepost} 
            onShare={handleShare} 
            onReply={async () => fetchPosts()}
        />
    );

    const renderHeader = () => {
        if (loadingProfile && !user) return (
            <View style={{ height: 300, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#1DA1F2" />
            </View>
        );
        return (
            <View style={{ backgroundColor: isDark ? '#000' : '#fff' }}>
                <ProfileAppBar user={user || undefined} isMe={isMe} />
                <ProfileHeader
                    user={user || undefined}
                    isMe={isMe}
                    isFollowing={isFollowing}
                    onFollowChange={setIsFollowing}
                />
                <ProfileCustomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
            </View>
        );
    };

    if (loadingProfile && !user) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#000' : '#fff' }}>
                <ActivityIndicator size="large" color="#1DA1F2" />
            </View>
        );
    }

    if (user?.is_private && !isFollowing && !isMe) {
        return (
            <FlatList
                data={[]}
                renderItem={() => null}
                ListHeaderComponent={renderHeader()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1DA1F2" />}
                contentContainerStyle={[styles.privateContainer, { backgroundColor: isDark ? '#000' : '#fff', flexGrow: 1 }]}
                ListEmptyComponent={() => (
                    <View style={styles.privateLockContainer}>
                        <Ionicons name="lock-closed-outline" size={64} color={isDark ? '#fff' : '#000'} />
                        <Text style={[styles.privateText, { color: isDark ? '#fff' : '#000' }]}>
                            Este perfil es privado
                        </Text>
                    </View>
                )}
            />
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
            <FlatList
                data={activeTab === "posts" ? posts : []}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader()}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#1DA1F2"
                        colors={["#1DA1F2"]}
                    />
                }
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                    !loadingPosts ? (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: isDark ? '#444' : '#999' }]}>No hay publicaciones todavía.</Text>
                        </View>
                    ) : (
                        <ActivityIndicator style={{ marginTop: 20 }} color="#1DA1F2" />
                    )
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 16, fontWeight: '500' },
    privateContainer: { paddingBottom: 40 },
    privateLockContainer: { marginTop: 60, alignItems: 'center', justifyContent: 'center' },
    privateText: { marginTop: 16, fontSize: 18, fontWeight: '600' }
});