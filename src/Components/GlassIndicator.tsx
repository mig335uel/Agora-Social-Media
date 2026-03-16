import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from "react-native-reanimated";
import { GlassView } from "expo-glass-effect";

// Dependiendo de cuántas pestañas tengas, ajustamos el ancho. 
// Si la barra mide unos 200px y tienes 2 iconos, 80px está perfecto.
const TAB_WIDTH = 80; 

export default function GlassIndicator({ index }) {
  // Inicializamos la posición
  const x = useSharedValue(index * TAB_WIDTH);

  // 1. LA CORRECCIÓN: Disparamos la animación solo cuando cambia el index
  useEffect(() => {
    x.value = withSpring(index * TAB_WIDTH, {
      damping: 14,     // Controla el "rebote" (menos damping = más rebote líquido)
      stiffness: 120   // Controla la velocidad del muelle
    });
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }]
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: TAB_WIDTH,
          height: 50, // Un poco menos alto que la barra total para que flote dentro
          borderRadius: 25,
          overflow: 'hidden', // 2. LA CORRECCIÓN: Evita que el cristal sea cuadrado
          top: 10, // Lo centramos verticalmente
          left: 20, // Ajuste para que cuadre con tus iconos
        },
        animatedStyle
      ]}
    >
      {/* 3. Usamos la API oficial correcta que vimos antes */}
      <GlassView 
        glassEffectStyle="regular" 
        colorScheme="dark" 
        style={StyleSheet.absoluteFill} 
      />
    </Animated.View>
  );
}