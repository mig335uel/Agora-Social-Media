import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, KeyboardAvoidingView, Platform, ActivityIndicator, useColorScheme } from 'react-native';
import { AgoraEditor } from './AgoraEditor';
import { createPost } from '../Services/PostService';

export default function CreatePostScreen() {
  const [content, setContent] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const handlePublish = async () => {
    if (!content || isPublishing) return;

    setIsPublishing(true);
    try {
      await createPost(content);
      setContent(''); // Limpiamos estado
      console.log("✅ Post publicado correctamente");
    } catch (error) {
      console.error("Error publicando:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <View style={styles.mainContainer} className={isDark ? 'bg-black' : 'bg-white'}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.editorWrapper}>
          <AgoraEditor onContentChange={setContent} />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.publishButton, { opacity: (content && !isPublishing) ? 1 : 0.5 }]}
            onPress={handlePublish}
            disabled={!content || isPublishing}
          >
            {isPublishing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.publishText}>Publicar</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { borderBottomWidth: 1, borderBottomColor: '#eee' },
  editorWrapper: { paddingHorizontal: 10 },
  footer: {
    padding: 10,
    alignItems: 'flex-end'
  },
  publishButton: {
    backgroundColor: '#1DA1F2',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  publishText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});