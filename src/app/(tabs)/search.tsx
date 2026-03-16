import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, Image, ActivityIndicator, useColorScheme, StyleSheet, TextInput } from 'react-native';
import { SearchBar } from 'react-native-screens';
import AppBar from '../../Components/AppBar';
import { SafeAreaView } from 'react-native-safe-area-context';







export default function search(){

    const scheme = useColorScheme();
    const isDark = scheme === 'dark';


    return(
        <SafeAreaView className={`flex-1 items-center justify-center ${isDark ? 'bg-black' : 'bg-white'}`}>
        <AppBar title="Buscar"/>
        <View className='flex-1 w-full  justify-center items-center'>
                <TextInput placeholder='Busca aquí' className={`w-full  h-12 rounded-lg border px-4 border-gray-300 ${isDark ? 'bg-black' : 'bg-white'}, ${isDark ? 'text-white' : 'text-black'}`}/>
            </View>
        </SafeAreaView>
    );
}



//estilos únicamente personalizados


const styles  = StyleSheet.create({
    
});