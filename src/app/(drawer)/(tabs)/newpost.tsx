import { EditorDeTexto } from "@/Components/EditorDeTexto";
import useAuth from "@/hooks/useAuth";
import { createPost, getTrendingTopics } from "@/Services/PostService";
import { searchUsers } from "@/Services/UserService";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";




export default function NewPost() {
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