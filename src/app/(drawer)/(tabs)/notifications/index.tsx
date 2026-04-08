import useAuth from "@/hooks/useAuth";
import { getNotifcations, markAllAsRead } from "@/Services/NotificationService";
import { Notifications } from "@/Types/Notifications";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";

// ─── Tiempo relativo ───────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
}

// ─── Icono según el tipo de notificación ──────────────────────────────────
function NotifIcon({ type }: { type: string }) {
    const config: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
        like: { name: "heart", color: "#F91880" },
        repost: { name: "repeat", color: "#00BA7C" },
        reply: { name: "chatbubble", color: "#1DA1F2" },
        mention: { name: "at", color: "#9b59b6" },
        follow: { name: "person-add", color: "#f39c12" },
    };
    const cfg = config[type] ?? { name: "notifications", color: "#888" };
    return (
        <View style={[styles.notifIconBadge, { backgroundColor: cfg.color }]}>
            <Ionicons name={cfg.name} size={11} color="#fff" />
        </View>
    );
}

// ─── Item de notificación ─────────────────────────────────────────────────
function NotificationItem({ item, isDark }: { item: Notifications; isDark: boolean }) {
    const bg = item.is_read
        ? isDark ? "#111" : "#fff"
        : isDark ? "#1a1a2e" : "#f0f4ff";
    const textColor = isDark ? "#fff" : "#0f0f0f";
    const subColor = isDark ? "#888" : "#6b6b6b";
    const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

    const user = (item as any).users;
    const displayName = user?.display_name || user?.username || "Agora User";
    const avatarUri = user?.profile_picture_url;

    const handlePress = () => {
        // Si tiene post_id, navega al post; si es follow, al perfil del sender
        if (item.post_id) {
            router.push(`/post/${item.post_id}`);
        } else if (user?.id) {
            router.push(`/perfil/${user.id}`);
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.75}
            onPress={handlePress}
            style={[styles.item, { backgroundColor: bg, borderBottomColor: borderColor }]}
        >
            {/* Avatar + badge de tipo */}
            <View style={styles.avatarContainer}>
                {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? "#333" : "#e5e7eb" }]}>
                        <Ionicons name="person" size={20} color={isDark ? "#555" : "#aaa"} />
                    </View>
                )}
                <NotifIcon type={item.type} />
            </View>

            {/* Texto */}
            <View style={styles.textContainer}>
                <Text style={[styles.notifText, { color: textColor }]} numberOfLines={2}>
                    <Text style={styles.bold}>{displayName}</Text>
                    {" "}{item.text_notification}
                </Text>
                <Text style={[styles.time, { color: subColor }]}>{timeAgo(item.created_at)}</Text>
            </View>

            {/* Punto azul si no leída */}
            {!item.is_read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );
}

// ─── Pantalla principal ───────────────────────────────────────────────────
export default function NotificationScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const user = useAuth();

    const [notifications, setNotifications] = useState<Notifications[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const bg = isDark ? "#000" : "#fff";
    const emptyColor = isDark ? "#555" : "#aaa";
    const sepColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

    // ── Carga de datos ───────────────────────────────────────────────────
    const fetchNotifications = useCallback(async (isRefresh = false) => {
        if (!user?.id) return;
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        // 1. Obtenemos las notificaciones del usuario actual
        const data = await getNotifcations(user.id);
        setNotifications(data as Notifications[]);

        // 2. Marcamos todas como leídas al abrir la pantalla
        //    Esto resetea el badge del tab de forma natural (el layout consulta is_read)
        await markAllAsRead(user.id);

        if (isRefresh) setRefreshing(false);
        else setLoading(false);
    }, [user?.id]);

    // ── Al montar, cargar notificaciones ─────────────────────────────────
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // ── Renderizado de cada fila ──────────────────────────────────────────
    const renderItem = useCallback(({ item }: { item: Notifications }) => (
        <NotificationItem item={item} isDark={isDark} />
    ), [isDark]);

    const keyExtractor = useCallback((item: Notifications) => item.id, []);

    // ── Estado de carga inicial ───────────────────────────────────────────
    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color="#1DA1F2" />
            </View>
        );
    }

    return (
        <FlatList
            data={notifications}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            style={{ backgroundColor: bg }}
            contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
            // ── Pull-to-refresh ─────────────────────────────────────────────
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => fetchNotifications(true)}
                    tintColor="#1DA1F2"
                    colors={["#1DA1F2"]}
                />
            }
            ItemSeparatorComponent={() => (
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: sepColor }} />
            )}
            ListEmptyComponent={() => (
                <View style={styles.centered}>
                    <Ionicons name="notifications-off-outline" size={52} color={emptyColor} />
                    <Text style={[styles.emptyText, { color: emptyColor }]}>
                        No tienes notificaciones aún
                    </Text>
                </View>
            )}
        />
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: "500",
    },
    item: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatarContainer: {
        position: "relative",
        width: 48,
        height: 48,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    notifIconBadge: {
        position: "absolute",
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: "transparent",
    },
    textContainer: {
        flex: 1,
        gap: 3,
    },
    notifText: {
        fontSize: 14,
        lineHeight: 20,
    },
    bold: {
        fontWeight: "700",
    },
    time: {
        fontSize: 12,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#1DA1F2",
        alignSelf: "center",
    },
});