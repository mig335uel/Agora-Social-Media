import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; // Para el efecto Liquid Glass que querías

export default function SelectorAgora({ label, options, value, onSelect }: { label: string, options: { value: string, label: string }[], value?: string, onSelect: (value: string) => void }) {
    const [visible, setVisible] = useState(false);

    // Buscamos el texto de la opción seleccionada
    const selectedOption = options.find(opt => opt.value === value);

    return (
        <View className="w-full mb-5">
            {/* EL BOTÓN QUE PARECE UN INPUT */}
            {Platform.OS === "ios" ? (
                <TouchableOpacity
                    onPress={() => setVisible(true)}
                    activeOpacity={0.7}
                    // Usamos las mismas clases que tienes en tus TextInputs
                    className="px-5 py-5 border border-gray-300 rounded-[20px] w-full flex-row justify-between items-center bg-white"
                >
                    <Text className={value ? "text-black text-lg" : "text-gray-400 text-lg"}>
                        {selectedOption ? selectedOption.label : label}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#9ca3af" />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    onPress={() => setVisible(true)}
                    activeOpacity={1}
                    // Usamos las mismas clases que tienes en tus TextInputs
                    className="px-5 py-5 border border-gray-300 rounded-[20px] w-full flex-row justify-between items-center bg-white"
                >
                    <Text className={value ? "text-black text-lg" : "text-gray-400 text-lg"}>
                        {selectedOption ? selectedOption.label : label}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#9ca3af" />
                </TouchableOpacity>
            )}

      {/* EL MENÚ QUE SUBE DESDE ABAJO */}
            <Modal visible={visible} transparent animationType="slide">
                <View className="flex-1 justify-end">
                    {/* Fondo borroso (Liquid Glass) al tocar fuera se cierra */}
                    <TouchableOpacity
                        className="absolute inset-0 bg-black/30"
                        onPress={() => setVisible(false)}
                    />

                    <View className="rounded-t-[30px] overflow-hidden bg-white/95" style={Platform.OS === 'android' ? { elevation: 10 } : {}}>
                        {Platform.OS === 'ios' && (
                            <BlurView intensity={80} tint="light" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                        )}
                        <SafeAreaView>
                            <View className="p-6">
                                <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-6" />

                                <Text className="text-xl font-bold mb-6 text-center text-gray-800">
                                    Selecciona {label}
                                </Text>

                                {options.map((item) => (
                                    <TouchableOpacity
                                        key={item.value}
                                        onPress={() => {
                                            onSelect(item.value);
                                            setVisible(false);
                                        }}
                                        className={`py-4 px-6 rounded-2xl mb-2 flex-row justify-between items-center ${value === item.value ? 'bg-black' : 'bg-gray-100/50'
                                            }`}
                                    >
                                        <Text className={`text-lg ${value === item.value ? 'text-white font-bold' : 'text-gray-700'}`}>
                                            {item.label}
                                        </Text>
                                        {value === item.value && <Ionicons name="checkmark" size={20} color="white" />}
                                    </TouchableOpacity>
                                ))}

                                <TouchableOpacity
                                    onPress={() => setVisible(false)}
                                    className="mt-4 p-4"
                                >
                                    <Text className="text-center font-bold text-red-500 text-lg">Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}