import React, { useState } from 'react';
import { View, SafeAreaView } from 'react-native';
import useAuth from "@/hooks/useAuth";
import { useColorScheme } from "react-native";
import { EditorDeTexto } from "@/Components/EditorDeTexto";
import { createPost, getTrendingTopics } from "@/Services/PostService";
import { searchUsers } from "@/Services/UserService";
import { useRouter } from "expo-router";

export default function CreatePostScreen() {
    const user = useAuth();
    const isDark = useColorScheme() === 'dark';
    const router = useRouter();
    const [content, setContent] = useState('');

    // Función que se dispara al pulsar "Publicar" en el editor
    const handlePublish = async (text: string, images: any[]) => {
        try {
            await createPost(text, images);
            // Una vez publicado, volvemos atrás
            router.back();
        } catch (error) {
            console.error("Error al publicar:", error);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? 'black' : 'white' }}>
            
        </SafeAreaView>
    );
}
