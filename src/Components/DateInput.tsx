import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  value: string; // Recibimos la fecha como string ISO "YYYY-MM-DD"
  onChange: (date: string) => void;
}

export default function BirthDateSelector({ value, onChange }: Props) {
  const [show, setShow] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Convertimos el string que viene del estado a objeto Date para el picker
  const dateValue = value ? new Date(value) : new Date();

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // En Android, el picker se cierra solo tras elegir
    if (Platform.OS === 'android') {
      setShow(false);
    }

    if (selectedDate) {
      // Guardamos en formato ISO solo la parte de la fecha (YYYY-MM-DD)
      const formattedDate = selectedDate.toISOString().split('T')[0];
      onChange(formattedDate);
    }
  };

  return (
    <View className="w-full mb-5">
      {/* EL FAKE INPUT: Clón del estilo de tus TextInputs */}
      <TouchableOpacity
        onPress={() => setShow(!show)}
        activeOpacity={0.7}
        className={`px-5 py-5 border rounded-[20px] w-full flex-row justify-between items-center ${isDark ? "border-gray-700 bg-black" : "border-gray-300 bg-white"}`}
      >
        <Text className={value ? (isDark ? "text-white text-lg" : "text-black text-lg") : "text-gray-400 text-lg"}>
          {value ? new Date(value).toLocaleDateString('es-ES') : "Fecha de nacimiento"}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#9ca3af" />
      </TouchableOpacity>

      {/* PICKER NATIVO */}
      {show && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()} // No permite fechas futuras
          // Estilos específicos para iOS si quieres que sea un modal
          style={Platform.OS === 'ios' ? { backgroundColor: 'white' } : {}}
        />
      )}
    </View>
  );
}