import { Usuario } from "@/Types/Users";
import { useColorScheme, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "@/Services/authService";


export default function ProfileAppBar({ user }: { user?: Usuario }) {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';


    const handleLogout = () => {
        signOut();
    }

    return (
        <View className="flex-row justify-between items-center px-6 py-4 bg-transparent mt-2">
            <TouchableOpacity className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <Ionicons name="settings-outline" size={20} color={isDark ? '#fff' : '#000'} />
            </TouchableOpacity>
            
            <Text className="text-lg font-black tracking-tighter text-black dark:text-white uppercase">
                {user?.username || 'perfil'}
            </Text>
            
            <TouchableOpacity className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full" onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color={isDark ? '#fff' : '#000'} />
            </TouchableOpacity>
        </View>
    );
}






const styles = StyleSheet.create({
    TitleText: {
        fontSize: 20,
        fontWeight: 'bold',

    },
});