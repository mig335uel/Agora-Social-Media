import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface PostDetailAppBarProps {
  title?: string;
  showBack?: boolean;
}

export default function PostDetailAppBar({ title = "Publicación", showBack = true }: PostDetailAppBarProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const textColor = isDark ? '#ffffff' : '#000000';
  const bgColor = isDark ? '#000000' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={Platform.OS === 'ios' ? "chevron-back" : "arrow-back"} 
              size={24} 
              color={textColor} 
            />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.title, { color: textColor }]}>
        {title}
      </Text>

      <View style={styles.right}>
        {/* Espacio reservado o logo pequeño si quieres */}
        <Image 
          source={require('../../../assets/AgorasLogo.png')} 
          style={styles.logo} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
  },
  backBtn: {
    padding: 4,
    marginLeft: -4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  right: {
    width: 40,
    alignItems: 'flex-end',
  },
  logo: {
    width: 24,
    height: 24,
    opacity: 0.8,
  },
});
