import TitleSupport from "@/Services/TitleSupport";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect } from "expo-router";
import { useCallback } from "react";




export default function SecurityScreen() {
    
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
        </Stack>
    );
}




