import { Ionicons } from "@expo/vector-icons";
import { useColorScheme, View, Text, TouchableOpacity, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useAuth from "../hooks/useAuth";


import { Usuario } from "../Types/Users";
import { GlassView } from "expo-glass-effect";
import UserAvatar from "./UserAvatar";

export default function AppBar({ title }: { title: string }) {

    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

    const usuario = useAuth();

    const isiOS = Platform.OS === 'ios';
    return (
        <>


            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#eee' }}>
                <UserAvatar />
                <Text className={isDark ? 'text-white' : 'text-black'} style={{ fontSize: 20, fontWeight: 'bold', alignSelf: 'center', alignItems: 'center' }}>{title}</Text>
            </View>


        </>

    );


}