import useAuth from "@/hooks/useAuth";
import { useEffect } from "react";
import { View, Text, useColorScheme } from "react-native";
import { supabase } from "@/lib/supbase/supabase";
export default function Follows() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const user = useAuth();

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
                    .select('*, profiles(*)') // O 'users(*)' según se llame tu tabla de perfiles
                    .in('user_id', followingIds)
                    .order('created_at', { ascending: false });

                if (postsError) {
                    console.error("Error fetching followed posts:", postsError);
                } else {
                    console.log("Posts de seguidos:", posts);
                    // Aquí setearías el estado de tus posts: setFollowedPosts(posts);
                }
            }
        };

        fetchFollowedPosts();
    }, [user]);

    return (
        <View className={``}>
            <Text>Follows</Text>
        </View>
    );
}