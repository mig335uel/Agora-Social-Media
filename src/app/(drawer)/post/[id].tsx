import useAuth from "@/hooks/useAuth";
import { useLocalSearchParams } from "expo-router";
import { Post } from "@/Types/Posts";
import { useState, useEffect, useCallback } from "react";
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
    
    const fetchPost = useCallback(async () => {
        setLoading(true);
        try {
            const { data: postData, error: postError } = await supabase
                .from('posts')
                .select('*')
                .eq('id', String(id))
                .single();
            
            if (postError) throw postError;

            // 2. Obtener el usuario y media del post
            const [userRes, mediaRes] = await Promise.all([
              user?.id === postData.user_id 
                ? Promise.resolve({ data: user }) 
                : supabase.from('users').select('*').eq('id', postData.user_id).single(),
              supabase.from('media_feature').select('*').eq('post_id', id)
            ]);

            postData.user = userRes.data;
            postData.media = mediaRes.data || [];
            
            setPrincipalPost(postData);

            // 3. Obtener respuestas
            const { data: replies, error: repliesError } = await supabase
                .from('posts')
                .select('*')
                .eq('parent_post_id', id)
                .order('created_at', { ascending: true });
            
            if (repliesError) throw repliesError;

            const repliesWithUsers = await Promise.all((replies || []).map(async (reply) => {
                const [rUser, rMedia] = await Promise.all([
                  supabase.from('users').select('*').eq('id', reply.user_id).single(),
                  supabase.from('media_feature').select('*').eq('post_id', reply.id)
                ]);
                return { ...reply, user: rUser.data, media: rMedia.data || [] };
            }));

            // 4. Obtener interacciones del usuario (Likes, Reposts, Replies)
            if (user?.id) {
                const allPostIds = [postData.id, ...repliesWithUsers.map(r => r.id)];
                const [likesRes, repostsRes, userRepliesRes] = await Promise.all([
                    supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', allPostIds),
                    supabase.from('reposts').select('post_id').eq('user_id', user.id).in('post_id', allPostIds),
                    supabase.from('posts').select('parent_post_id').eq('user_id', user.id).in('parent_post_id', allPostIds)
                ]);

                const likedIds = new Set(likesRes.data?.map(l => l.post_id));
                const repostedIds = new Set(repostsRes.data?.map(r => r.post_id));
                const repliedIds = new Set(userRepliesRes.data?.map(r => r.parent_post_id));

                postData.is_liked = likedIds.has(postData.id);
                postData.is_reposted = repostedIds.has(postData.id);
                postData.is_replied = repliedIds.has(postData.id);

                repliesWithUsers.forEach(r => {
                    r.is_liked = likedIds.has(r.id);
                    r.is_reposted = repostedIds.has(r.id);
                    r.is_replied = repliedIds.has(r.id);
                });
            }
            
            setPrincipalPost(postData);
            setReplyPosts(repliesWithUsers);
        } catch (error) {
            console.error('Error fetching post detail:', error);
        } finally {
            setLoading(false);
        }
    }, [id, user]);
    
    useEffect(() => {
        if (id) fetchPost();
    }, [id, fetchPost]);

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
                <ReplyItem 
                    post={item} 
                    isLast={index === replyPosts.length - 1} 
                    onRefresh={fetchPost} 
                />
              )}
              ListHeaderComponent={
                <>
                  {principalPost && <PrincipalPost post={principalPost} onRefresh={fetchPost} />}
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