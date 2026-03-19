import { View, Text, useColorScheme, FlatList, RefreshControl } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { Post } from "@/Types/Posts";
import { supabase } from "@/lib/supbase/supabase";
import useAuth from "@/hooks/useAuth";
import { useProfileRefresh } from "./_context";




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
            setPosts(postsData || []);

            if(postsData.length > 0){
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', postsData[0].user_id);

                if (userError) throw userError;
                setPosts(postsData.map((post) => ({ ...post, user: userData[0] })));
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


    const renderPostItem = ({ item }: { item: Post }) => (

        <View className="p-4 border-b border-gray-50 dark:border-gray-900">
            <Text className="text-black dark:text-white">{item.content}</Text>
            {item.media_url && (
                <View className="mt-2 rounded-xl overflow-hidden bg-gray-200 aspect-video">
                    {/* Image component would go here */}
                </View>
            )}
        </View>
    );

    return (
        <View className={`flex-1 ${isDark ? 'bg-black' : 'bg-white'}`}>
            <FlatList
                data={posts}
                renderItem={renderPostItem}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        tintColor={isDark ? '#fff' : '#000'}
                    />
                }
                ListEmptyComponent={

                    <View className="items-center justify-center py-10">
                        <Text className="text-gray-500">
                            {loading ? 'Loading posts...' : 'No posts found'}
                        </Text>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 20 }}
            />
        </View>
    );
}