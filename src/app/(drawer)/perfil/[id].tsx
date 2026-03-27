import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, useColorScheme, RefreshControl, FlatList } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getUserPosts, RankedPost } from "@/Services/FeedService";
import { toggleLike, repostPost, recordShare } from "@/Services/PostService";
import { Ionicons } from "@expo/vector-icons";
import PostCardItem from "@/Components/Posts/PostCard";
import { supabase } from "@/lib/supbase/supabase";
import { Usuario } from "@/Types/Users";
import useAuth from "@/hooks/useAuth";
import { checkFollowStatus } from "@/Services/UserService";
import { useProfileRefresh } from "@/Controller/_context";
import ProfileAppBar from "@/Components/MyProfileScreen/AppBar";
import ProfileHeader from "@/Components/MyProfileScreen/ProfileHeader";
import ProfileCustomTabBar from "@/Components/MyProfileScreen/ProfileCustomTabBar";

export default function Perfil() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme();
    const currentUser = useAuth();
    const isDark = colorScheme === 'dark';
    
    // Context refresh para los stats del ProfileHeader
    const { refreshStats } = useProfileRefresh();

    const [user, setUser] = useState<Usuario | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    
    const [posts, setPosts] = useState<RankedPost[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState("posts");

    // ── Carga de datos del perfil ───────────────────────────────────────
    const fetchProfileData = useCallback(async () => {
        if (!id) return;
        try {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (userError) throw userError;
            setUser(userData);

            if (currentUser && currentUser.id !== id) {
                const following = await checkFollowStatus(currentUser.id, id);
                setIsFollowing(following);
            }
        } catch (error) {
            console.error("Error fetching profile layout data:", error);
        } finally {
            setLoadingProfile(false);
        }
    }, [id, currentUser?.id]);

    // ── Carga de los posts del usuario ──────────────────────────────────
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
        fetchProfileData();
        fetchPosts();
    }, [fetchProfileData, fetchPosts]);

    // ── Pull-to-refresh Global ──────────────────────────────────────────
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            fetchProfileData(),
            fetchPosts(),
            refreshStats()
        ]);
        setRefreshing(false);
    }, [fetchProfileData, fetchPosts, refreshStats]);

    // ── Acciones en Posts ───────────────────────────────────────────────
    const handleLike = async (postId: string) => { /* Optimistic UI Omitted context since using old component, assuming inside old handleLike. Re-implementing correctly: */
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
            post={item} 
            onLike={handleLike} 
            onRepost={handleRepost} 
            onShare={handleShare} 
            onReply={async () => fetchPosts()} // Optimistic syncs in component if needed
        />
    );

    // ── Renderizado del Header Completo ─────────────────────────────────
    const renderHeader = () => {
        if (loadingProfile && !user) return (
            <View style={{ height: 300, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#1DA1F2" />
            </View>
        );
        return (
            <View style={{ backgroundColor: isDark ? '#000' : '#fff' }}>
                <ProfileAppBar user={user || undefined} isMe={currentUser?.id === id} />
                <ProfileHeader
                    user={user || undefined}
                    isMe={currentUser?.id === id}
                    isFollowing={isFollowing}
                    onFollowChange={setIsFollowing}
                />
                <ProfileCustomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
            </View>
        );
    };

    // ── Renderizado de UI Principal ─────────────────────────────────────
    if (loadingProfile && !user) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#000' : '#fff' }}>
                <ActivityIndicator size="large" color="#1DA1F2" />
            </View>
        );
    }

    if (user?.is_private && !isFollowing && currentUser?.id !== id) {
        return (
            <FlatList
                data={[]}
                renderItem={() => null}
                ListHeaderComponent={renderHeader}
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
                ListHeaderComponent={renderHeader}
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
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
    },
    privateContainer: {
        paddingBottom: 40,
    },
    privateLockContainer: {
        marginTop: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    privateText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
    }
});