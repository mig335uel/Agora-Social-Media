import { supabase } from "@/lib/supbase/supabase";
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Stack } from "expo-router";


export default function Followers() {



    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerTitle: "Seguidores",
                headerTitleStyle: {
                    fontWeight: "900",
                    fontSize: 20,
                },
                headerBackButtonDisplayMode: "default",
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false }} />

        </Stack>
    );
}
