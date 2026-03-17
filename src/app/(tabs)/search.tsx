import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, Image, ActivityIndicator, useColorScheme, StyleSheet, TextInput, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SearchBar } from 'react-native-screens';
import AppBar from '../../Components/AppBar';
import { SafeAreaView } from 'react-native-safe-area-context';







export default function search() {

    const scheme = useColorScheme();
    const isDark = scheme === 'dark';


    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeAreaView className={`flex-1  ${isDark ? 'bg-black' : 'bg-white'}`} >
            <AppBar title="Buscar" />
            <View className='flex-1 w-full  justify-center self-start' onPress={() => Keyboard.dismiss()}>
                <TextInput placeholder='Busca aquí' className={`w-full  h-16 rounded-lg border px-4 border-gray-300 ${isDark ? 'bg-black' : 'bg-white'}, ${isDark ? 'text-white' : 'text-black'}`} />
            </View>
        </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}



//estilos únicamente personalizados


const styles = StyleSheet.create({

});