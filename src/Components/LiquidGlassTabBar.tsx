/**
 * LiquidGlassTabBar
 * ─────────────────
 * Simula el efecto "Liquid Glass" de Apple:
 *   • Píldora traslúcida que salta entre tabs con resorte
 *   • Highlight especular que se mueve con inercia
 *   • Borde con brillo animado
 *   • Micro-bounce al pulsar
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 220,
  mass: 0.6,
  overshootClamping: false,
};

const BAR_HEIGHT  = 70;
const PILL_HEIGHT = 60;   // llena la mayor parte de la barra
const PILL_WIDTH  = 80;   // sección plana = 80-60 = 20px → cápsula horizontal

interface Props {
  /** Índice del tab activo (0-based, excluyendo tabs ocultos) */
  activeIndex: number;
  /** Número de tabs visibles */
  tabCount: number;
  /** Ancho total de la barra (sin márgenes) */
  barWidth: number;
}

export function LiquidGlassIndicator({ activeIndex, tabCount, barWidth }: Props) {
  const isDark = useColorScheme() === 'dark';

  // ── Posición X del centro de la píldora ───────────────────────────────────
  const tabWidth   = barWidth / tabCount;
  const targetX    = useSharedValue(tabWidth * activeIndex + tabWidth / 2 - PILL_WIDTH / 2);
  const shimmerX   = useSharedValue(0);      // posición del reflejo dentro de la píldora
  const pressScale = useSharedValue(1);      // micro-bounce al tap

  useEffect(() => {
    const nextX = tabWidth * activeIndex + tabWidth / 2 - PILL_WIDTH / 2;
    targetX.value = withSpring(nextX, SPRING_CONFIG);

    // El reflejo especular viaja desde la mitad izquierda hacia la derecha con delay
    shimmerX.value = withTiming(-PILL_WIDTH, { duration: 0 });
    shimmerX.value = withTiming(PILL_WIDTH * 1.5, { duration: 420 });

    // Micro-bounce
    pressScale.value = withSpring(0.88, { damping: 8, stiffness: 400 });
    pressScale.value = withSpring(1,    { damping: 14, stiffness: 300 });
  }, [activeIndex]);

  // ── Estilos animados ───────────────────────────────────────────────────────
  const pillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: targetX.value },
      { scaleX: pressScale.value },
      { scaleY: pressScale.value },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <Animated.View style={[styles.pill, pillStyle]}>
      {/* Blur base */}
      <BlurView
        intensity={isDark ? 60 : 80}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />

      {/* Capa de color translúcida — cristal blanco original */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(255,255,255,0.50)',
            borderRadius: PILL_HEIGHT / 2,
          },
        ]}
      />

      {/* Reflejo especular (shimmer) */}
      <Animated.View style={[styles.shimmerClip, shimmerStyle]} pointerEvents="none">
        <LinearGradient
          colors={[
            'transparent',
            isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.60)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>

      {/* Borde brillante */}
      <View
        style={[
          styles.pillBorder,
          { borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.60)' },
        ]}
      />

      {/* Highlight superior (franja de cristal) */}
      <LinearGradient
        colors={[
          isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.75)',
          'transparent',
        ]}
        style={styles.topHighlight}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: (BAR_HEIGHT - PILL_HEIGHT) / 2,   // centrado vertical en la barra
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    overflow: 'hidden',
  },
  pillBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: 0.8,
  },
  shimmerClip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: PILL_WIDTH * 0.6,
    borderRadius: PILL_HEIGHT / 2,
    overflow: 'hidden',
  },
  shimmerGradient: {
    width: PILL_WIDTH * 0.6,
    height: PILL_HEIGHT,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 4,
    right: 4,
    height: PILL_HEIGHT * 0.45,
    borderTopLeftRadius: PILL_HEIGHT / 2,
    borderTopRightRadius: PILL_HEIGHT / 2,
  },
});
