import { Post } from "@/Types/Posts";
import { GlassContainer } from "expo-glass-effect";
import { FlatList, View, Text, StyleSheet, Image, useColorScheme, Platform, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';

// ─── Utilidad: formatea números grandes (56000000 → 56M) ────────────────────
const formatCount = (n: number): string => {
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

export default function PostCard({ posts }: { posts: Post[] }) {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

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
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>

                {/* ── Header: Avatar + Nombre + Fecha ── */}
                <View style={styles.header}>
                    {/* Avatar con fallback de inicial */}
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={{ uri: item.user.profile_picture_url }}
                            style={styles.avatar}
                        />
                    </View>

                    {/* Nombre y username + fecha */}
                    <View style={styles.headerInfo}>
                        <View style={styles.headerRow}>
                            <Text style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
                                {item.user.display_name}
                            </Text>
                            {item.user.is_verified && (
                                <Ionicons name="checkmark-circle" size={16} color="#1DA1F2" />
                            )}
                            <Text style={[styles.timeAgo, { color: subColor }]}>
                                · {timeAgo(item.created_at)}
                            </Text>
                        </View>
                        <Text style={[styles.username, { color: subColor }]}>
                            @{item.user.username}
                        </Text>
                    </View>
                </View>

                {/* ── Contenido del post ── */}
                <Text style={[styles.content, { color: textColor }]}>
                    {renderStyledContent(item.content)}
                </Text>

                {/* ── Imagen adjunta ── */}
                {item.media_url && (
                    <Image
                        source={{ uri: item.media_url }}
                        style={styles.media}
                        resizeMode="cover"
                    />
                )}

                {/* ── Separador ── */}
                <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                {/* ── Barra de acciones ── */}
                <View style={styles.actions}>
                    <ActionButton iconName="chatbubble-outline" count={item.replies_count} color={iconColor} />
                    <ActionButton iconName="repeat-outline" count={item.reposts_count} color={iconColor} />
                    <ActionButton iconName="heart-outline" count={item.likes_count} color={iconColor} />
                    <ActionButton iconName="arrow-redo-outline" count={item.shares_count} color={iconColor} />
                </View>

            </View>
        );
    };

    const listProps = {
        data: posts,
        keyExtractor: (item: Post) => item.id,
        renderItem: renderCard,
        contentContainerStyle: { paddingVertical: 12, paddingHorizontal: 12, paddingBottom: ((Platform.OS === 'ios') ? 0: 80) },
        showsVerticalScrollIndicator: false,
        ItemSeparatorComponent: () => <View style={{ height: 8 }} />,
    };

    if (Platform.OS === 'ios') {
        return (
            <GlassContainer style={{ flex: 1 }}>
                <FlatList {...listProps} />
            </GlassContainer>
        );
    }

    return <FlatList {...listProps} />;
}

// ─── Botón de acción pequeño ────────────────────────────────────────────────
function ActionButton({ iconName, count, color }: { iconName: keyof typeof Ionicons.glyphMap; count: number; color: string }) {
    return (
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
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
});