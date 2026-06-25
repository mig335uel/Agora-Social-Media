import { useColorScheme, View } from "react-native";
import { MaterialTopTabs } from "@/Components/TopBar/materialtopbars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppBar from "@/Components/AppBar";

export default function NotificationLayout() {
    const isDark = useColorScheme() === 'dark';
    const bg = isDark ? '#000' : '#fff';
    const activeColor = isDark ? '#fff' : '#000';
    const inactiveColor = isDark ? '#555' : '#aaa';
    const insets = useSafeAreaInsets();

    return (
        <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
            <AppBar title="Agora" />
            <MaterialTopTabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: bg,
                    shadowOpacity: 0,
                    elevation: 0,
                    borderBottomWidth: 0.5,
                    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                },
                tabBarLabelStyle: {
                    fontSize: 14,
                    fontWeight: '700',
                    textTransform: 'none',
                },
                tabBarActiveTintColor: activeColor,
                tabBarInactiveTintColor: inactiveColor,
                tabBarIndicatorStyle: {
                    backgroundColor: activeColor,
                    height: 2,
                    borderRadius: 1,
                },
                tabBarPressColor: 'transparent',
            }}
        >
            <MaterialTopTabs.Screen name="index" options={{ title: 'Notificaciones' }} />
            <MaterialTopTabs.Screen name="requests" options={{ title: 'Solicitudes' }} />
        </MaterialTopTabs>
        </View>
    );
}