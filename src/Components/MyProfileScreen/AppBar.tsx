import { Usuario } from "@/Types/Users";
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "@/Services/authService";
import { router } from "expo-router";


export default function ProfileAppBar({ user, isMe = true }: { user?: Usuario, isMe?: boolean }) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';


    const handleLogout = () => {
        signOut();
    }

    const handleBack = () => {
        router.back();
    }

    const handleSetting = () => {
        router.push('/(drawer)/settings');
    }

    return (
        <View className="flex-row justify-between items-center px-6 py-4 bg-transparent mt-2">
            <TouchableOpacity 
                className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"
                onPress={isMe ? handleSetting : handleBack}
            >
                <Ionicons 
                    name={isMe ? "settings-outline" : "chevron-back"} 
                    size={20} 
                    color={isDark ? '#fff' : '#000'} 
                />
            </TouchableOpacity>
            
            <Text className="text-lg font-black tracking-tighter text-black dark:text-white uppercase">
                {user?.username || 'perfil'}
            </Text>
            
            {isMe ? (
                <TouchableOpacity className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full" onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
            ) : (
                <View style={{ width: 40 }} /> // Spacer to keep title centered
            )}
        </View>
    );
}






const styles = StyleSheet.create({
    TitleText: {
        fontSize: 20,
        fontWeight: 'bold',

    },
});