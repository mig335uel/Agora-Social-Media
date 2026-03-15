import { Ionicons } from "@expo/vector-icons";
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';
import { LoginForm } from "../Types/LoginForm";
import { useState } from 'react'
import { BlurView } from "expo-blur";


export default function LoginForms({ onNavigateToRegister }: { onNavigateToRegister: () => void }){
    const [loginForm, setLoginForm] = useState<LoginForm>({ email: "", password: "" });
    return (
    <SafeAreaView style={{ flex: 1 }} className="bg-white">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View className="flex-1 justify-center p-6 overflow-hidden">
                    {Platform.OS === 'ios' ? (
                        <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
                    ) : (
                        <View style={StyleSheet.absoluteFill} className="bg-white/90" />
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
                        <Text style={styles.title} className="mt-4">
                            Inicia sesión en Agora
                        </Text>
                    </View>

                    {/* 2. SECCIÓN FORMULARIO */}
                    <View className="w-full space-y-4">
                        <TextInput
                            placeholder="Email"
                            placeholderTextColor="#9ca3af"
                            className="px-5 py-4 border border-gray-200 rounded-[20px] w-full text-lg"
                            value={loginForm.email}
                            onChangeText={(text) => setLoginForm({ ...loginForm, email: text })}
                        />
                        <TextInput
                            placeholder="Password"
                            placeholderTextColor="#9ca3af"
                            secureTextEntry
                            className="px-5 py-4 border border-gray-200 rounded-[20px] w-full text-lg mt-4 mb-5"
                            value={loginForm.password}
                            onChangeText={(text) => setLoginForm({ ...loginForm, password: text })}
                        />
                        <TouchableOpacity 
                            activeOpacity={0.7}
                            style={{ paddingVertical: 10 }}
                        >
                            <Text className="text-blue-500 text-center font-bold text-lg hover:text-blue-600" onPress={onNavigateToRegister}>¿No tienes cuenta? Registrate</Text>
                        </TouchableOpacity>
                        {/* Botón de ejemplo para ver el conjunto */}
                        <TouchableOpacity className="bg-black p-5 rounded-[20px] mt-2">
                            <Text className="text-white text-center font-bold text-lg">Entrar</Text>
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