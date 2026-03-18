import { Ionicons } from "@expo/vector-icons";
import { useColorScheme, View, Text, TouchableOpacity, Platform, TextInput,Image} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useAuth from "../hooks/useAuth";


import { Usuario } from "../Types/Users";
import { GlassView } from "expo-glass-effect";
import UserAvatar from "./UserAvatar";

type AppSearchBarProps = {
  query: string;
  onSearch: (value: string) => void;
};

export default function AppSearchBar({ query, onSearch }: AppSearchBarProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const usuario = useAuth();
  return (
    <View>
      {/* Contenedor de la barra de búsqueda y avatar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 15,
          paddingBottom: 2,
          backgroundColor: isDark ? '#000' : '#fff',
          marginBottom: 5,
        }}
      >
        {/* Avatar de usuario permanece en la izquierda y no se mueve */}
        <UserAvatar />

        {/* Box intermedio para centrar la búsqueda sin tocar la posición del avatar */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <TextInput
            value={query}
            onChangeText={onSearch}
            placeholder='Busca aquí'
            placeholderTextColor={isDark ? '#ccc' : '#666'}
            style={{
              width: '80%',
              height: 42,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#D1D5DB',
              paddingHorizontal: 14,
              backgroundColor: isDark ? '#111' : '#fff',
              color: isDark ? '#eee' : '#111',
            }}
          />
        </View>
        <Image source={require('../../assets/AgorasLogo.png')} style={{ width: 30, height: 30 }} />
        {/* Espacio derecho fijo (puede contener icono si quieres), evita que la caja se desplace al centro */}
      </View>
    </View>
  );
}
