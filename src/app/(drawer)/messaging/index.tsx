import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { Ionicons, Octicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuth from '@/hooks/useAuth';
import { MessageService } from '@/Services/MessageService';
import type { ChatInboxItem } from '@/Types/Chats';

// ─── Tiempo relativo ────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    return MessageService.timeAgo(dateStr);
}

// ─── Avatar del contacto ────────────────────────────────────────────────────
function ContactAvatar({
    uri,
    name,
    size = 52,
    isDark,
}: {
    uri: string | null;
    name: string;
    size?: number;
    isDark: boolean;
}) {
    const initials = name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    if (uri) {
        return (
            <Image
                source={{ uri }}
                style={{ width: size, height: size, borderRadius: size / 2 }}
            />
        );
    }
    return (
        <View
            style={[
                styles.avatarFallback,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: isDark ? '#2a2a3a' : '#e8e8f0',
                },
            ]}
        >
            <Text style={[styles.avatarInitials, { color: isDark ? '#aaa' : '#555' }]}>
                {initials || '?'}
            </Text>
        </View>
    );
}

// ─── Item de la bandeja ──────────────────────────────────────────────────────
function InboxItem({ item, isDark }: { item: ChatInboxItem; isDark: boolean }) {
    const textColor = isDark ? '#fff' : '#0f0f0f';
    const subColor = isDark ? '#888' : '#6b6b6b';
    const bg = isDark ? '#0a0a0a' : '#fff';
    const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const hasUnread = item.unread_count > 0;

    const preview = item.last_message
        ? `${item.last_message.isMine ? 'Tú: ' : ''}${item.last_message.content}`
        : 'Sin mensajes aún';

    return (
        <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push(`/messaging/${item.chat_id}` as any)}
            style={[styles.inboxItem, { backgroundColor: bg, borderBottomColor: border }]}
        >
            {/* Avatar */}
            <View style={styles.avatarWrap}>
                <ContactAvatar
                    uri={item.contact.profile_picture_url}
                    name={item.contact.display_name || item.contact.username}
                    isDark={isDark}
                />
                {item.contact.is_verified && (
                    <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#1DA1F2" />
                    </View>
                )}
            </View>

            {/* Contenido */}
            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <Text style={[styles.itemName, { color: textColor }, hasUnread && styles.itemNameBold]} numberOfLines={1}>
                        {item.contact.display_name || item.contact.username}
                    </Text>
                    <Text style={[styles.itemTime, { color: subColor }]}>
                        {timeAgo(item.updated_at)}
                    </Text>
                </View>
                <View style={styles.itemFooter}>
                    <Text style={[styles.itemPreview, { color: subColor }]} numberOfLines={1}>
                        {preview}
                    </Text>
                    {hasUnread && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>
                                {item.unread_count > 99 ? '99+' : item.unread_count}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ─── Pantalla principal ──────────────────────────────────────────────────────
export default function MessagingInbox() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    const user = useAuth();

    const [chats, setChats] = useState<ChatInboxItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const bg = isDark ? '#000' : '#fff';
    const headerBg = isDark ? '#000' : '#fff';
    const inputBg = isDark ? '#1a1a1a' : '#f0f0f5';
    const inputColor = isDark ? '#fff' : '#111';
    const placeholderColor = isDark ? '#555' : '#aaa';
    const emptyColor = isDark ? '#444' : '#bbb';

    // ── Carga ─────────────────────────────────────────────────────────────────
    const fetchInbox = useCallback(async (isRefresh = false) => {
        if (!user?.id) return;
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const data = await MessageService.getInbox(user.id);
        setChats(data);

        if (isRefresh) setRefreshing(false);
        else setLoading(false);
    }, [user?.id]);

    useEffect(() => {
        fetchInbox();
    }, [fetchInbox]);

    // ── Filtro de búsqueda local ──────────────────────────────────────────────
    const filtered = search.trim()
        ? chats.filter((c) => {
            const q = search.toLowerCase();
            return (
                c.contact.display_name?.toLowerCase().includes(q) ||
                c.contact.username?.toLowerCase().includes(q)
            );
        })
        : chats;

    const renderItem = useCallback(
        ({ item }: { item: ChatInboxItem }) => <InboxItem item={item} isDark={isDark} />,
        [isDark],
    );
    const keyExtractor = useCallback((item: ChatInboxItem) => item.chat_id, []);

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color="#1DA1F2" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            {/* ── Header ────────────────────────────────────────────────────── */}
            <BlurView
                intensity={80}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}
            >
                <View style={styles.headerRow}>
                    <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#0f0f0f' }]}>
                        Mensajes
                    </Text>
                    <TouchableOpacity style={styles.newChatBtn} onPress={() => { /* TODO: new chat */ }}>
                        <Octicons name="pencil" size={20} color={isDark ? '#fff' : '#111'} />
                    </TouchableOpacity>
                </View>

                {/* Buscador */}
                <View style={[styles.searchBar, { backgroundColor: inputBg }]}>
                    <Ionicons name="search" size={16} color={placeholderColor} />
                    <TextInput
                        style={[styles.searchInput, { color: inputColor }]}
                        placeholder="Buscar conversación..."
                        placeholderTextColor={placeholderColor}
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={16} color={placeholderColor} />
                        </TouchableOpacity>
                    )}
                </View>
            </BlurView>

            {/* ── Lista ─────────────────────────────────────────────────────── */}
            <FlatList
                data={filtered}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingTop: 2,
                    paddingBottom: insets.bottom + 100,
                    flexGrow: 1,
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchInbox(true)}
                        tintColor="#1DA1F2"
                        colors={['#1DA1F2']}
                    />
                }
                ItemSeparatorComponent={() => (
                    <View
                        style={{
                            height: StyleSheet.hairlineWidth,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                            marginLeft: 80,
                        }}
                    />
                )}
                ListEmptyComponent={() => (
                    <View style={styles.centered}>
                        <Ionicons name="chatbubbles-outline" size={56} color={emptyColor} />
                        <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#111' }]}>
                            {search ? 'Sin resultados' : 'Ningún mensaje aún'}
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: emptyColor }]}>
                            {search
                                ? `No se encontró "${search}"`
                                : 'Cuando alguien te escriba, aparecerá aquí.'}
                        </Text>
                    </View>
                )}
            />
        </View>
    );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: 10,
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    newChatBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 0,
    },
    inboxItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatarWrap: {
        position: 'relative',
    },
    avatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        fontSize: 18,
        fontWeight: '700',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#fff',
        borderRadius: 8,
    },
    itemContent: {
        flex: 1,
        gap: 4,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itemName: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    itemNameBold: {
        fontWeight: '700',
    },
    itemTime: {
        fontSize: 12,
        marginLeft: 8,
    },
    itemFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itemPreview: {
        fontSize: 14,
        flex: 1,
    },
    unreadBadge: {
        backgroundColor: '#1DA1F2',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
        marginLeft: 8,
    },
    unreadCount: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 32,
    },
});
