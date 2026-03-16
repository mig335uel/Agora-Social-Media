import { Ionicons } from "@expo/vector-icons";
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';
import { LoginForm } from "../Types/LoginForm";

import { BlurView } from "expo-blur";
import { router } from "expo-router";
import LoginForms from "../Components/LoginForm";

import React, { useState } from 'react';
import { useColorScheme } from "react-native";
// Imagino que tienes un RegisterForm en tus componentes
import RegisterForm from '../Components/register';

export default function LoginScreen() {
    // Estado para saber qué formulario mostrar
    const [showRegister, setShowRegister] = useState<boolean>(false);
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

    if(showRegister){
        return (
            <View style={{ flex: 1 }} className={isDark ? "bg-black" : "bg-white"}>
                <RegisterForm onNavigateToLogin={() => setShowRegister(false)} />
              
            </View>
        )
    }else{
        return (
            <View style={{ flex: 1 }} className={isDark ? "bg-black" : "bg-white"}>
                <LoginForms onNavigateToRegister={() => setShowRegister(true)} />
            </View>
        )
    }
}

const styles = StyleSheet.create({
    title: {
        fontSize: 24,
        fontWeight: 'bold',

    }
});

