import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RealtimeChannel } from '@supabase/supabase-js';
import useAuth from '@/hooks/useAuth';
import { MessageService } from '@/Services/MessageService';
import { supabase } from '@/lib/supbase/supabase';
import type { DecryptedMessage } from '@/Types/Chats';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ─── Burbuja de mensaje ───────────────────────────────────────────────────────
function MessageBubble({ msg, isDark }: { msg: DecryptedMessage; isDark: boolean }) {
    const isMine = msg.isMine;

    const bubbleBg = isMine
        ? '#1DA1F2'
        : isDark
        ? '#1e1e2e'
        : '#f0f0f5';

    const textColor = isMine ? '#fff' : isDark ? '#fff' : '#0f0f0f';
    const timeColor = isMine ? 'rgba(255,255,255,0.65)' : isDark ? '#666' : '#aaa';

    return (
        <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
            <View
                style={[
                    styles.bubble,
                    { backgroundColor: bubbleBg },
                    isMine ? styles.bubbleMine : styles.bubbleOther,
                ]}
            >
                <Text style={[styles.bubbleText, { color: textColor }]}>{msg.content}</Text>
                <Text style={[styles.bubbleTime, { color: timeColor }]}>
                    {formatTime(msg.created_at)}
                    {isMine && (
                        <Text> ✓</Text>
                    )}
                </Text>
            </View>
        </View>
    );
}

// ─── Pantalla de Chat ─────────────────────────────────────────────────────────
export default function ChatScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    const { chatId } = useLocalSearchParams<{ chatId: string }>();
    const user = useAuth();

    const [messages, setMessages] = useState<DecryptedMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [contactName, setContactName] = useState('');
    const [contactAvatar, setContactAvatar] = useState<string | null>(null);

    const listRef = useRef<FlatList>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const oldestCursorRef = useRef<string | undefined>(undefined);
    const [realtimeError, setRealtimeError] = useState(false);

    const bg = isDark ? '#000' : '#fff';
    const inputBg = isDark ? '#1a1a1a' : '#f0f0f7';
    const inputColor = isDark ? '#fff' : '#0f0f0f';
    const headerBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const placeholderColor = isDark ? '#555' : '#aaa';
    const inputAreaBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    // ── Cargar info del chat y mensajes ──────────────────────────────────────
    useEffect(() => {
        if (!chatId || !user?.id) return;

        const init = async () => {
            setLoading(true);
            oldestCursorRef.current = undefined;
            setHasMore(true);

            // 1. Datos del otro participante (FK explícita para evitar ambigüedad PostgREST)
            const { data: participants } = await supabase
                .from('chat_participants')
                .select('user_id, users!chat_participants_user_id_fkey(display_name, username, profile_picture_url)')
                .eq('chat_id', chatId)
                .neq('user_id', user.id);

            const other = participants?.[0] as any;
            if (other?.users) {
                setContactName(other.users.display_name || other.users.username);
                setContactAvatar(other.users.profile_picture_url ?? null);
            }

            // 2. Mensajes históricos desencriptados (primera página, 40 mensajes)
            const msgs = await MessageService.getMessages(chatId, user.id);
            setMessages(msgs);
            if (msgs.length > 0) {
                // El último elemento es el más antiguo (la lista viene desc por created_at)
                oldestCursorRef.current = msgs[msgs.length - 1].created_at;
            }
            if (msgs.length < 40) setHasMore(false);
            setLoading(false);

            // 3. Marcar como leídos
            await MessageService.markAsRead(chatId, user.id);
        };

        init();
    }, [chatId, user?.id]);

    // ── Cargar más mensajes (scroll infinito hacia el pasado) ─────────────────
    const handleLoadMore = useCallback(async () => {
        if (!chatId || !user?.id || loadingMore || !hasMore) return;
        if (!oldestCursorRef.current) return;

        setLoadingMore(true);
        const older = await MessageService.getMessages(chatId, user.id, oldestCursorRef.current);
        if (older.length === 0) {
            setHasMore(false);
        } else {
            // Los mensajes más antiguos van al FINAL del array (que es el INICIO de la lista invertida)
            setMessages((prev) => [...prev, ...older]);
            oldestCursorRef.current = older[older.length - 1].created_at;
            if (older.length < 40) setHasMore(false);
        }
        setLoadingMore(false);
    }, [chatId, user?.id, loadingMore, hasMore]);


    const autoReconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Suscripción Realtime ─────────────────────────────────────────
    const subscribeRealtime = useCallback(() => {
        if (!chatId || !user?.id) return;

        // Cancelar timer de reconexion pendiente
        if (autoReconnectTimer.current) {
            clearTimeout(autoReconnectTimer.current);
            autoReconnectTimer.current = null;
        }

        // Cerrar canal previo
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        setRealtimeError(false);

        channelRef.current = MessageService.subscribeToChat(
            chatId,
            user.id,
            (newMsg) => {
                setMessages((prev) => [newMsg, ...prev]);
                MessageService.markAsRead(chatId, user.id).catch(() => {});
            },
            (status) => {
                console.warn('[ChatScreen] Canal error:', status);
                setRealtimeError(true);
                // Reconexion automática en 4s
                autoReconnectTimer.current = setTimeout(() => {
                    console.log('[ChatScreen] Reconectando automáticamente...');
                    subscribeRealtime();
                }, 4000);
            },
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatId, user?.id]);

    // Suscribir al montar / cuando cambia el chat o el usuario
    useEffect(() => {
        if (!chatId || !user?.id) return;
        subscribeRealtime();
        return () => {
            if (autoReconnectTimer.current) clearTimeout(autoReconnectTimer.current);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [chatId, user?.id, subscribeRealtime]);

    // ── Enviar mensaje ────────────────────────────────────────────────────────
    const handleSend = useCallback(async () => {
        const text = inputText.trim();
        if (!text || !chatId || !user?.id || sending) return;

        setSending(true);
        setInputText('');

        // Optimistic update: añadimos el mensaje a la lista inmediatamente
        const optimisticMsg: DecryptedMessage = {
            id: `pending_${Date.now()}`,
            chat_id: chatId,
            sender_id: user.id,
            content_encrypted: '',
            content: text,
            created_at: new Date().toISOString(),
            isMine: true,
        };
        setMessages((prev) => [optimisticMsg, ...prev]);

        // Cifrar y persistir en Supabase
        const sent = await MessageService.sendMessage(
            chatId,
            user.id,
            text,
            user.display_name || user.username || '',
        );

        if (sent) {
            // Reemplazamos el optimistic por el real (con ID real de Supabase)
            setMessages((prev) =>
                prev.map((m) => (m.id === optimisticMsg.id ? sent : m))
            );
        } else {
            // Si falla, quitamos el mensaje optimista
            setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        }

        setSending(false);
    }, [inputText, chatId, user?.id, sending]);

    // ── Descarga manual de llave (fallback) ───────────────────────────────────
    const handleManualKeyDownload = useCallback(async () => {
        if (!chatId || !user?.id) return;
        setLoading(true);
        const success = await MessageService.downloadChatKey(chatId);
        if (success) {
            const msgs = await MessageService.getMessages(chatId, user.id);
            setMessages(msgs);
        } else {
            Alert.alert('Error', 'No se pudo obtener la llave de cifrado. Puede que aún no se haya distribuido a este dispositivo.');
        }
        setLoading(false);
    }, [chatId, user?.id]);

    // ── Render ──────────────────────────────────────────────────────────────────
    const renderItem = useCallback(
        ({ item }: { item: DecryptedMessage }) => (
            <MessageBubble msg={item} isDark={isDark} />
        ),
        [isDark],
    );

    const keyExtractor = useCallback((item: DecryptedMessage) => item.id, []);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <BlurView
                intensity={90}
                tint={isDark ? 'dark' : 'light'}
                style={[
                    styles.header,
                    { paddingTop: insets.top + 6, borderBottomColor: headerBorder },
                ]}
            >
                {/* Botón volver — rounded-full gray pill como ProfileAppBar */}
                <TouchableOpacity
                    style={[styles.backBtn, { backgroundColor: isDark ? '#1c1c1c' : '#f0f0f5' }]}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={20} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>

                {/* Avatar + nombre */}
                <View style={styles.headerContact}>
                    {contactAvatar ? (
                        <Image source={{ uri: contactAvatar }} style={styles.headerAvatar} />
                    ) : (
                        <View style={[styles.headerAvatarFallback, { backgroundColor: isDark ? '#1c1c28' : '#ebebf5' }]}>
                            <Text style={{ color: isDark ? '#8888aa' : '#6666aa', fontWeight: '900', fontSize: 16 }}>
                                {contactName[0]?.toUpperCase() ?? '?'}
                            </Text>
                        </View>
                    )}
                    <View style={{ gap: 2 }}>
                        <Text style={[styles.headerName, { color: isDark ? '#fff' : '#0a0a0a' }]} numberOfLines={1}>
                            {contactName || '...'}
                        </Text>
                        <TouchableOpacity style={styles.e2eeIndicator} onPress={handleManualKeyDownload} activeOpacity={0.7}>
                            <Ionicons name="lock-closed" size={9} color="#00BA7C" />
                            <Text style={styles.e2eeText}>cifrado extremo a extremo</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </BlurView>

            {/* ── Lista de mensajes ────────────────────────────────────────── */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#1DA1F2" />
                </View>
            ) : (
                <>
                    {realtimeError && (
                        <Pressable
                            style={[
                                styles.errorBanner,
                                { backgroundColor: isDark ? '#3a1a1a' : '#fff0f0' },
                            ]}
                            onPress={async () => {
                                // Reconectar y recuperar mensajes que llegaron mientras estaba caído
                                subscribeRealtime();

                                // Traer mensajes más nuevos que el último que tenemos
                                if (chatId && user?.id && messages.length > 0) {
                                    const newest = messages[0].created_at;
                                    const { data } = await supabase
                                        .from('chat_content')
                                        .select('id, chat_id, content, sender_id, created_at')
                                        .eq('chat_id', chatId)
                                        .gt('created_at', newest)
                                        .order('created_at', { ascending: false });

                                    if (data && data.length > 0) {
                                        // Los mensajes perdidos se añaden al estado (sin descifrar en modo degradado)
                                        const missed = data.map((m) => ({
                                            id: m.id,
                                            chat_id: m.chat_id,
                                            sender_id: m.sender_id,
                                            content_encrypted: m.content,
                                            content: '[mensaje cifrado]',
                                            created_at: m.created_at!,
                                            isMine: m.sender_id === user.id,
                                        }));
                                        setMessages((prev) => {
                                            const ids = new Set(prev.map((x) => x.id));
                                            return [...missed.filter((m) => !ids.has(m.id)), ...prev];
                                        });
                                    }
                                }
                            }}
                        >
                            <Ionicons name="warning-outline" size={14} color="#e53935" />
                            <Text style={styles.errorBannerText}>Sin conexión en tiempo real. Toca para reconectar.</Text>
                        </Pressable>
                    )}
                    <FlatList
                        ref={listRef}
                        data={messages}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        inverted
                        style={{ flex: 1 }}
                        contentContainerStyle={{
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            gap: 4,
                        }}
                        // Scroll hacia arriba en lista invertida = scroll hacia mensajes más antiguos
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.3}
                        ListFooterComponent={loadingMore ? (
                            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#1DA1F2" />
                            </View>
                        ) : null}
                        ListEmptyComponent={() => (
                            <View style={[styles.centered, { transform: [{ scaleY: -1 }] }]}>
                                <Ionicons name="lock-closed-outline" size={40} color={isDark ? '#333' : '#ccc'} />
                                <Text style={[
                                    { color: isDark ? '#444' : '#bbb', marginTop: 8, fontSize: 14 },
                                    { transform: [{ scaleY: -1 }] },
                                ]}>
                                    Inicio de la conversación cifrada
                                </Text>
                            </View>
                        )}
                    />
                </>
            )}

            {/* ── Input de texto ──────────────────────────────────────────── */}
            <BlurView
                intensity={80}
                tint={isDark ? 'dark' : 'light'}
                style={[
                    styles.inputArea,
                    {
                        paddingBottom: insets.bottom + 8,
                        borderTopColor: inputAreaBorder,
                    },
                ]}
            >
                    <View style={[styles.inputRow]}>
                        <TextInput
                            style={[styles.textInput, { backgroundColor: inputBg, color: inputColor }]}
                            placeholder="Mensaje..."
                            placeholderTextColor={placeholderColor}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={2000}
                            returnKeyType="default"
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendBtn,
                                {
                                    backgroundColor: inputText.trim() ? '#1DA1F2' : isDark ? '#1a1a1a' : '#e8e8f0',
                                },
                            ]}
                            onPress={handleSend}
                            disabled={!inputText.trim() || sending}
                            activeOpacity={0.75}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons
                                    name="arrow-up"
                                    size={20}
                                    color={inputText.trim() ? '#fff' : isDark ? '#444' : '#aaa'}
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                </BlurView>
        </KeyboardAvoidingView>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },

    // ─ Header — siguiendo ProfileAppBar: px-6, rounded-full buttons
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 14,
        gap: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 13,  // squircle como en perfil
    },
    headerAvatarFallback: {
        width: 40,
        height: 40,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerName: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.6,
        textTransform: 'uppercase',
    },
    e2eeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    e2eeText: {
        fontSize: 9,
        color: '#00BA7C',
        fontWeight: '600',
        letterSpacing: 0.2,
    },

    // ─ Burbujas
    bubbleRow: { marginVertical: 2 },
    bubbleRowMine: { alignItems: 'flex-end' },
    bubbleRowOther: { alignItems: 'flex-start' },
    bubble: {
        maxWidth: '78%',
        paddingHorizontal: 15,
        paddingVertical: 10,
        gap: 4,
    },
    bubbleMine: {
        borderRadius: 20,
        borderBottomRightRadius: 6,
    },
    bubbleOther: {
        borderRadius: 20,
        borderBottomLeftRadius: 6,
    },
    bubbleText: {
        fontSize: 15,
        lineHeight: 21,
    },
    bubbleTime: {
        fontSize: 10,
        alignSelf: 'flex-end',
    },

    // ─ Input
    inputArea: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
    },
    textInput: {
        flex: 1,
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingVertical: 12,
        fontSize: 15,
        maxHeight: 120,
        lineHeight: 20,
        borderWidth: StyleSheet.hairlineWidth,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ─ Error banner
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 12,
        marginVertical: 4,
        borderRadius: 12,
    },
    errorBannerText: {
        fontSize: 12,
        color: '#e53935',
        flexShrink: 1,
        fontWeight: '600',
    },
});
