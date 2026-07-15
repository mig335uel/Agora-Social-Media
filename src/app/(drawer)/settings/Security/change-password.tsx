import { View, Text, TextInput, TouchableOpacity, Alert, useColorScheme, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import TitleSupport from "@/Services/TitleSupport";
import { supabase } from "@/lib/supbase/supabase";

export default function ChangePasswordScreen() {
    const isDark = useColorScheme() === 'dark';
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useFocusEffect(
        useCallback(() => {
            TitleSupport.setTitle("Cambiar contraseña");
        }, [])
    );

    const handleChangePassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert("Error", "Por favor ingresa ambos campos.");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Las contraseñas no coinciden.");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                throw error;
            }

            Alert.alert(
                "Éxito", 
                "Tu contraseña ha sido actualizada correctamente.",
                [{ text: "OK", onPress: () => router.back() }]
            );
        } catch (error: any) {
            Alert.alert("Error", error.message || "No se pudo actualizar la contraseña.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: isDark ? 'black' : '#f9fafb' }}
        >
            <View className="flex-1 p-6 mt-4">
                <Text className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Ingresa tu nueva contraseña a continuación. Te recomendamos usar una combinación de letras, números y símbolos para mayor seguridad.
                </Text>

                <View className="space-y-4">
                    <View>
                        <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Nueva contraseña
                        </Text>
                        <TextInput
                            placeholder="Nueva contraseña"
                            placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                            secureTextEntry
                            className={`px-5 py-4 border rounded-[16px] text-base ${isDark ? "border-gray-800 bg-gray-900 text-white" : "border-gray-200 bg-white text-black"}`}
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    <View className="mt-4">
                        <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Confirmar contraseña
                        </Text>
                        <TextInput
                            placeholder="Confirmar nueva contraseña"
                            placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                            secureTextEntry
                            className={`px-5 py-4 border rounded-[16px] text-base ${isDark ? "border-gray-800 bg-gray-900 text-white" : "border-gray-200 bg-white text-black"}`}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                    </View>
                </View>

                <TouchableOpacity
                    className={`mt-10 p-4 rounded-[16px] flex-row justify-center items-center ${
                        !password || !confirmPassword || isLoading
                            ? (isDark ? "bg-gray-800" : "bg-gray-300")
                            : "bg-[#1DA1F2]"
                    }`}
                    onPress={handleChangePassword}
                    disabled={!password || !confirmPassword || isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Actualizar contraseña</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
