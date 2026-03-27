import React, { useEffect, useState, useCallback } from "react";
import { View, useColorScheme, ActivityIndicator, FlatList } from "react-native";
import { Post } from "@/Types/Posts";
import { supabase } from "@/lib/supbase/supabase";
import useAuth from "@/hooks/useAuth";
import { useProfileRefresh } from "../../../../Controller/_context";
import PostCard from "@/Components/Posts/PostsCard";
import ProfileAppBar from "@/Components/MyProfileScreen/AppBar";
import ProfileHeader from "@/Components/MyProfileScreen/ProfileHeader";
import ProfileCustomTabBar from "@/Components/MyProfileScreen/ProfileCustomTabBar";

export default function Profile() {
    const isDark = useColorScheme() === 'dark';
    const user = useAuth();
    const { refreshStats } = useProfileRefresh();

    const [posts, setPosts] = useState<Post[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState("posts");

    const fetchPosts = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (postsError) throw postsError;
            if (postsData && postsData.length > 0) {
                const postIds = postsData.map(p => p.id);
                const { data: mediaData, error: mediaError } = await supabase
                    .from('media_feature')
                    .select('*')
                    .in('post_id', postIds);

                if (mediaError) throw mediaError;

                const fullPosts = postsData.map(post => ({
                    ...post,
                    user: user,
                    media: mediaData?.filter(m => m.post_id === post.id) || []
                }));

                setPosts(fullPosts);
            } else {
                setPosts([]);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoadingPosts(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            fetchPosts(),
            refreshStats()
        ]);
        setRefreshing(false);
    }, [fetchPosts, refreshStats]);

    // ── Header que se montará al inicio de la lista ───────────────────
    const renderHeader = () => (
        <View style={{ backgroundColor: isDark ? '#000' : '#fff' }}>
            <ProfileAppBar user={user || undefined} />
            <ProfileHeader user={user || undefined} isMe={true} />
            <ProfileCustomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        </View>
    );

    if (loadingPosts && posts.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
                {renderHeader()}
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#1DA1F2" />
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
            <PostCard
                posts={activeTab === "posts" ? posts : []}
                ListHeaderComponent={renderHeader()}
                onRefresh={onRefresh}
                refreshing={refreshing}
                FlatListComponent={FlatList} // Usamos nativo en lugar de Tabs.FlatList
            />
        </View>
    );
}
