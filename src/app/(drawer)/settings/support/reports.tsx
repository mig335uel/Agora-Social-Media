import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    useColorScheme, ScrollView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Report, ReportStatus } from '@/Types/Reports';

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
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; bg: string; icon: any }> = {
    pending:   { label: 'Pendiente',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  icon: 'time-outline' },
    reviewed:  { label: 'Revisado',    color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: 'checkmark-circle-outline' },
    dismissed: { label: 'Desestimado', color: '#6B7280', bg: 'rgba(107,114,128,0.12)', icon: 'close-circle-outline' },
};

const CONTEXT_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    post: { label: 'Publicación', icon: 'document-text-outline', color: '#3B82F6' },
    user: { label: 'Usuario',     icon: 'person-outline',        color: '#8B5CF6' },
};

// ─── Ticket Card ─────────────────────────────────────────────────────────────

function TicketCard({ report, isDark, onPress }: { report: Report; isDark: boolean; onPress: () => void }) {
    const status  = STATUS_CONFIG[report.status]   ?? STATUS_CONFIG.pending;
    const context = CONTEXT_CONFIG[report.context] ?? CONTEXT_CONFIG.post;

    const card   = isDark ? '#111111' : '#FFFFFF';
    const border = isDark ? '#222222' : '#EDEDED';
    const text   = isDark ? '#FFFFFF' : '#111111';
    const sub    = isDark ? '#777777' : '#888888';

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: card, borderColor: border }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Header row */}
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

            {/* Motivo */}
            <Text style={[styles.reason, { color: text }]} numberOfLines={1}>
                {report.reason}
            </Text>

            {/* Descripción */}
            {!!report.description && (
                <Text style={[styles.description, { color: sub }]} numberOfLines={2}>
                    {report.description}
                </Text>
            )}

            {/* Footer */}
            <View style={styles.cardFooter}>
                <View style={styles.ticketIdRow}>
                    <Ionicons name="ticket-outline" size={11} color={sub} />
                    <Text style={[styles.ticketId, { color: sub }]}>
                        #{report.id.slice(0, 8).toUpperCase()}
                    </Text>
                </View>
                <Text style={[styles.date, { color: sub }]}>{timeAgo(report.created_at)}</Text>
            </View>

            <View style={styles.arrow}>
                <Ionicons name="chevron-forward" size={16} color={sub} />
            </View>
        </TouchableOpacity>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isDark }: { isDark: boolean }) {
    return (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }]}>
                <Ionicons name="shield-checkmark-outline" size={36} color={isDark ? '#333' : '#CCC'} />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#555' : '#AAA' }]}>Sin reportes</Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#3A3A3A' : '#CCC' }]}>
                Aquí aparecerán tus tickets de soporte
            </Text>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReportesScreen() {
    const isDark = useColorScheme() === 'dark';

    const bg     = isDark ? '#000000' : '#F7F7F7';
    const text   = isDark ? '#FFFFFF' : '#111111';
    const sub    = isDark ? '#666666' : '#888888';
    const border = isDark ? '#1C1C1C' : '#E8E8E8';

    // TODO: sustituir con tu hook / llamada al servicio
    const [reports] = useState<Report[]>([]);
    const loading = false;

    return (
        <View style={[styles.screen, { backgroundColor: bg }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: border }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-back" size={26} color={text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: text }]}>Mis reportes</Text>
                    <Text style={[styles.headerSub, { color: sub }]}>
                        {reports.length > 0
                            ? `${reports.length} ticket${reports.length > 1 ? 's' : ''}`
                            : 'Historial de reportes'}
                    </Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            >
                {loading ? null : reports.length === 0 ? (
                    <EmptyState isDark={isDark} />
                ) : (
                    reports.map((r) => (
                        <TicketCard
                            key={r.id}
                            report={r}
                            isDark={isDark}
                            onPress={() => {/* navegar al detalle del ticket */}}
                        />
                    ))
                )}
            </ScrollView>
        </View>
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
    },
    backBtn: { width: 40, alignItems: 'flex-start' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
    headerSub: { fontSize: 12, marginTop: 1 },

    list: { padding: 16, gap: 12, paddingBottom: 40 },

    // Card
    card: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 14,
        paddingRight: 36,
        gap: 6,
        position: 'relative',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    contextBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    },
    contextLabel: { fontSize: 11, fontWeight: '600' },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    },
    statusLabel: { fontSize: 11, fontWeight: '600' },
    reason: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, marginTop: 2 },
    description: { fontSize: 13, lineHeight: 18 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    ticketIdRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ticketId: { fontSize: 11, fontWeight: '500', fontVariant: ['tabular-nums'] },
    date: { fontSize: 12 },
    arrow: { position: 'absolute', right: 12, top: '50%', marginTop: -10 },

    // Empty
    emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyIcon: {
        width: 72, height: 72, borderRadius: 36,
        alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: { fontSize: 17, fontWeight: '700' },
    emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
});
