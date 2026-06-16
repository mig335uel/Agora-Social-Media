import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface OGData {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    favicon?: string;
    url: string;
}

interface LinkPreviewCardProps {
    url: string;
    isDark: boolean;
}

// ─── Extractor de hostname limpio ─────────────────────────────────────────────
function getHostname(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return url;
    }
}

// ─── Fetch de metadatos OG via servidor propio ───────────────────────────────
const LINK_PREVIEW_API = 'https://api.periodiconaranja.es/agoras/link-preview';

async function fetchOGData(url: string): Promise<OGData | null> {
    try {
        const encodedUrl = encodeURIComponent(url);
        const res = await fetch(`${LINK_PREVIEW_API}?url=${encodedUrl}`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return null;
        const d = await res.json();
        return {
            title: d.title || undefined,
            description: d.description || undefined,
            image: d.image || undefined,
            siteName: d.siteName || undefined,
            favicon: d.favicon || undefined,
            url,
        };
    } catch {
        return null;
    }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function LinkPreviewCard({ url, isDark }: LinkPreviewCardProps) {
    const [data, setData] = useState<OGData | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setFailed(false);
        fetchOGData(url).then((result) => {
            if (cancelled) return;
            if (result) {
                setData(result);
            } else {
                setFailed(true);
            }
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [url]);

    const bg = isDark ? '#1e1e1e' : '#f5f5f7';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const textColor = isDark ? '#f0f0f0' : '#111';
    const subColor = isDark ? '#888' : '#666';
    const accentBar = isDark ? '#3b82f6' : '#1d4ed8';

    const openLink = () => Linking.openURL(url).catch(() => {});

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[styles.card, { backgroundColor: bg, borderColor }]}>
                <ActivityIndicator size="small" color={accentBar} style={{ margin: 16 }} />
            </View>
        );
    }

    // ── Fallback si no hay metadata ───────────────────────────────────────────
    if (failed || !data) {
        return (
            <TouchableOpacity
                style={[styles.card, styles.fallback, { backgroundColor: bg, borderColor }]}
                onPress={openLink}
                activeOpacity={0.85}
            >
                <Ionicons name="link-outline" size={16} color={accentBar} />
                <Text style={[styles.fallbackUrl, { color: accentBar }]} numberOfLines={1}>
                    {getHostname(url)}
                </Text>
            </TouchableOpacity>
        );
    }

    // ── Card con imagen ───────────────────────────────────────────────────────
    return (
        <TouchableOpacity
            activeOpacity={0.88}
            onPress={openLink}
            style={[styles.card, { backgroundColor: bg, borderColor }]}
        >
            {/* Barra de acento izquierda */}
            <View style={[styles.accentBar, { backgroundColor: accentBar }]} />

            <View style={styles.content}>
                {/* Imagen de portada */}
                {data.image ? (
                    <Image
                        source={{ uri: data.image }}
                        style={styles.coverImage}
                        resizeMode="cover"
                    />
                ) : null}

                {/* Info textual */}
                <View style={styles.textBlock}>
                    {/* Sitio + favicon */}
                    <View style={styles.siteRow}>
                        {data.favicon ? (
                            <Image
                                source={{ uri: data.favicon }}
                                style={styles.favicon}
                                resizeMode="contain"
                            />
                        ) : (
                            <Ionicons name="globe-outline" size={12} color={subColor} />
                        )}
                        <Text style={[styles.siteName, { color: subColor }]} numberOfLines={1}>
                            {data.siteName || getHostname(url)}
                        </Text>
                    </View>

                    {/* Título */}
                    {data.title ? (
                        <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
                            {data.title}
                        </Text>
                    ) : null}

                    {/* Descripción */}
                    {data.description ? (
                        <Text style={[styles.description, { color: subColor }]} numberOfLines={2}>
                            {data.description}
                        </Text>
                    ) : null}
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    card: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        marginTop: 10,
        marginBottom: 4,
        flexDirection: 'row',
    },
    accentBar: {
        width: 3,
        alignSelf: 'stretch',
        borderTopLeftRadius: 14,
        borderBottomLeftRadius: 14,
    },
    content: {
        flex: 1,
    },
    coverImage: {
        width: '100%',
        height: 160,
    },
    textBlock: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 4,
    },
    siteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    favicon: {
        width: 14,
        height: 14,
        borderRadius: 3,
    },
    siteName: {
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        flexShrink: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 19,
        marginTop: 2,
    },
    description: {
        fontSize: 12,
        lineHeight: 17,
        marginTop: 1,
    },
    fallback: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    fallbackUrl: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
});
