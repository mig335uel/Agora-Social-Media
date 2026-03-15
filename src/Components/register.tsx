import React, { useState } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';
import { RegisterForm } from "../Types/LoginForm";
import { BlurView } from "expo-blur";
import { Picker } from '@react-native-picker/picker';
import SelectorAgora from './SelectorGenero';
import BirthDateSelector from './DateInput';




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

    const onSubmit = async () => {

    }

    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

    return (
        <SafeAreaView style={{ flex: 1 }} className={isDark ? "bg-[#121212]" : "bg-white"}>
            <ScrollView>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View className="flex-1 justify-center p-6 overflow-hidden">
                        {Platform.OS === 'ios' ? (
                            <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                        ) : (
                            <View style={StyleSheet.absoluteFill} className={isDark ? "bg-[#1e1e1e]/90" : "bg-white/90"} />
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
                                Registrate en Agora
                            </Text>
                        </View>

                        {/* 2. SECCIÓN FORMULARIO */}
                        <View className="w-full space-y-4">
                            <TextInput
                                placeholder="Nombre"
                                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                                className={`px-5 py-4 border rounded-[20px] w-full text-lg mb-5 ${isDark ? "border-gray-700 bg-black text-white" : "border-gray-200 bg-white text-black"}`}
                                value={registerForm.name}
                                onChangeText={(text) => setRegisterForm({ ...registerForm, name: text })}
                            />
                            <TextInput
                                placeholder="Apellidos"
                                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                                className={`px-5 py-4 border rounded-[20px] w-full text-lg mb-5 ${isDark ? "border-gray-700 bg-black text-white" : "border-gray-200 bg-white text-black"}`}
                                value={registerForm.last_name}
                                onChangeText={(text) => setRegisterForm({ ...registerForm, last_name: text })}
                            />
                            <TextInput
                                placeholder="Nombre de Usuario"
                                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                                autoCapitalize="none"
                                className={`px-5 py-4 border rounded-[20px] w-full text-lg mb-5 ${isDark ? "border-gray-700 bg-black text-white" : "border-gray-200 bg-white text-black"}`}
                                value={registerForm.username}
                                onChangeText={(text) => setRegisterForm({ ...registerForm, username: text })}
                            />

                            <SelectorAgora
                                label="Visualiza tu nombre"
                                options={[{ label: "Nombre", value: registerForm.name }, { label: "Apellidos", value: registerForm.last_name }, { label: "Nombre Completo", value: registerForm.name + " " + registerForm.last_name }]}
                                value={registerForm.display_name}
                                onSelect={(value) => setRegisterForm({ ...registerForm, display_name: value })}
                            />
                            <BirthDateSelector
                                value={registerForm.birth_date}
                                onChange={(newDate: any) => setRegisterForm({ ...registerForm, birth_date: newDate })}
                            />
                            <TextInput
                                placeholder="Email"
                                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                                autoCapitalize="none"
                                keyboardType='email-address'
                                className={`px-5 py-4 border rounded-[20px] w-full text-lg ${isDark ? "border-gray-700 bg-black text-white" : "border-gray-200 bg-white text-black"}`}
                                value={registerForm.email}
                                onChangeText={(text) => setRegisterForm({ ...registerForm, email: text })}
                            />
                            <TextInput
                                placeholder="Password"
                                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                                secureTextEntry
                                className={`px-5 py-4 border rounded-[20px] w-full text-lg mt-4 mb-5 ${isDark ? "border-gray-700 bg-black text-white" : "border-gray-200 bg-white text-black"}`}
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
                                <Text className={`text-center font-bold text-lg ${isDark ? "text-blue-400" : "text-blue-500"}`} onPress={onNavigateToLogin}>¿Ya tienes cuenta? Inicia Sesión</Text>
                            </TouchableOpacity>
                            {/* Botón de ejemplo para ver el conjunto */}
                            <TouchableOpacity className={`p-5 rounded-[20px] mt-6 ${isDark ? "bg-white" : "bg-black"}`}>
                                <Text className={`text-center font-bold text-lg ${isDark ? "text-black" : "text-white"}`}>Entrar</Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                </KeyboardAvoidingView>
            </ScrollView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    title: {
        fontSize: 24,
        fontWeight: 'bold',

    }
});
