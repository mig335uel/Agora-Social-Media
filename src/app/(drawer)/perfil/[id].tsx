import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, useColorScheme, ActivityIndicator, TouchableOpacity, Image, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Tabs } from "react-native-collapsible-tab-view";
import { getUserPosts, RankedPost } from "@/Services/FeedService";
import { toggleLike, repostPost, recordShare } from "@/Services/PostService";
import { Ionicons } from "@expo/vector-icons";
import MediaGrid from "@/Components/Posts/MediaGrid";
import PostCard from "@/Components/Posts/PostCard";

export default function Perfil() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const isDark = useColorScheme() === 'dark';
    const [posts, setPosts] = useState<RankedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPosts = useCallback(async (isRefresh = false) => {
        if (!id) return;
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const data = await getUserPosts(id);
            setPosts(data);
        } catch (error) {
            console.error("Error fetching user posts:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

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
        } catch (error) {
            console.error("Error liking post:", error);
            fetchPosts(true);
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
        } catch (error) {
            console.error("Error reposting:", error);
            fetchPosts(true);
        }
    };

    const handleReply = async (content: string, images: any[], postId: string) => {
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                return {
                    ...p,
                    is_replied: true,
                    replies_count: (p.replies_count || 0) + 1
                };
            }
            return p;
        }));
        try {
            const { createPost } = require("@/Services/PostService");
            await createPost(content, images, postId);
            fetchPosts(true);
        } catch (error) {
            console.error("Error replying:", error);
            fetchPosts(true);
        }
    };

    const renderItem = ({ item }: { item: RankedPost }) => {
        return (
            <PostCard
                post={item}
                onLike={handleLike}
                onRepost={handleRepost}
                onShare={(postId) => recordShare(postId)}
                onReply={handleReply}
                onPress={(post) => router.push(`/post/${post.id}`)}
            />
        );
    };

    if (loading && posts.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#000' : '#fff' }}>
                <ActivityIndicator color="#1DA1F2" />
            </View>
        );
    }

    return (
        <Tabs.FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onRefresh={() => fetchPosts(true)}
            refreshing={refreshing}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: isDark ? '#444' : '#999' }]}>No hay publicaciones todavía.</Text>
                </View>
            )}
        />
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
    }
});