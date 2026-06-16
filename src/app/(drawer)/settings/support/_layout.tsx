import { useColorScheme, TouchableOpacity } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";




export default function AyudaScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    return (
        <Stack
        screenOptions={{
            headerShown: false,
            
            headerTitleStyle: {
                fontWeight: "bold",
                fontSize: 20,
            },
            headerStyle: {
                backgroundColor: "#000",
            },
            headerLeft: () => (
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="chevron-back" size={28} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
            ),
            headerBackTitleStyle: {
                fontSize: 16,
            },
        }}
        >
            <Stack.Screen name="index"/>
            <Stack.Screen name="reports"/>
            
        </Stack>
    );



}