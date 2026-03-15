import { Ionicons } from "@expo/vector-icons";
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';
import { LoginForm } from "../Types/LoginForm";

import { BlurView } from "expo-blur";
import { router } from "expo-router";
import LoginForms from "../Components/LoginForm";

import React, { useState } from 'react';
// Imagino que tienes un RegisterForm en tus componentes
import RegisterForm from '../Components/register';

export default function LoginScreen() {
    // Estado para saber qué formulario mostrar
    const [showRegister, setShowRegister] = useState<boolean>(false);

    if(showRegister){
        return (
            <RegisterForm onNavigateToLogin={() => setShowRegister(false)} />
        )
    }else{
        return (
            <LoginForms onNavigateToRegister={() => setShowRegister(true)} />
        )
    }
}

const styles = StyleSheet.create({
    title: {
        fontSize: 24,
        fontWeight: 'bold',

    }
});

