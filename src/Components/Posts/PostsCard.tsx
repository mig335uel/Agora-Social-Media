import { Post } from "@/Types/Posts";
import { GlassContainer } from "expo-glass-effect";
import { FlatList, View, Text, StyleSheet, Image, useColorScheme, Platform, TouchableOpacity, ActionSheetIOS, Alert, AlertButton, Modal } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import MediaGrid from "./MediaGrid";
import useAuth from "@/hooks/useAuth";
import { createPost, deletePost, getTrendingTopics, toggleLike, repostPost, recordShare } from "@/Services/PostService";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { ProcessedImage } from "@/Services/ImageService";
import { searchUsers } from "@/Services/UserService";
import { EditorDeTexto } from "../EditorDeTexto";

// ─── Utilidad: formatea números grandes (56000000 → 56M) ────────────────────
// Busca la función formatCount al principio del archivo y cámbiala por esta:
const formatCount = (n: number | undefined | null): string => {
    if (!n) return '0'; // Si es undefined, null o 0, devolvemos '0'
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'K';
    return n.toString();
};


// ─── Utilidad: tiempo relativo ─────────────────────────────────────────────
const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
};

export default function PostCard({
    posts,
    ListHeaderComponent,
    onRefresh,
    refreshing,
    FlatListComponent = FlatList
}: {
    posts: Post[] | any[],
    ListHeaderComponent?: React.ReactElement,
    onRefresh?: () => void,
    refreshing?: boolean,
    FlatListComponent?: any
}) {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const currentUser = useAuth();
    const [localPosts, setLocalPosts] = useState<Post[]>(posts);

    // Sincronizar localPosts cuando la prop posts cambie (ej: por un pull-to-refresh real)
    useEffect(() => {
        setLocalPosts(posts);
    }, [posts]);

    const handleOptionsPress = (item: Post) => {
        const isOwner = currentUser?.id === item.user_id;

        if (Platform.OS === 'ios') {
            const options = ['Cancelar'];
            if (isOwner) options.unshift('Eliminar Publicación');
            else options.unshift('Reportar');

            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    destructiveButtonIndex: isOwner ? 0 : undefined,
                    cancelButtonIndex: options.length - 1,
                    title: 'Opciones de Publicación',
                },
                (buttonIndex) => {
                    if (isOwner && buttonIndex === 0) {
                        handleDelete(item.id);
                    }
                }
            );
        } else {
            // Android: Usamos Alert o un menú simple
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
                    text: 'Reportar',
                    onPress: () => console.log('Report post')
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
    const [isReplyModalVisible, setIsReplyModalVisible] = useState(false);
    const [replyContent, setReplyContent] = useState('');

    const handlePublishReply = async (content: string, images: ProcessedImage[], postId: string) => {
        try {
            await createPost(content, images, postId);
            
            setIsReplyModalVisible(false);
            setReplyContent('');
            if (onRefresh) onRefresh();
            // Podríamos añadir una notificación de éxito aquí
        } catch (error) {
            console.error("Error al responder:", error);
        }
    };

    const handlePostPress = (item: Post) => {
        router.push(`/post/${item.id}`);
    }

    const handleLike = async (postId: string) => {
        // Actualización Optimista
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
            // No llamamos a onRefresh() para evitar recarga completa
        } catch (error) {
            console.error("Error al dar like:", error);
            // Revertir en caso de error (opcionalmente podríamos refinar esto)
            if (onRefresh) onRefresh();
        }
    };

    const handleRepost = async (postId: string) => {
        // Actualización Optimista
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
            // No llamamos a onRefresh()
        } catch (error) {
            console.error("Error al repostear:", error);
            if (onRefresh) onRefresh();
        }
    };

    const handleShare = async (postId: string) => {
        // Actualización Optimista
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
        } catch (error) {
            console.error("Error al compartir:", error);
        }
    };

    // ─── Resalta @menciones y #hashtags ─────────────────────────────────────
    const renderStyledContent = (content: string) => {
        const regex = /([@#][\wñáéíóú]+)/g;
        const parts = content.split(regex);
        return parts.map((part, index) => {
            if (part.match(regex)) {
                return (
                    <Text
                        key={index}
                        style={[styles.mention, { fontFamily: Platform.OS === 'ios' ? 'System' : undefined }]}
                        onPress={() => { /* conexiones futuras */ }}
                    >
                        {part}
                    </Text>
                );
            }
            return (
                <Text
                    key={index}
                    style={{ fontFamily: Platform.OS === 'ios' ? 'System' : undefined }}
                >
                    {part}
                </Text>
            );
        });
    };

    // ─── Card individual (comparte la misma lógica en iOS y Android) ────────
    const renderCard = ({ item }: { item: Post }) => {
        const cardBg = isDark ? '#1a1a1a' : '#ffffff';
        const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        const textColor = isDark ? '#ffffff' : '#0f0f0f';
        const subColor = isDark ? '#8b8b8b' : '#6b6b6b';
        const separatorColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        const iconColor = isDark ? '#6b6b6b' : '#8b8b8b';

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handlePostPress(item)}
                style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            >



                {/* ── Header: Avatar + Nombre + Fecha ── */}
                <View style={styles.header}>
                    {/* Avatar con fallback de inicial */}
                    <View style={styles.avatarWrapper}>
                        {(item.user?.profile_picture_url || (item as any).profile_picture_url) ? (
                            <Image
                                source={{ uri: item.user?.profile_picture_url || (item as any).profile_picture_url || "" }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View className="flex-1 items-center justify-center bg-gray-100 dark:bg-gray-800 m-[2px] rounded-[22px]">
                                <Ionicons name="person" size={24} color={isDark ? '#4b5563' : '#9ca3af'} />
                            </View>
                        )}
                    </View>

                    {/* Nombre y username + fecha */}
                    <View style={styles.headerInfo}>
                        <View style={styles.headerRow}>
                            <Text style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
                                {item.user?.display_name || (item as any).display_name || "Agora User"}
                            </Text>
                            {item.user?.is_verified && (
                                <Ionicons name="checkmark-circle" size={16} color="#1DA1F2" />
                            )}
                            <Text style={[styles.timeAgo, { color: subColor }]}>
                                · {timeAgo(item.created_at)}
                            </Text>
                        </View>
                        <Text style={[styles.username, { color: subColor }]}>
                            @{item.user?.username || (item as any).username}
                        </Text>
                    </View>

                    {/* Botón de opciones (Ellipsis) */}
                    <TouchableOpacity
                        onPress={() => handleOptionsPress(item)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="ellipsis-horizontal" size={20} color={subColor} />
                    </TouchableOpacity>
                </View>

                {/* ── Contenido del post ── */}
                <Text style={[styles.content, { color: textColor }]}>
                    {renderStyledContent(item.content)}
                </Text>

                {/* ── Grilla de imágenes ── */}
                {item.media && <MediaGrid media={item.media!} />}

                {/* ── Separador ── */}
                <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                {/* ── Barra de acciones ── */}
                <View style={styles.actions}>

                    <ActionButton 
                        iconName={item.is_replied ? "chatbubble" : "chatbubble-outline"} 
                        count={item.replies_count} 
                        color={item.is_replied ? (isDark ? '#3b82f6' : '#1d4ed8') : iconColor} 
                        onPress={() => setIsReplyModalVisible(true)} 
                    />
                    <ActionButton 
                        iconName={item.is_reposted ? "repeat" : "repeat-outline"} 
                        count={item.reposts_count} 
                        color={item.is_reposted ? "#00BA7C" : iconColor} 
                        onPress={() => handleRepost(item.id)} 
                    />
                    <ActionButton 
                        iconName={item.is_liked ? "heart" : "heart-outline"} 
                        count={item.likes_count} 
                        color={item.is_liked ? "#F91880" : iconColor} 
                        onPress={() => handleLike(item.id)} 
                    />
                    <ActionButton 
                        iconName="arrow-redo-outline" 
                        count={item.shares_count} 
                        color={iconColor} 
                        onPress={() => handleShare(item.id)} 
                    />
                </View>
                <Modal
                    visible={isReplyModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setIsReplyModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        {/* Backdrop para cerrar al tocar fuera */}
                        <TouchableOpacity
                            style={styles.modalBackdrop}
                            activeOpacity={1}
                            onPress={() => setIsReplyModalVisible(false)}
                        />

                        <View style={[styles.modalContent, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
                            {/* Handle visual típico de bottom sheet */}
                            <View style={styles.modalHandle} />

                            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: borderColor, flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity onPress={() => setIsReplyModalVisible(false)}>
                                    <Text style={{ color: '#3b82f6', fontSize: 16 }}>Cancelar</Text>
                                </TouchableOpacity>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: textColor }}>Responder</Text>
                                </View>
                            </View>

                            <View style={{ flex: 1 }}>
                                <EditorDeTexto
                                    value={replyContent}
                                    onChange={setReplyContent}
                                    isDark={isDark}
                                    placeholder={`Responder a @${item.user?.username}...`}
                                    onSearchMention={searchUsers}
                                    onSearchHashtag={getTrendingTopics}
                                    onPublish={() => handlePublishReply(replyContent, [], item.id)}
                                    appBar={false}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>

            </TouchableOpacity>
        );
    };

    const listProps = {
        data: localPosts,
        keyExtractor: (item: Post) => item.id,
        renderItem: renderCard,
        contentContainerStyle: { marginTop: 2, paddingVertical: 12, paddingHorizontal: 12, paddingBottom: ((Platform.OS === 'ios') ? 0 : 80) },
        showsVerticalScrollIndicator: false,
        ItemSeparatorComponent: () => <View style={{ height: 8 }} />,
        ListHeaderComponent: ListHeaderComponent,
        onRefresh: onRefresh,
        refreshing: refreshing,
    };

    if (Platform.OS === 'ios') {
        return (
            <GlassContainer style={{ flex: 1 }}>


                <FlatListComponent {...listProps} />

            </GlassContainer>
        );
    }

    return <FlatListComponent {...listProps} />;
}

// ─── Botón de acción pequeño ────────────────────────────────────────────────
function ActionButton({ iconName, count, color, onPress }: { iconName: keyof typeof Ionicons.glyphMap; count: number; color: string, onPress?: () => void }) {
    return (
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6} onPress={onPress}>
            <Ionicons name={iconName} size={18} color={color} />
            <Text style={[styles.actionCount, { color }]}>{formatCount(count)}</Text>
        </TouchableOpacity>
    );
}

// ─── Estilos ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        marginTop: 2,
        paddingTop: 14,
        paddingHorizontal: 14,
        paddingBottom: 4,

        // Sombra suave (iOS)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
        gap: 10,
    },
    avatarWrapper: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: '#333',
    },
    avatar: {
        width: 44,
        height: 44,
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    displayName: {
        fontWeight: '700',
        fontSize: 15,
        flexShrink: 1,
    },
    timeAgo: {
        fontSize: 13,
    },
    username: {
        fontSize: 13,
        marginTop: 1,
    },
    content: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 12,
    },
    mention: {
        color: '#1DA1F2',
        fontWeight: '600',
    },
    media: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 12,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: -14,
        marginBottom: 2,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 6,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },

    actionCount: {
        fontSize: 13,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        height: '80%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 4,
    },
});