import { Ionicons } from "@expo/vector-icons";
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';
import { LoginForm } from "../Types/LoginForm";
import { useState } from 'react'
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import LoginForms from "../Components/LoginForm";
import Register from "./Register";



export default function Login() {
    const [showRegister, setShowRegister] = useState(false);
    return (
        <View style={{ flex: 1 }}>
            {showRegister ? (
                // Si es TRUE, mostramos el registro y le pasamos la función para VOLVER
                <Register onNavigateToLogin={() => setShowRegister(false)} />
            ) : (
                // Si es FALSE, mostramos el login y le pasamos la función para IR AL REGISTRO
                <LoginForms onNavigateToRegister={() => setShowRegister(true)} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    title: {
        fontSize: 24,
        fontWeight: 'bold',

    }
});

