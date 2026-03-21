import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, useColorScheme, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Post } from '@/Types/Posts';
import MediaGrid from './MediaGrid';
import { EditorDeTexto } from '../EditorDeTexto';
import { ProcessedImage } from '@/Services/ImageService';
import { createPost, getTrendingTopics } from '@/Services/PostService';
import { searchUsers } from '@/Services/UserService';

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

  const [isReplyModalVisible, setIsReplyModalVisible] = useState(false);
  const [replyContent, setReplyContent] = useState('');
 
  const handlePublishReply = async (content: string, images: ProcessedImage[]) => {
    try {
      await createPost(content, images, post.id);
      setIsReplyModalVisible(false);
      setReplyContent('');
      // Podríamos añadir una notificación de éxito aquí
    } catch (error) {
      console.error("Error al responder:", error);
    }
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
        
        {post.media && post.media.length > 0 && (
          <MediaGrid media={post.media} />
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
            <Text style={[styles.statValue, { color: textColor }]}>{post.shares_count || 0}</Text>
            <Text style={[styles.statLabel, { color: subColor }]}>COMPARTIDOS</Text>
          </View>
        </BlurView>
      </View>

      {/* Botones de Acción Globales */}
      <View style={styles.actionsContainer}>
        <ActionIcon name="chatbubble-outline" color={subColor} onPress={() => setIsReplyModalVisible(true)} />
        <ActionIcon name="repeat-outline" color="#00BA7C" inactive color2={subColor} />
        <ActionIcon name="heart-outline" color="#F91880" inactive color2={subColor} />
        <ActionIcon name="bookmark-outline" color={subColor} />
        <ActionIcon name="share-outline" color={subColor} />
      </View>
 
      {/* Modal de Respuesta (Estilo Bottom Sheet) */}
      <Modal
        visible={isReplyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsReplyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop para cerrar al tocar fuera */}
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setIsReplyModalVisible(false)} 
          />
          
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
            {/* Handle visual típico de bottom sheet */}
            <View style={styles.modalHandle} />

            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: borderColor, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setIsReplyModalVisible(false)}>
                <Text style={{ color: '#3b82f6', fontSize: 16 }}>Cancelar</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: textColor }}>Responder</Text>
              </View>
            </View>
            
            <View style={{ flex: 1 }}>
              <EditorDeTexto 
                value={replyContent} 
                onChange={setReplyContent}
                isDark={isDark}
                placeholder={`Responder a @${post.user?.username}...`}
                onSearchMention={searchUsers}
                onSearchHashtag={getTrendingTopics}
                onPublish={handlePublishReply}
                appBar={false}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ActionIcon({ name, color, color2, inactive = false, onPress }: any) {
  return (
    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6} onPress={onPress}>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
});
