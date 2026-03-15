import React, { useState } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';
import { RegisterForm } from "../Types/LoginForm";
import { BlurView } from "expo-blur";
import { Picker } from '@react-native-picker/picker';
import SelectorAgora from './SelectorGenero';




export default function RegisterScreenForm({ onNavigateToLogin }: { onNavigateToLogin: () => void }) {

    const [registerForm, setRegisterForm] = useState<RegisterForm>({
        name: "",
        last_name: "",
        username: "",
        display_name: "",
        email: "",
        password: "",
        birth_date: "",
        gender: ""
    });
    const opcionesGenero = [
        { label: 'Masculino', value: 'male' },
        { label: 'Femenino', value: 'female' },
    ];

    // 2. En tu componente Register, crea el estado
    const [genero, setGenero] = useState("");

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
                            Registrate en Agora
                        </Text>
                    </View>

                    {/* 2. SECCIÓN FORMULARIO */}
                    <View className="w-full space-y-4">
                        <TextInput
                            placeholder="Name"
                            placeholderTextColor="#9ca3af"
                            className="px-5 py-4 border border-gray-200 rounded-[20px] w-full text-lg mb-5"
                            value={registerForm.name}
                            onChangeText={(text) => setRegisterForm({ ...registerForm, name: text })}
                        />
                        <TextInput
                            placeholder="Email"
                            placeholderTextColor="#9ca3af"
                            keyboardType='email-address'
                            className="px-5 py-4 border border-gray-200 rounded-[20px] w-full text-lg"
                            value={registerForm.email}
                            onChangeText={(text) => setRegisterForm({ ...registerForm, email: text })}
                        />
                        <TextInput
                            placeholder="Password"
                            placeholderTextColor="#9ca3af"
                            secureTextEntry
                            className="px-5 py-4 border border-gray-200 rounded-[20px] w-full text-lg mt-4 mb-5"
                            value={registerForm.password}
                            onChangeText={(text) => setRegisterForm({ ...registerForm, password: text })}
                        />
                        <SelectorAgora
                            label="Selecciona tu género"
                            options={opcionesGenero}
                            value={registerForm.gender}
                            onSelect={(value) => setRegisterForm({ ...registerForm, gender: value as "male" | "female" })}
                        />
                        <TouchableOpacity>
                            <Text className="text-blue-500 text-center font-bold text-lg hover:text-blue-600" onPress={onNavigateToLogin}>¿Ya tienes cuenta? Inicia Sesión</Text>
                        </TouchableOpacity>
                        {/* Botón de ejemplo para ver el conjunto */}
                        <TouchableOpacity className="bg-black p-5 rounded-[20px] mt-6">
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
