import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    useColorScheme, ScrollView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import TitleSupport from '@/Services/TitleSupport';

// ─── Sección con ítems de navegación ────────────────────────────────────────

interface SectionItem {
    icon: any;
    iconColor: string;
    iconBg: string;
    label: string;
    subtitle: string;
    onPress: () => void;
    badge?: string;
}

function SectionRow({ item, isDark, isLast }: { item: SectionItem; isDark: boolean; isLast: boolean }) {
    const text   = isDark ? '#FFFFFF' : '#111111';
    const sub    = isDark ? '#777777' : '#888888';
    const border = isDark ? '#1E1E1E' : '#F0F0F0';

    return (
        <TouchableOpacity
            style={[styles.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border }]}
            onPress={item.onPress}
            activeOpacity={0.6}
        >
            <View style={[styles.rowIcon, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={18} color={item.iconColor} />
            </View>

            <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: text }]}>{item.label}</Text>
                <Text style={[styles.rowSubtitle, { color: sub }]}>{item.subtitle}</Text>
            </View>

            <View style={styles.rowRight}>
                {item.badge && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={isDark ? '#444' : '#CCC'} />
            </View>
        </TouchableOpacity>
    );
}

function Section({ title, items, isDark }: { title: string; items: SectionItem[]; isDark: boolean }) {
    const card   = isDark ? '#111111' : '#FFFFFF';
    const border = isDark ? '#1E1E1E' : '#ECECEC';
    const label  = isDark ? '#666666' : '#999999';

    return (
        <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, { color: label }]}>{title.toUpperCase()}</Text>
            <View style={[styles.sectionCard, { backgroundColor: card, borderColor: border }]}>
                {items.map((item, i) => (
                    <SectionRow key={item.label} item={item} isDark={isDark} isLast={i === items.length - 1} />
                ))}
            </View>
        </View>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SoporteScreen() {
    const isDark = useColorScheme() === 'dark';

    useFocusEffect(
        useCallback(() => {
            TitleSupport.setTitle("Ayuda y Soporte");
        }, [])
    );

    const bg   = isDark ? '#000000' : '#F5F5F5';
    const text = isDark ? '#FFFFFF' : '#111111';
    const sub  = isDark ? '#555555' : '#999999';
    const border = isDark ? '#1C1C1C' : '#E8E8E8';

    const misReportes: SectionItem[] = [
        {
            icon: 'ticket-outline',
            iconColor: '#3B82F6',
            iconBg: 'rgba(59,130,246,0.12)',
            label: 'Mis reportes',
            subtitle: 'Consulta el estado de tus reportes',
            onPress: () => router.push('/settings/support/reports' as any),
        },
    ];

    const ayuda: SectionItem[] = [
        {
            icon: 'help-circle-outline',
            iconColor: '#8B5CF6',
            iconBg: 'rgba(139,92,246,0.12)',
            label: 'Preguntas frecuentes',
            subtitle: 'Respuestas a las dudas más comunes',
            onPress: () => {},
        },
        {
            icon: 'book-outline',
            iconColor: '#10B981',
            iconBg: 'rgba(16,185,129,0.12)',
            label: 'Centro de ayuda',
            subtitle: 'Guías y tutoriales de la app',
            onPress: () => {},
        },
    ];

    const legal: SectionItem[] = [
        {
            icon: 'shield-outline',
            iconColor: '#F59E0B',
            iconBg: 'rgba(245,158,11,0.12)',
            label: 'Política de privacidad',
            subtitle: 'Cómo usamos tus datos',
            onPress: () => {},
        },
        {
            icon: 'document-text-outline',
            iconColor: '#6B7280',
            iconBg: 'rgba(107,114,128,0.12)',
            label: 'Términos de uso',
            subtitle: 'Condiciones del servicio',
            onPress: () => {},
        },
    ];

    return (
        <View style={[styles.screen, { backgroundColor: bg }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />


            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* Tagline */}
                <View style={styles.hero}>
                    <View style={[styles.heroIcon, { backgroundColor: isDark ? '#111' : '#EEF2FF' }]}>
                        <Ionicons name="headset-outline" size={28} color="#3B82F6" />
                    </View>
                    <Text style={[styles.heroTitle, { color: text }]}>¿En qué podemos ayudarte?</Text>
                    <Text style={[styles.heroSub, { color: sub }]}>
                        Consulta tus reportes, accede al centro de ayuda o revisa las políticas de Agora.
                    </Text>
                </View>

                <Section title="Mis reportes" items={misReportes} isDark={isDark} />
                <Section title="Ayuda" items={ayuda} isDark={isDark} />
                <Section title="Legal" items={legal} isDark={isDark} />

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
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },

    scroll: { paddingBottom: 48 },

    // Hero
    hero: {
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 28,
        gap: 8,
    },
    heroIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    heroTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
    heroSub: { fontSize: 14, lineHeight: 20, textAlign: 'center' },

    // Section
    sectionWrapper: { paddingHorizontal: 16, marginBottom: 8 },
    sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 },
    sectionCard: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },

    // Row
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 14,
        gap: 12,
    },
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowContent: { flex: 1, gap: 1 },
    rowLabel: { fontSize: 15, fontWeight: '600' },
    rowSubtitle: { fontSize: 12 },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

    badge: {
        backgroundColor: '#3B82F6',
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    badgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
});