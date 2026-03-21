import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Platform, TouchableOpacity, Modal, useColorScheme } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import { Post } from "@/Types/Posts";
import MediaGrid from "./MediaGrid";
import { EditorDeTexto } from "../EditorDeTexto";
import { searchUsers } from "@/Services/UserService";
import { getTrendingTopics } from "@/Services/PostService";
import { ProcessedImage } from "@/Services/ImageService";

// ─── Utilidad: formatea números grandes (56000000 → 56M) ────────────────────
const formatCount = (n: number | undefined | null): string => {
    if (!n) return '0';
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

interface PostCardProps {
    post: Post;
    onLike?: (postId: string) => void;
    onRepost?: (postId: string) => void;
    onShare?: (postId: string) => void;
    onReply?: (content: string, images: ProcessedImage[], postId: string) => Promise<void>;
    onOptionsPress?: (post: Post) => void;
    onPress?: (post: Post) => void;
}

export default function PostCard({
    post,
    onLike,
    onRepost,
    onShare,
    onReply,
    onOptionsPress,
    onPress
}: PostCardProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [isReplyModalVisible, setIsReplyModalVisible] = useState(false);
    const [replyContent, setReplyContent] = useState('');

    const textColor = isDark ? '#ffffff' : '#0f0f0f';
    const subColor = isDark ? '#8b8b8b' : '#6b6b6b';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const cardBg = isDark ? '#1a1a1a' : '#ffffff';
    const separatorColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const iconColor = isDark ? '#6b6b6b' : '#8b8b8b';

    const handlePublishReply = async (content: string, images: ProcessedImage[]) => {
        if (onReply) {
            await onReply(content, images, post.id);
            setIsReplyModalVisible(false);
            setReplyContent('');
        }
    };

    const renderStyledContent = (content: string) => {
        const regex = /([@#][\wñáéíóú]+)/g;
        const parts = content.split(regex);
        return parts.map((part, index) => {
            if (part.match(regex)) {
                return (
                    <Text
                        key={index}
                        style={[styles.mention, { fontFamily: Platform.OS === 'ios' ? 'System' : undefined }]}
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

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPress?.(post)}
            style={[styles.card, { backgroundColor: cardBg, borderColor }]}
        >
            {/* ── Header: Avatar + Nombre + Fecha ── */}
            
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.push(`/perfil/${post.user?.id || (post as any).user_id}`)}
                    activeOpacity={0.7}
                    style={styles.avatarWrapper}
                >
                    {(post.user?.profile_picture_url || (post as any).profile_picture_url) ? (
                        <Image
                            source={{ uri: post.user?.profile_picture_url || (post as any).profile_picture_url || "" }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={24} color={isDark ? '#4b5563' : '#9ca3af'} />
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.headerInfo}
                    onPress={() => router.push(`/perfil/${post.user?.id || (post as any).user_id}`)}
                    activeOpacity={0.7}
                >
                    <View style={styles.headerRow}>
                        <Text style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
                            {post.user?.display_name || (post as any).display_name || "Agora User"}
                        </Text>
                        {post.user?.is_verified && (
                            <Ionicons name="checkmark-circle" size={16} color="#1DA1F2" />
                        )}
                        <Text style={[styles.timeAgo, { color: subColor }]}>
                            · {timeAgo(post.created_at)}
                        </Text>
                    </View>
                    <Text style={[styles.username, { color: subColor }]}>
                        @{post.user?.username || (post as any).username}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => onOptionsPress?.(post)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="ellipsis-horizontal" size={20} color={subColor} />
                </TouchableOpacity>
            </View>

            {/* ── Contenido del post ── */}
            <Text style={[styles.content, { color: textColor }]}>
                {renderStyledContent(post.content)}
            </Text>

            {/* ── Grilla de imágenes ── */}
            {post.media && <MediaGrid media={post.media!} />}

            <View style={[styles.separator, { backgroundColor: separatorColor }]} />

            {/* ── Barra de acciones ── */}
            <View style={styles.actions}>
                <ActionButton 
                    iconName={post.is_replied ? "chatbubble" : "chatbubble-outline"} 
                    count={post.replies_count} 
                    color={post.is_replied ? (isDark ? '#3b82f6' : '#1d4ed8') : iconColor} 
                    onPress={() => setIsReplyModalVisible(true)} 
                />
                <ActionButton 
                    iconName={post.is_reposted ? "repeat" : "repeat-outline"} 
                    count={post.reposts_count} 
                    color={post.is_reposted ? "#00BA7C" : iconColor} 
                    onPress={() => onRepost?.(post.id)} 
                />
                <ActionButton 
                    iconName={post.is_liked ? "heart" : "heart-outline"} 
                    count={post.likes_count} 
                    color={post.is_liked ? "#F91880" : iconColor} 
                    onPress={() => onLike?.(post.id)} 
                />
                <ActionButton 
                    iconName="arrow-redo-outline" 
                    count={post.shares_count} 
                    color={iconColor} 
                    onPress={() => onShare?.(post.id)} 
                />
            </View>

            <Modal
                visible={isReplyModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsReplyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setIsReplyModalVisible(false)}
                    />
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
                        <View style={styles.modalHandle} />
                        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
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
                                placeholder={`Responder a @${post.user?.username}...`}
                                onSearchMention={searchUsers}
                                onSearchHashtag={getTrendingTopics}
                                onPublish={handlePublishReply}
                                appBar={false}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </TouchableOpacity>
    );
}

function ActionButton({ iconName, count, color, onPress }: { iconName: keyof typeof Ionicons.glyphMap; count: number | undefined; color: string, onPress?: () => void }) {
    return (
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6} onPress={onPress}>
            <Ionicons name={iconName} size={18} color={color} />
            <Text style={[styles.actionCount, { color }]}>{formatCount(count)}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        marginTop: 10,
        paddingTop: 14,
        paddingHorizontal: 14,
        paddingBottom: 4,
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
    avatarPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 22,
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
    modalHeader: {
        padding: 16,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center'
    }
});
