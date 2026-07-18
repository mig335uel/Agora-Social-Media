import { Post } from "@/Types/Posts";
import { GlassContainer } from "expo-glass-effect";
import { FlatList, View, StyleSheet, Platform, ActionSheetIOS, Alert, AlertButton, useColorScheme, RefreshControl, Share } from "react-native";
import useAuth from "@/hooks/useAuth";
import { deletePost, toggleLike, repostPost, recordShare, createPost } from "@/Services/PostService";
import { blockUser } from "@/Services/UserService";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { ProcessedImage } from "@/Services/ImageService";
import PostCardItem from "./PostCard";
import ReportModal from "@/Components/ReportModal";

export default function PostCard({
    posts,
    ListHeaderComponent,
    onRefresh,
    refreshing,
    FlatListComponent = FlatList,
    onViewableItemsChanged,
    viewabilityConfig
}: {
    posts: Post[] | any[],
    ListHeaderComponent?: React.ReactElement,
    onRefresh?: () => void,
    refreshing?: boolean,
    FlatListComponent?: any,
    onViewableItemsChanged?: (info: any) => void,
    viewabilityConfig?: any
}) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const currentUser = useAuth();
    const [localPosts, setLocalPosts] = useState<Post[]>(posts);
    const [reportModal, setReportModal] = useState<{ visible: boolean; postId: string | null }>({
        visible: false,
        postId: null,
    });

    // Sincronizar localPosts cuando la prop posts cambie
    useEffect(() => {
        setLocalPosts(posts);
    }, [posts]);

    const handleOptionsPress = (item: Post) => {
        const isOwner = currentUser?.id === item.user_id;
        const authorId = item.user_id || (item as any).user?.id;

        if (Platform.OS === 'ios') {
            const options = ['Cancelar'];
            if (isOwner) {
                options.unshift('Eliminar Publicación');
            } else {
                options.unshift('Bloquear usuario');
                options.unshift('Reportar publicación');
            }

            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    destructiveButtonIndex: isOwner ? 0 : 1,
                    cancelButtonIndex: options.length - 1,
                    title: 'Opciones de Publicación',
                },
                (buttonIndex) => {
                    if (isOwner && buttonIndex === 0) {
                        handleDelete(item.id);
                    } else if (!isOwner && buttonIndex === 0) {
                        setReportModal({ visible: true, postId: item.id });
                    } else if (!isOwner && buttonIndex === 1) {
                        handleBlock(authorId);
                    }
                }
            );
        } else {
            const buttons: AlertButton[] = [
                { text: 'Cancelar', style: 'cancel' }
            ];

            if (isOwner) {
                buttons.unshift({
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => handleDelete(item.id)
                });
            } else {
                buttons.unshift({
                    text: 'Bloquear usuario',
                    style: 'destructive',
                    onPress: () => handleBlock(authorId)
                });
                buttons.unshift({
                    text: 'Reportar publicación',
                    onPress: () => setReportModal({ visible: true, postId: item.id })
                });
            }

            Alert.alert('Opciones', '¿Qué deseas hacer?', buttons);
        }
    };

    const handleDelete = async (postId: string) => {
        Alert.alert(
            "Eliminar Publicación",
            "¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deletePost(postId);
                            if (onRefresh) onRefresh();
                        } catch (error) {
                            Alert.alert("Error", "No se pudo eliminar la publicación.");
                        }
                    }
                }
            ]
        );
    };

    const handleBlock = (blockedUserId: string) => {
        if (!currentUser?.id || !blockedUserId) return;
        Alert.alert(
            "Bloquear usuario",
            "Esta persona no podrá ver tu perfil ni tus publicaciones. ¿Deseas continuar?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Bloquear",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await blockUser(currentUser.id, blockedUserId);
                            // Eliminar todos los posts de ese usuario del feed local
                            setLocalPosts(prev => prev.filter(p =>
                                p.user_id !== blockedUserId && (p as any).user?.id !== blockedUserId
                            ));
                            Alert.alert("Usuario bloqueado", "Ya no verás contenido de esta persona.");
                        } catch (error) {
                            Alert.alert("Error", "No se pudo bloquear al usuario.");
                        }
                    }
                }
            ]
        );
    };

    const handlePublishReply = async (content: string, images: ProcessedImage[], postId: string) => {
        // Optimistic update for replies_count
        setLocalPosts(prev => prev.map(p => {
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
            await createPost(content, images, postId);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Error al responder:", error);
            if (onRefresh) onRefresh();
        }
    };

    const handlePostPress = (item: Post) => {
        router.push(`/post/${item.id}`);
    }

    const handleLike = async (postId: string) => {
        setLocalPosts(prev => prev.map(p => {
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
            console.error("Error al dar like:", error);
            if (onRefresh) onRefresh();
        }
    };

    const handleRepost = async (postId: string) => {
        setLocalPosts(prev => prev.map(p => {
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
            console.error("Error al repostear:", error);
            if (onRefresh) onRefresh();
        }
    };

    const handleShare = async (postId: string) => {
        setLocalPosts(prev => prev.map(p => {
            if (p.id === postId) {
                return {
                    ...p,
                    shares_count: (p.shares_count || 0) + 1
                };
            }
            return p;
        }));

        try {
            await recordShare(postId);

            await Share.share({
                url: `https://agoras.es/posts/${postId}`,
                title: `¡Mira esta publicación en Ágoras!`
            });
        } catch (error) {
            console.error("Error al compartir:", error);
        }
    };

    const renderCard = ({ item }: { item: Post }) => (
        <PostCardItem
            post={item}
            onLike={handleLike}
            onRepost={handleRepost}
            onShare={handleShare}
            onReply={handlePublishReply}
            onOptionsPress={handleOptionsPress}
            onPress={handlePostPress}
        />
    );

    const listProps = {
        data: localPosts,
        keyExtractor: (item: Post) => item.id,
        renderItem: renderCard,
        contentContainerStyle: { marginTop: 2, paddingBottom: ((Platform.OS === 'ios') ? 110 : 80), },
        showsVerticalScrollIndicator: false,
        ItemSeparatorComponent: () => <View style={{ height: 8 }} />,
        ListHeaderComponent: ListHeaderComponent,
        onViewableItemsChanged,
        viewabilityConfig,
        
        // Usamos refreshControl en vez de onRefresh/refreshing porque
        // Tabs.FlatList (react-native-collapsible-tab-view) solo acepta refreshControl
        refreshControl: onRefresh ? (
            <RefreshControl
                refreshing={refreshing ?? false}
                onRefresh={onRefresh}
                tintColor="#1DA1F2"
                colors={["#1DA1F2"]}
            />
        ) : undefined,
    };

    // Si es iOS y estamos usando el FlatList estándar, lo envolvemos en GlassContainer.
    // Pero si nos pasan un Custom FlatList (como Tabs.FlatList), NO debemos envolverlo,
    // porque librerías como react-native-collapsible-tab-view requieren que el FlatList sea root absoluto.
    if (Platform.OS === 'ios' && FlatListComponent === FlatList) {
        return (
            <GlassContainer style={{ flex: 1 }}>
                <FlatListComponent {...listProps} />
                <ReportModal
                    visible={reportModal.visible}
                    context="post"
                    targetId={reportModal.postId ?? ''}
                    onClose={() => setReportModal({ visible: false, postId: null })}
                />
            </GlassContainer>
        );
    }

    return (
        <>
            <FlatListComponent {...listProps} />
            <ReportModal
                visible={reportModal.visible}
                context="post"
                targetId={reportModal.postId ?? ''}
                onClose={() => setReportModal({ visible: false, postId: null })}
            />
        </>
    );
}