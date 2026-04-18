import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { Ionicons, Octicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import useAuth from '@/hooks/useAuth';
import { MessageService } from '@/Services/MessageService';
import { supabase } from '@/lib/supbase/supabase';
import type { ChatInboxItem, ChatCreationResult } from '@/Types/Chats';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ContactAvatar({
    uri, name, size = 52, isDark,
}: {
    uri: string | null; name: string; size?: number; isDark: boolean;
}) {
    const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    return (
        <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: isDark ? '#1e1e2e' : '#e8e8f0' }]}>
            <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: isDark ? '#aaa' : '#555' }}>{initials || '?'}</Text>
        </View>
    );
}

// ─── Item bandeja ─────────────────────────────────────────────────────────────
function InboxItem({ item, isDark }: { item: ChatInboxItem; isDark: boolean }) {
    const hasUnread = item.unread_count > 0;
    const preview = item.last_message
        ? `${item.last_message.isMine ? 'Tú: ' : ''}${item.last_message.content}`
        : 'Inicia la conversación';

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/messaging/${item.chat_id}` as any)}
            style={[styles.inboxItem, { backgroundColor: isDark ? '#000' : '#fff' }]}
        >
            <View style={styles.avatarWrap}>
                <ContactAvatar uri={item.contact.profile_picture_url} name={item.contact.display_name || item.contact.username} isDark={isDark} />
                {item.contact.is_verified && (
                    <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={15} color="#1DA1F2" />
                    </View>
                )}
            </View>
            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <Text
                        style={[styles.itemName, { color: isDark ? '#fff' : '#0f0f0f', fontWeight: hasUnread ? '700' : '500' }]}
                        numberOfLines={1}
                    >
                        {item.contact.display_name || item.contact.username}
                    </Text>
                    <Text style={[styles.itemTime, { color: isDark ? '#555' : '#aaa' }]}>
                        {MessageService.timeAgo(item.updated_at)}
                    </Text>
                </View>
                <View style={styles.itemFooter}>
                    <Text style={[styles.itemPreview, { color: isDark ? (hasUnread ? '#ccc' : '#666') : (hasUnread ? '#444' : '#aaa') }]} numberOfLines={1}>
                        {preview}
                    </Text>
                    {hasUnread && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>{item.unread_count > 99 ? '99+' : item.unread_count}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ─── Modal de nuevo chat ──────────────────────────────────────────────────────
function NewChatModal({ visible, onClose, myUserId, isDark }: {
    visible: boolean; onClose: () => void; myUserId: string; isDark: boolean;
}) {
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState<string | null>(null);

    const bg = isDark ? '#0a0a0f' : '#fff';
    const borderColor = isDark ? '#1a1a2e' : '#eee';
    const textColor = isDark ? '#fff' : '#0f0f0f';
    const subColor = isDark ? '#666' : '#aaa';
    const inputBg = isDark ? '#1a1a2e' : '#f0f0f5';

    useEffect(() => {
        if (!visible) { setSearch(''); setUsers([]); return; }
        // Cargar contactos seguidos al abrir
        loadFollowing();
    }, [visible]);

    const loadFollowing = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('follows')
            .select('following_id, users!follows_following_id_fkey(id, username, display_name, profile_picture_url, is_verified)')
            .eq('follower_id', myUserId)
            .limit(50);
        setUsers((data ?? []).map((d: any) => d.users).filter(Boolean));
        setLoading(false);
    };

    const handleSearch = async (q: string) => {
        setSearch(q);
        if (!q.trim()) { loadFollowing(); return; }
        setLoading(true);
        const { data } = await supabase
            .from('users')
            .select('id, username, display_name, profile_picture_url, is_verified')
            .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
            .neq('id', myUserId)
            .limit(20);
        setUsers(data ?? []);
        setLoading(false);
    };

    const handleStart = async (targetUser: any) => {
        setCreating(targetUser.id);
        console.log('[NewChat] Iniciando chat con:', targetUser.username);

        try {
            const myDeviceId = await SecureStore.getItemAsync('agora_device_identifier') ?? '';
            const result: ChatCreationResult = await MessageService.createChat(myUserId, targetUser.id, myDeviceId);
            console.log('[NewChat] Resultado createChat:', JSON.stringify(result));

            setCreating(null);

            if (!result) {
                console.error('[NewChat] createChat devolvió null');
                return;
            }

            // El chat SIEMPRE se crea (direct, existing o request) y siempre tiene chat_id
            if (result.chat_id) {
                onClose();
                setTimeout(() => {
                    router.push(`/messaging/${result.chat_id}` as any);
                }, 350);
            }
        } catch (e) {
            console.error('[NewChat] Error en handleStart:', e);
            setCreating(null);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[styles.modalContainer, { backgroundColor: bg }]}>
                {/* Header */}
                <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                    <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                        <Ionicons name="close" size={22} color={textColor} />
                    </TouchableOpacity>
                    <Text style={[styles.modalTitle, { color: textColor }]}>Nuevo mensaje</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* Buscador */}
                <View style={[styles.modalSearch, { backgroundColor: inputBg }]}>
                    <Ionicons name="search" size={16} color={subColor} />
                    <TextInput
                        style={[styles.modalSearchInput, { color: textColor }]}
                        placeholder="Buscar personas..."
                        placeholderTextColor={subColor}
                        value={search}
                        onChangeText={handleSearch}
                        autoFocus
                    />
                </View>

                {/* Lista */}
                {loading ? (
                    <ActivityIndicator style={{ marginTop: 40 }} color="#1DA1F2" />
                ) : (
                    <FlatList
                        data={users}
                        keyExtractor={(u) => u.id}
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingTop: 8 }}
                        renderItem={({ item }) => {
                            const isCreating = creating === item.id;
                            return (
                                <TouchableOpacity
                                    style={[styles.userRow, { borderBottomColor: borderColor }]}
                                    onPress={() => handleStart(item)}
                                    disabled={!!creating}
                                    activeOpacity={0.7}
                                >
                                    <ContactAvatar uri={item.profile_picture_url} name={item.display_name || item.username} size={44} isDark={isDark} />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Text style={{ color: textColor, fontWeight: '600', fontSize: 15 }} numberOfLines={1}>
                                                {item.display_name || item.username}
                                            </Text>
                                            {item.is_verified && <Ionicons name="checkmark-circle" size={14} color="#1DA1F2" />}
                                        </View>
                                        <Text style={{ color: subColor, fontSize: 13 }}>@{item.username}</Text>
                                    </View>
                                    {isCreating ? (
                                        <ActivityIndicator size="small" color="#1DA1F2" />
                                    ) : (
                                        <View style={styles.startBtn}>
                                            <Ionicons name="chatbubble" size={16} color="#1DA1F2" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={() => (
                            <View style={{ alignItems: 'center', paddingTop: 60, gap: 8 }}>
                                <Ionicons name="people-outline" size={48} color={subColor} />
                                <Text style={{ color: subColor, fontSize: 15 }}>
                                    {search ? 'Sin resultados' : 'No sigues a nadie aún'}
                                </Text>
                            </View>
                        )}
                    />
                )}
            </View>
        </Modal>
    );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function MessagingInbox() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    const user = useAuth();

    const [chats, setChats] = useState<ChatInboxItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [newChatOpen, setNewChatOpen] = useState(false);

    const bg = isDark ? '#000' : '#fff';
    const inputBg = isDark ? '#111' : '#f0f0f5';
    const inputColor = isDark ? '#fff' : '#111';
    const placeholderColor = isDark ? '#444' : '#bbb';
    const emptyColor = isDark ? '#333' : '#ccc';
    const headerBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    const fetchInbox = useCallback(async (isRefresh = false) => {
        if (!user?.id) return;
        if (isRefresh) setRefreshing(true); else setLoading(true);
        const data = await MessageService.getInbox(user.id);
        setChats(data);
        if (isRefresh) setRefreshing(false); else setLoading(false);
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            fetchInbox();
        }, [fetchInbox])
    );

    const filtered = search.trim()
        ? chats.filter((c) => {
            const q = search.toLowerCase();
            return c.contact.display_name?.toLowerCase().includes(q) || c.contact.username?.toLowerCase().includes(q);
        })
        : chats;

    const renderItem = useCallback(({ item }: { item: ChatInboxItem }) => (
        <InboxItem item={item} isDark={isDark} />
    ), [isDark]);

    if (loading) return (
        <View style={[styles.centered, { backgroundColor: bg }]}>
            <ActivityIndicator size="large" color="#1DA1F2" />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <BlurView
                intensity={90}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.header, { paddingTop: insets.top + 6, borderBottomColor: headerBorder }]}
            >
                <View style={styles.headerRow}>
                    <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#0f0f0f' }]}>Mensajes</Text>
                    <TouchableOpacity
                        style={[styles.newBtn, { backgroundColor: isDark ? '#1a1a2e' : '#f0f0f5' }]}
                        onPress={() => setNewChatOpen(true)}
                    >
                        <Octicons name="pencil" size={17} color={isDark ? '#fff' : '#111'} />
                    </TouchableOpacity>
                </View>

                {/* Buscador */}
                <View style={[styles.searchBar, { backgroundColor: inputBg }]}>
                    <Ionicons name="search" size={15} color={placeholderColor} />
                    <TextInput
                        style={[styles.searchInput, { color: inputColor }]}
                        placeholder="Buscar conversación..."
                        placeholderTextColor={placeholderColor}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={15} color={placeholderColor} />
                        </TouchableOpacity>
                    )}
                </View>
            </BlurView>

            {/* ── Lista ──────────────────────────────────────────────────────── */}
            <FlatList
                data={filtered}
                keyExtractor={(item) => item.chat_id}
                renderItem={renderItem}
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => fetchInbox(true)} tintColor="#1DA1F2" />
                }
                ItemSeparatorComponent={() => (
                    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', marginLeft: 80 }} />
                )}
                ListEmptyComponent={() => (
                    <View style={styles.centered}>
                        <Ionicons name="chatbubbles-outline" size={56} color={emptyColor} />
                        <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#111' }]}>
                            {search ? 'Sin resultados' : 'Ningún mensaje aún'}
                        </Text>
                        <Text style={{ color: emptyColor, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 }}>
                            {search ? `No hay conversaciones con "${search}"` : 'Toca el lápiz para escribir a alguien.'}
                        </Text>

                        {!search && (
                            <TouchableOpacity
                                style={styles.emptyBtn}
                                onPress={() => setNewChatOpen(true)}
                            >
                                <Text style={styles.emptyBtnText}>Nuevo mensaje</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            />

            {/* ── Modal nuevo chat ────────────────────────────────────────────── */}
            {user?.id && (
                <NewChatModal
                    visible={newChatOpen}
                    onClose={() => setNewChatOpen(false)}
                    myUserId={user.id}
                    isDark={isDark}
                />
            )}
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 40 },
    // Header
    header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    newBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9, gap: 8 },
    searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
    // Inbox item
    inboxItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 13 },
    avatarWrap: { position: 'relative' },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    verifiedBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#fff', borderRadius: 8 },
    itemContent: { flex: 1, gap: 4 },
    itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    itemName: { fontSize: 15, flex: 1 },
    itemTime: { fontSize: 12, marginLeft: 8 },
    itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    itemPreview: { fontSize: 14, flex: 1 },
    unreadBadge: { backgroundColor: '#1DA1F2', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: 8 },
    unreadCount: { color: '#fff', fontSize: 11, fontWeight: '700' },
    // Empty state
    emptyTitle: { fontSize: 18, fontWeight: '700' },
    emptyBtn: { marginTop: 8, backgroundColor: '#1DA1F2', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    // Modal
    modalContainer: { flex: 1 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
    modalClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    modalTitle: { fontSize: 17, fontWeight: '700' },
    modalSearch: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 12, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
    modalSearchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
    userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    startBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
