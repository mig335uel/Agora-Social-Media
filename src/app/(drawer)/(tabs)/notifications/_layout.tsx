import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { TouchableOpacity, useColorScheme } from "react-native";





export default function NotificationLayout() {

    const isDark = useColorScheme() === 'dark';
    return (
        <Stack screenOptions={{
            headerShown: true,
            headerTitle: "Ajustes",
            headerBackButtonDisplayMode: "default",
            headerBackTitle: "Perfil",
            headerBackVisible: false,
            headerStyle: {
                backgroundColor: isDark ? '#000' : '#fff',
            },
            headerBackTitleStyle: {
                fontSize: 16,

            },
            headerTitleStyle: {
                fontWeight: 'bold',
                fontSize: 20,
                color: isDark ? '#fff' : '#000',
            },
        }}>
            <Stack.Screen name="index" options={{ headerTitle: "Notificaciones" }} />
        </Stack>
    );
}