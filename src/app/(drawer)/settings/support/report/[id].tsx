import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    useColorScheme, ScrollView, StatusBar, TextInput,
    KeyboardAvoidingView, Platform, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ReportWithMessages, ReportStatus } from '@/Types/Reports';
import useAuth from '@/hooks/useAuth';
import { getReportById, addReportMessage } from '@/Services/ReportService';
import TitleSupport from '@/Services/TitleSupport';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; bg: string; icon: any }> = {
    pending: { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'time-outline' },
    reviewed: { label: 'Revisado', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: 'checkmark-circle-outline' },
    dismissed: { label: 'Desestimado', color: '#6B7280', bg: 'rgba(107,114,128,0.12)', icon: 'close-circle-outline' },
};

const CONTEXT_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    post: { label: 'Publicación', icon: 'document-text-outline', color: '#3B82F6' },
    user: { label: 'Usuario', icon: 'person-outline', color: '#8B5CF6' },
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReportDetailScreen() {
    const { id } = useLocalSearchParams();
    const isDark = useColorScheme() === 'dark';
    const currentUser = useAuth();

    const [report, setReport] = useState<ReportWithMessages | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (!id) return;
        getReportById(id as string).then((res) => {
            setReport(res);
            if (res) {
                TitleSupport.setTitle(TitleSupport.titleTicket(res.id));
            }
        });

        // Limpiar el título al salir de la pantalla
        return () => {
            TitleSupport.setTitle("Ayuda y Soporte");
        };
    }, [id]);

    const bg = isDark ? '#000000' : '#F7F7F7';
    const text = isDark ? '#FFFFFF' : '#111111';
    const sub = isDark ? '#666666' : '#888888';
    const border = isDark ? '#1C1C1C' : '#E8E8E8';
    const card = isDark ? '#111111' : '#FFFFFF';

    const inputBg = isDark ? '#1A1A1A' : '#FFFFFF';
    const myMsgBg = isDark ? '#2563EB' : '#3B82F6';
    const otherMsgBg = isDark ? '#1A1A1A' : '#E5E7EB';
    const otherMsgText = isDark ? '#FFFFFF' : '#111111';

    if (!report) return null;

    const status = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.pending;
    const context = CONTEXT_CONFIG[report.context] ?? CONTEXT_CONFIG.post;

    const handleSend = async () => {
        if (!newMessage.trim() || !currentUser) return;
        const tempMsg = newMessage.trim();
        setNewMessage("");
        Keyboard.dismiss();

        try {
            const addedMsg = await addReportMessage(report.id, tempMsg);
            if (addedMsg) {
                setReport(prev => prev ? { ...prev, messages: [...prev.messages, addedMsg] } : null);
            }
        } catch (e) {
            console.error("Error enviando mensaje", e);
        }

        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    return (
        <KeyboardAvoidingView
            style={[styles.screen, { backgroundColor: bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* <Stack.Screen 
                options={{ 
                    title: `Ticket #${report.id.slice(0, 8).toUpperCase()}`,
                    headerShown: true
                }} 
            /> */}

            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {/* Detalles del Reporte Original */}
                <View style={[styles.originalReport, { backgroundColor: card, borderColor: border }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.contextBadge, { backgroundColor: context.color + '18' }]}>
                            <Ionicons name={context.icon} size={12} color={context.color} />
                            <Text style={[styles.contextLabel, { color: context.color }]}>{context.label}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                            <Ionicons name={status.icon} size={12} color={status.color} />
                            <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
                        </View>
                    </View>

                    <Text style={[styles.reason, { color: text }]}>{report.reason}</Text>
                    {!!report.description && (
                        <Text style={[styles.description, { color: sub }]}>{report.description}</Text>
                    )}

                    <View style={styles.cardFooter}>
                        <Text style={[styles.date, { color: sub }]}>Creado el {timeAgo(report.created_at)}</Text>
                    </View>
                </View>

                {/* Separador */}
                {report.messages.length > 0 && (
                    <View style={styles.timelineDivider}>
                        <View style={[styles.timelineLine, { backgroundColor: border }]} />
                        <Text style={[styles.timelineText, { color: sub, backgroundColor: bg }]}>Actualizaciones</Text>
                        <View style={[styles.timelineLine, { backgroundColor: border }]} />
                    </View>
                )}

                {/* Mensajes */}
                {report.messages.map((msg, index) => {
                    const isMe = msg.user_id === currentUser?.id;
                    const showAvatar = !isMe && (index === 0 || report.messages[index - 1].user_id !== msg.user_id);

                    return (
                        <View key={msg.id} style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
                            {!isMe && (
                                <View style={styles.avatarContainer}>
                                    {showAvatar ? (
                                        <View style={styles.systemAvatar}>
                                            <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                                        </View>
                                    ) : <View style={styles.avatarSpacer} />}
                                </View>
                            )}

                            <View style={[
                                styles.messageBubble,
                                isMe ? [styles.bubbleMe, { backgroundColor: myMsgBg }] : [styles.bubbleOther, { backgroundColor: otherMsgBg }]
                            ]}>
                                <Text style={[styles.messageText, { color: isMe ? '#FFFFFF' : otherMsgText }]}>
                                    {msg.content}
                                </Text>
                                <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : sub }]}>
                                    {timeAgo(msg.created_at)}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Input Area */}
            {report.status !== 'dismissed' && (
                <View style={[styles.inputContainer, { backgroundColor: bg, borderTopColor: border }]}>
                    <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: border }]}>
                        <TextInput
                            style={[styles.input, { color: text }]}
                            placeholder="Añadir un comentario..."
                            placeholderTextColor={sub}
                            value={newMessage}
                            onChangeText={setNewMessage}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!newMessage.trim()}
                            style={[
                                styles.sendBtn,
                                { backgroundColor: newMessage.trim() ? '#3B82F6' : (isDark ? '#333' : '#E5E5E5') }
                            ]}
                        >
                            <Ionicons name="arrow-up" size={18} color={newMessage.trim() ? '#FFF' : sub} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 56,
        paddingBottom: 14,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        zIndex: 10,
    },
    backBtn: { width: 40, alignItems: 'flex-start' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
    headerSub: { fontSize: 12, marginTop: 1 },

    scrollContent: { padding: 16, paddingBottom: 24 },

    // Original Report Card
    originalReport: {
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 16,
        marginBottom: 20,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    contextBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    contextLabel: { fontSize: 11, fontWeight: '600' },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    statusLabel: { fontSize: 11, fontWeight: '600' },
    reason: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, marginBottom: 6 },
    description: { fontSize: 14, lineHeight: 20 },
    cardFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(150,150,150,0.2)' },
    date: { fontSize: 12, fontWeight: '500' },

    // Timeline Divider
    timelineDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    timelineLine: { flex: 1, height: StyleSheet.hairlineWidth },
    timelineText: { paddingHorizontal: 12, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

    // Messages
    messageRow: { flexDirection: 'row', marginBottom: 12, maxWidth: '85%' },
    messageRowMe: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    messageRowOther: { alignSelf: 'flex-start' },

    avatarContainer: { width: 28, marginRight: 8, justifyContent: 'flex-end', paddingBottom: 2 },
    systemAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
    avatarSpacer: { width: 28 },

    messageBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
    bubbleMe: { borderBottomRightRadius: 4 },
    bubbleOther: { borderBottomLeftRadius: 4 },
    messageText: { fontSize: 15, lineHeight: 20 },
    messageTime: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },

    // Input Area
    inputContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderRadius: 24,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 44,
        maxHeight: 120,
    },
    input: {
        flex: 1,
        fontSize: 15,
        paddingTop: 4,
        paddingBottom: 4,
        paddingRight: 8,
        maxHeight: 100,
    },
    sendBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
});
