import { Ionicons } from "@expo/vector-icons";
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';
import { LoginForm } from "../Types/LoginForm";
import { useState } from 'react'
import { BlurView } from "expo-blur";
import { LoginAuth } from "../Services/authService";
import { requestNotificationPermission, saveDeviceToken } from "../Services/NotificacitonService";
import { router } from "expo-router";
import { GlassView } from "expo-glass-effect";


export default function LoginForms({ onNavigateToRegister }: { onNavigateToRegister: () => void }) {
    const [loginForm, setLoginForm] = useState<LoginForm>({ email: "", password: "" });
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';



    const handleLogin = async () => {
        try {
            const results = await LoginAuth({ loginForm });
            if (results && results.user) {
                const token = await requestNotificationPermission();
                if (token) {
                    await saveDeviceToken(results.user.id, token);
                }
                router.replace('/');
            }
        } catch (error) {
            console.error("Error during login:", error);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1 }} className={isDark ? "bg-[#121212]" : "bg-white"}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                
                <View className="flex-1 justify-center p-6 overflow-hidden">
                    {Platform.OS === 'ios' ? (
                        <GlassView glassEffectStyle="regular" colorScheme={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                    ) : (
                        <View style={StyleSheet.absoluteFill} className={isDark ? "bg-black" : "bg-white"} />
                    )}
                    <LinearGradient
                        colors={['rgba(255,255,255,0.3)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="absolute inset-0"
                        pointerEvents="none"
                    />
                    {/* 1. SECCIÓN LOGO Y TÍTULO (Sin flex, para que ocupe solo lo que necesita) */}
                    <View className="items-center mb-8">
                        <Image
                            source={require("../../assets/AgorasLogo.png")}
                            className="w-48 h-48 self-center"
                            resizeMode="contain"
                        />
                        <Text style={styles.title} className={`mt-4 ${isDark ? "text-white" : "text-black"}`}>
                            Inicia sesión en Agora
                        </Text>
                    </View>

                    {/* 2. SECCIÓN FORMULARIO */}
                    <View className="w-full space-y-4">
                        <TextInput
                            placeholder="Email"
                            placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                            autoCapitalize="none"
                            className={`px-5 py-4 border rounded-[20px] w-full text-lg ${isDark ? "border-gray-700 bg-black text-white" : "border-gray-200 bg-white text-black"}`}
                            value={loginForm.email}
                            onChangeText={(text) => setLoginForm({ ...loginForm, email: text })}
                        />
                        <TextInput
                            placeholder="Password"
                            placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                            secureTextEntry
                            autoCapitalize="none"
                            className={`px-5 py-4 border rounded-[20px] w-full text-lg mt-4 mb-5 ${isDark ? "border-gray-700 bg-black text-white" : "border-gray-200 bg-white text-black"}`}
                            value={loginForm.password}
                            onChangeText={(text) => setLoginForm({ ...loginForm, password: text })}
                        />
                        <TouchableOpacity
                            activeOpacity={0.7}
                            style={{ paddingVertical: 10 }}
                        >
                            <Text className={`text-center font-bold text-lg ${isDark ? "text-blue-400" : "text-blue-500"}`} onPress={onNavigateToRegister}>¿No tienes cuenta? Registrate</Text>
                        </TouchableOpacity>
                        {/* Botón de ejemplo para ver el conjunto */}
                        <TouchableOpacity
                            className={`p-5 rounded-[20px] mt-2 ${isDark ? "bg-white" : "bg-black"}`}
                            onPress={handleLogin}
                        >
                            <Text className={`text-center font-bold text-lg ${isDark ? "text-black" : "text-white"}`}>Entrar</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    title: {
        fontSize: 24,
        fontWeight: 'bold',

    }
});