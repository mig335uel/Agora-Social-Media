import React from 'react';
import { View, Text, StyleSheet, Image, useColorScheme, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Post } from '@/Types/Posts';

interface PrincipalPostProps {
  post: Post;
}

// Utilidades (puedes moverlas a un utils.ts después)
const formatFullDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + 
         date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function PrincipalPost({ post }: PrincipalPostProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const textColor = isDark ? '#ffffff' : '#000000';
  const subColor = isDark ? '#a0a0a0' : '#666666';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  const renderStyledContent = (content: string) => {
    const regex = /([@#][\wñáéíóú]+)/g;
    const parts = content.split(regex);
    return parts.map((part, index) => {
      if (part.match(regex)) {
        return (
          <Text key={index} style={styles.mention}>
            {part}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  return (
    <View style={styles.container}>
      {/* Header: Autor con degradado premium */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#3b82f6', '#fbbf24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}
          >
            <Image
              source={{ uri: post.user?.profile_picture_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
              style={styles.avatar}
            />
          </LinearGradient>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: textColor }]}>
              {post.user?.display_name}
            </Text>
            {post.user?.is_verified && (
              <Ionicons name="checkmark-circle" size={18} color="#3b82f6" />
            )}
          </View>
          <Text style={[styles.username, { color: subColor }]}>
            @{post.user?.username}
          </Text>
        </View>
        <TouchableOpacity style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color={subColor} />
        </TouchableOpacity>
      </View>

      {/* Cuerpo del Post */}
      <View style={styles.body}>
        <Text style={[styles.content, { color: textColor }]}>
          {renderStyledContent(post.content)}
        </Text>
        
        {post.media_url && (
          <View style={styles.mediaContainer}>
            <Image source={{ uri: post.media_url }} style={styles.media} resizeMode="cover" />
          </View>
        )}
      </View>

      {/* Metadatos: Fecha y hora */}
      <View style={[styles.metaContainer, { borderBottomColor: borderColor }]}>
        <Text style={[styles.dateText, { color: subColor }]}>
          {formatFullDate(post.created_at)}
        </Text>
      </View>

      {/* Estadísticas: Con estilo Blur similar al perfil */}
      <View style={[styles.statsContainer, { borderBottomColor: borderColor }]}>
        <BlurView
          intensity={isDark ? 10 : 30}
          tint={isDark ? 'dark' : 'light'}
          style={styles.statsBlur}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textColor }]}>{post.reposts_count}</Text>
            <Text style={[styles.statLabel, { color: subColor }]}>REPOSTS</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textColor }]}>{post.likes_count}</Text>
            <Text style={[styles.statLabel, { color: subColor }]}>ME GUSTA</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textColor }]}>{post.shares_count}</Text>
            <Text style={[styles.statLabel, { color: subColor }]}>COMPARTIDOS</Text>
          </View>
        </BlurView>
      </View>

      {/* Botones de Acción Globales */}
      <View style={styles.actionsContainer}>
        <ActionIcon name="chatbubble-outline" color={subColor} />
        <ActionIcon name="repeat-outline" color="#00BA7C" inactive color2={subColor} />
        <ActionIcon name="heart-outline" color="#F91880" inactive color2={subColor} />
        <ActionIcon name="bookmark-outline" color={subColor} />
        <ActionIcon name="share-outline" color={subColor} />
      </View>
    </View>
  );
}

function ActionIcon({ name, color, color2, inactive = false }: any) {
  return (
    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
      <Ionicons name={name} size={24} color={inactive ? color2 : color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarGradient: {
    width: 54,
    height: 54,
    borderRadius: 20,
    padding: 2,
  },
  avatar: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  username: {
    fontSize: 15,
  },
  moreBtn: {
    padding: 8,
  },
  body: {
    marginBottom: 16,
  },
  content: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '400',
  },
  mention: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  mediaContainer: {
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  media: {
    width: '100%',
    height: 300,
  },
  metaContainer: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateText: {
    fontSize: 15,
  },
  statsContainer: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statsBlur: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 4,
  },
  actionBtn: {
    padding: 8,
  },
});
