import useAuth from "@/hooks/useAuth";
import { useLocalSearchParams } from "expo-router";
import { Post } from "@/Types/Posts";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supbase/supabase";
import { View, FlatList, ActivityIndicator, useColorScheme, Text, StyleSheet } from "react-native";
import PostDetailAppBar from "@/Components/Posts/PostDetailAppBar";
import PrincipalPost from "@/Components/Posts/PrincipalPost";
import ReplyItem from "@/Components/Posts/ReplyItem";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PostDetail() {
    const user = useAuth();
    const { id } = useLocalSearchParams();
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

    const [principalPost, setPrincipalPost] = useState<Post | null>(null);
    const [replyPosts, setReplyPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchPost = async () => {
            setLoading(true);
            try {
                // 1. Obtener el post principal
                const { data: postData, error: postError } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (postError) throw postError;

                // 2. Obtener el usuario del post (si no es el logueado)
                if (user?.id === postData.user_id) {
                    postData.user = user;
                } else {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', postData.user_id)
                        .single();
                    postData.user = userData;
                }
                
                setPrincipalPost(postData);

                // 3. Obtener respuestas
                const { data: replies, error: repliesError } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('parent_post_id', id)
                    .order('created_at', { ascending: true });
                
                if (repliesError) throw repliesError;

                const repliesWithUsers = await Promise.all((replies || []).map(async (reply) => {
                    const { data: rUser } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', reply.user_id)
                        .single();
                    return { ...reply, user: rUser };
                }));

                setReplyPosts(repliesWithUsers);
            } catch (error) {
                console.error('Error fetching post detail:', error);
            } finally {
                setLoading(false);
            }
        };
        
        if (id) fetchPost();
    }, [id, user]);

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
                <PostDetailAppBar />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={['top']}>
            <PostDetailAppBar />
            <FlatList 
              data={replyPosts}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <ReplyItem post={item} isLast={index === replyPosts.length - 1} />
              )}
              ListHeaderComponent={
                <>
                  {principalPost && <PrincipalPost post={principalPost} />}
                  <View style={[styles.replyDivider, { backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0' }]}>
                    <Text style={[styles.replyTitle, { color: isDark ? '#666' : '#999' }]}>RESPUESTAS</Text>
                  </View>
                </>
              }
              ListEmptyComponent={
                !loading && (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: isDark ? '#555' : '#ccc' }]}>Aún no hay respuestas...</Text>
                  </View>
                )
              }
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    replyDivider: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(128,128,128,0.2)',
    },
    replyTitle: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '500',
    }
});
;