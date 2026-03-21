import React, { useEffect, useState, useCallback } from "react";
import { View, useColorScheme, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Post } from "@/Types/Posts";
import { supabase } from "@/lib/supbase/supabase";
import useAuth from "@/hooks/useAuth";
import { useProfileRefresh } from "../../../../Controller/_context";
import PostCard from "@/Components/Posts/PostsCard";
import ProfileAppBar from "@/Components/MyProfileScreen/AppBar";
import ProfileHeader from "@/Components/MyProfileScreen/ProfileHeader";
import { Tabs } from "react-native-collapsible-tab-view";


export default function Profile() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const user = useAuth();
    const { refreshStats } = useProfileRefresh();

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPosts = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });


            if (postsError) throw postsError;
            if (postsData && postsData.length > 0) {
                // 1. Obtener todos los IDs de los posts para traer su media de una vez
                const postIds = postsData.map(p => p.id);

                // 2. Traer la media de todos los posts en una sola consulta
                const { data: mediaData, error: mediaError } = await supabase
                    .from('media_feature')
                    .select('*')
                    .in('post_id', postIds);

                if (mediaError) throw mediaError;

                // 3. Mapear cada post con su usuario y su media correspondiente
                const fullPosts = postsData.map(post => ({
                    ...post,
                    user: user, // Asignamos el usuario actual (dueño del perfil)
                    media: mediaData?.filter(m => m.post_id === post.id) || []
                }));

                setPosts(fullPosts);
            } else {
                setPosts([]);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
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

    const HeaderComponent = () => (
        <View style={{ backgroundColor: isDark ? '#000' : '#fff' }}>
            <ProfileAppBar user={user || undefined} />
            <ProfileHeader user={user || undefined} isMe={true} />
        </View>
    );

    // Versión iOS: Usa la FlatList de la librería (la cabecera la pone elLayout)
    if (Platform.OS === 'ios') {
        return (
            
            <PostCard
                posts={posts}
                onRefresh={onRefresh}
                refreshing={refreshing}
                FlatListComponent={Tabs.FlatList}
            />
        );
    }

    // Versión Android: Implementación nativa con cabecera integrada
    return (
        <PostCard
            posts={posts}
            onRefresh={onRefresh}
            refreshing={refreshing}
            ListHeaderComponent={<HeaderComponent />}
        />
    );
}