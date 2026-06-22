import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { TouchableOpacity, useColorScheme } from "react-native";
import TitleSupport, { useSupportTitle } from "@/Services/TitleSupport";


export default function SettingsLayout(){
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const supportTitle = useSupportTitle();

    return (
        <Stack
        screenOptions={{
            headerShown: true,

            headerBackButtonDisplayMode: "default",
            headerBackTitle: "Perfil",
            headerBackVisible: false,
            headerLeft: () => (
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="chevron-back" size={28} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
            ),
            headerStyle:{
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
        }}
        >
            <Stack.Screen name="index" options={{ title: "Ajustes" }} />
            <Stack.Screen name="support" options={{ title: supportTitle }} />
            <Stack.Screen name="privacy" options={{ title: "Privacidad y Términos" }} />
            </Stack>
    );

}