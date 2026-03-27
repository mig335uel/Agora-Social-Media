import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, Switch, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supbase/supabase';
import { updateUserProfile } from '@/Services/UserService';
import { pickAndProcessImage, uploadAvatarImage, ProcessedImage } from '@/Services/ImageService';

export default function EditProfileByIdScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const isDark = useColorScheme() === 'dark';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: '',
        last_name: '',
        display_name: '',
        username: '',
        bio: '',
        is_private: false,
    });
    const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
    const [newAvatar, setNewAvatar] = useState<ProcessedImage | null>(null);

    useEffect(() => {
        if (!id) return;
        
        const loadUser = async () => {
            try {
                const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
                if (error) throw error;
                if (data) {
                    setForm({
                        name: data.name || '',
                        last_name: data.last_name || '',
                        display_name: data.display_name || '',
                        username: data.username || '',
                        bio: data.bio || '',
                        is_private: data.is_private || false,
                    });
                    setCurrentAvatar(data.profile_picture_url || null);
                }
            } catch (err) {
                console.error("Error loading profile by ID:", err);
                Alert.alert("Error", "No se pudo cargar el perfil para editar");
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, [id]);

    const handlePickImage = async () => {
        try {
            const processedList = await pickAndProcessImage(false);
            if (processedList && processedList.length > 0) {
                setNewAvatar(processedList[0]);
            }
        } catch (error) {
            console.error("Error picking image:", error);
        }
    };

    const handleSave = async () => {
        if (!id) return;
        setSaving(true);
        try {
            let avatarUrl = currentAvatar;
            
            // Subir nueva imagen si hay una
            if (newAvatar) {
                const uploadedUrl = await uploadAvatarImage(id, newAvatar);
                if (uploadedUrl) {
                    avatarUrl = uploadedUrl;
                } else {
                    Alert.alert("Error", "No se pudo subir la imagen de avatar");
                    setSaving(false);
                    return;
                }
            }

            // Actualizar datos
            await updateUserProfile(id, {
                ...form,
                profile_picture_url: avatarUrl || undefined
            });

            router.back();
        } catch (error) {
            console.error("Error saving profile:", error);
            Alert.alert("Error", "No se pudieron guardar los cambios. Revisa que tu usuario no esté ya cogido.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View className={`flex-1 justify-center items-center ${isDark ? 'bg-black' : 'bg-white'}`}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View className={`flex-1 ${isDark ? 'bg-black' : 'bg-[#f9fafb]'}`}>
            {/* Cabecera */}
            <View className={`flex-row justify-between items-center px-4 pt-14 pb-4 border-b ${isDark ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'}`}>
                <TouchableOpacity onPress={() => router.back()} disabled={saving}>
                    <Text className={`text-base ${isDark ? 'text-white' : 'text-black'}`}>Cancelar</Text>
                </TouchableOpacity>
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`}>Editar Perfil</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator size="small" color="#3b82f6" />
                    ) : (
                        <Text className="text-base font-bold text-blue-500">Guardar</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                {/* Selector de Avatar */}
                <View className="items-center py-6">
                    <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} className="items-center">
                        <View className={`w-28 h-28 rounded-3xl overflow-hidden justify-center items-center relative ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                            {(newAvatar?.uri || currentAvatar) ? (
                                <Image 
                                    source={{ uri: newAvatar?.uri || currentAvatar! }} 
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Ionicons name="person" size={50} color={isDark ? '#4b5563' : '#9ca3af'} />
                            )}
                            <View className="absolute bottom-0 w-full bg-black/60 py-1.5 items-center">
                                <Ionicons name="camera" size={18} color="white" />
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Formulario Principal */}
                <View className={`mx-4 rounded-3xl overflow-hidden ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`}>
                    
                    {/* Display Name */}
                    <View className={`flex-row items-center px-4 py-3 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                        <Text className={`w-24 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Nombre</Text>
                        <TextInput 
                            value={form.display_name}
                            onChangeText={(text) => setForm({...form, display_name: text})}
                            placeholder="Tu nombre visible"
                            placeholderTextColor={isDark ? '#4b5563' : '#9ca3af'}
                            className={`flex-1 text-base p-0 ${isDark ? 'text-white' : 'text-black'}`}
                        />
                    </View>

                    {/* Username */}
                    <View className={`flex-row items-center px-4 py-3 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                        <Text className={`w-24 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Usuario</Text>
                        <TextInput 
                            value={form.username}
                            onChangeText={(text) => setForm({...form, username: text.toLowerCase().replace(/\s/g, '')})}
                            placeholder="username"
                            autoCapitalize="none"
                            placeholderTextColor={isDark ? '#4b5563' : '#9ca3af'}
                            className={`flex-1 text-base p-0 ${isDark ? 'text-white' : 'text-black'}`}
                        />
                    </View>

                    {/* Bio */}
                    <View className={`px-4 py-3 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                        <Text className={`font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Biografía</Text>
                        <TextInput 
                            value={form.bio}
                            onChangeText={(text) => setForm({...form, bio: text})}
                            placeholder="Escribe algo sobre ti..."
                            multiline
                            textAlignVertical="top"
                            placeholderTextColor={isDark ? '#4b5563' : '#9ca3af'}
                            className={`text-base p-0 min-h-[80px] ${isDark ? 'text-white' : 'text-black'}`}
                        />
                    </View>
                </View>

                {/* Datos Personales Privados */}
                <View className="mt-6 mx-4">
                    <Text className={`text-xs font-bold uppercase tracking-wider ml-1 mb-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Datos Personales Extr.
                    </Text>
                    <View className={`rounded-3xl overflow-hidden ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`}>
                        <View className={`flex-row items-center px-4 py-3 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                            <Text className={`w-28 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Nombre real</Text>
                            <TextInput 
                                value={form.name}
                                onChangeText={(text) => setForm({...form, name: text})}
                                placeholder="Tu nombre verdadero"
                                placeholderTextColor={isDark ? '#4b5563' : '#9ca3af'}
                                className={`flex-1 text-base p-0 ${isDark ? 'text-white' : 'text-black'}`}
                            />
                        </View>
                        <View className={`flex-row items-center px-4 py-3 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                            <Text className={`w-28 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Apellidos</Text>
                            <TextInput 
                                value={form.last_name}
                                onChangeText={(text) => setForm({...form, last_name: text})}
                                placeholder="Tus apellidos"
                                placeholderTextColor={isDark ? '#4b5563' : '#9ca3af'}
                                className={`flex-1 text-base p-0 ${isDark ? 'text-white' : 'text-black'}`}
                            />
                        </View>
                    </View>
                </View>

                {/* Preferencias de Cuenta */}
                <View className="mt-6 mx-4">
                    <Text className={`text-xs font-bold uppercase tracking-wider ml-1 mb-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Control de Cuenta
                    </Text>
                    <View className={`rounded-3xl overflow-hidden ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`}>
                        <View className="flex-row items-center justify-between px-4 py-3">
                            <View className="flex-1 mr-4">
                                <Text className={`font-semibold text-base ${isDark ? 'text-white' : 'text-black'}`}>Cuenta Privada</Text>
                                <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Solo las personas que apruebes podrán ver tu feed de contenido.
                                </Text>
                            </View>
                            <Switch 
                                value={form.is_private}
                                onValueChange={(val) => setForm({...form, is_private: val})}
                                trackColor={{ false: '#767577', true: '#3b82f6' }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}
