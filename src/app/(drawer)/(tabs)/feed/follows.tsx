import useAuth from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { View, Text, useColorScheme } from "react-native";
import { supabase } from "@/lib/supbase/supabase";
import PostCard from "@/Components/Posts/PostsCard";
import { Post } from "@/Types/Posts";
export default function Follows() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const user = useAuth();

    const [followingPost, setFollowingPost] = useState<Post[]>([]);

    useEffect(() => {
        const fetchFollowedPosts = async () => {
            if (!user?.id) return;

            // 1. Obtener la lista de personas a las que sigo
            const { data: follows, error: followsError } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', user.id);

            if (followsError) {
                console.error("Error fetching follows:", followsError);
                return;
            }

            const followingIds = follows.map(f => f.following_id);

            // 2. Traer los posts de esas personas
            if (followingIds.length > 0) {

                const { data: posts, error: postsError } = await supabase
                    .from('posts')
                    .select(`
                            *,
                            users:posts_user_id_fkey!inner (*)
                    `)
                    .in('user_id', followingIds)
                    .order('created_at', { ascending: false });

                console.log(posts);

                if (postsError) {
                    console.error("Error fetching followed posts:", postsError);
                } else {
                    const formattedPosts = posts.map(p => ({
                        ...p,
                        user: p.users
                    }));

                    setFollowingPost(formattedPosts);
                    // Aquí setearías el estado de tus posts: setFollowedPosts(posts);
                }
            }
        }


        fetchFollowedPosts();
    }, [user]);

    return (
        <View className={`flex-1 justify-center items-center ${isDark ? 'bg-black' : 'bg-white'}`}>
            {followingPost.length > 0 ? (
                <PostCard posts={followingPost} />
            ) : (
                <Text className={`text-2xl text-center font-bold ${isDark ? 'text-white' : 'text-black'}`}>No sigues a nadie o no hay posts disponibles</Text>
            )}
        </View>
    );
}