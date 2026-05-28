import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { TouchableOpacity, useColorScheme } from "react-native";

export default function FollowersLayout() {
    const isDark = useColorScheme() === 'dark';
    return (

        <Stack screenOptions={{headerShown: false}}>
            <Stack.Screen name="index" />
        </Stack>    
    );
}



const headerOptions = (isDark: boolean) => ({
    headerShown: true,
    headerTitle: "Seguidores",
    headerTitleStyle: { fontWeight: "900", fontSize: 20, color: isDark ? '#fff' : '#000' },
    headerBackVisible: false,
    headerStyle: {
        backgroundColor: isDark ? '#000' : '#fff',
    },
    headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
            <Ionicons name="chevron-back" size={28} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
    ),
});