import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAuth from "@/hooks/useAuth";
import { useColorScheme } from "react-native";
import { EditorDeTexto } from "@/Components/EditorDeTexto";
import { createPost, getTrendingTopics } from "@/Services/PostService";
import { searchUsers } from "@/Services/UserService";
import { useRouter } from "expo-router";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreatePostScreen() {
    const user = useAuth();
    const isDark = useColorScheme() === 'dark';
    const router = useRouter();
    const [content, setContent] = useState('');

    // Función que se dispara al pulsar "Publicar" en el editor
    const handlePublish = async (text: string, images: any[], videoUri?: string | null) => {
        try {
            await createPost(text, images, null, videoUri);
            // Una vez publicado, volvemos atrás
            router.back();
        } catch (error) {
            console.error("Error al publicar:", error);
        }
    };

    return (

        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? 'black' : 'white' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#eee' }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={28} color={isDark ? 'white' : 'black'} />
                </TouchableOpacity>
                <Text style={{ color: isDark ? 'white' : 'black', fontSize: 18, fontWeight: 'bold' }}>Nuevo Post</Text>
                <View style={{ width: 28 }} />
            </View>
            <View style={{ flex: 1, padding: 10, backgroundColor: isDark ? 'black' : 'white' }}>
                <EditorDeTexto
                    value={content}
                    onChange={setContent}
                    onSearchMention={searchUsers} // Para buscar usuarios (@)
                    onSearchHashtag={getTrendingTopics} // Para buscar tendencias (#)
                    onPublish={handlePublish} // La lógica de guardado
                    isDark={isDark}
                    placeholder="Comparte algo interesante..."
                />
            </View>

        </SafeAreaView>
    );
}
