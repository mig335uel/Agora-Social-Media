import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
  FlatList,
} from 'react-native';
import { createPost, getTrendingTopics } from '@/Services/PostService';
import { searchUsers } from '@/Services/UserService';
// import { MentionInput, Triggers } from 'react-native-controlled-mentions';
import { AgoraEditor } from './AgoraEditor';

// ─── Tipos de triggers que usamos ────────────────────────────────────────────
type TriggerName = 'mention' | 'hashtag';

// ─── Componente de lista de sugerencias (estable fuera del padre) ─────────────
type SuggestionsListProps = {
  keyword?: string;
  onSelect: (suggestion: { id: string; name: string }) => void;
  trigger: string;
  fetchFn: (q: string) => Promise<{ id: string; name: string }[]>;
  isDark: boolean;
};

function SuggestionsList({ keyword, onSelect, trigger, fetchFn, isDark }: SuggestionsListProps) {
  const [suggestions, setSuggestions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (keyword == null) {
      setSuggestions([]);
      return;
    }
    fetchFn(keyword).then(setSuggestions);
  }, [keyword]);

  if (keyword == null || suggestions.length === 0) return null;

  return (
    <View style={[styles.suggestionsContainer, isDark ? styles.suggestionsDark : styles.suggestionsLight]}>
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onSelect(item)} style={styles.suggestionItem}>
            <Text style={{ color: isDark ? 'white' : 'black' }}>
              {trigger}{item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ─── Funciones de fetch estáticas ─────────────────────────────────────────────
const fetchUsers = async (q: string): Promise<{ id: string; name: string }[]> => {
  const users = await searchUsers(q);
  return users.map((u) => ({ id: u.id, name: u.username }));
};

const fetchHashtags = async (q: string): Promise<{ id: string; name: string }[]> => {
  const trends = await getTrendingTopics(q);
  return trends.map((t) => ({ id: t, name: t }));
};

// ─────────────────────────────────────────────────────────────────────────────

export default function CreatePostScreen() {
  const [content, setContent] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  // const [triggers, setTriggers] = useState<Triggers<TriggerName>>({} as Triggers<TriggerName>);

  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // const handlePublish = async () => {
  //   if (!content || isPublishing) return;
  //   setIsPublishing(true);
  //   try {
  //     await createPost(content);
  //     setContent('');
  //   } catch (error) {
  //     console.error('Error publicando:', error);
  //   } finally {
  //     setIsPublishing(false);
  //   }
  // };

  // // triggersConfig: detecta @ y # y aplica estilo azul en negrita al texto del trigger
  // const triggersConfig = useMemo(() => ({
  //   mention: {
  //     trigger: '@',
  //     allowedSpacesCount: 0,
  //     textStyle: { fontWeight: 'bold' as const, color: '#1DA1F2' },
  //   },
  //   hashtag: {
  //     trigger: '#',
  //     allowedSpacesCount: 0,
  //     textStyle: { fontWeight: 'bold' as const, color: '#1DA1F2' },
  //   },
  // }), []);

  /* Dropdowns: se renderizan fuera del MentionInput, consumiendo triggers */
  return (
    <View style={[styles.mainContainer, { borderBottomColor: isDark ? '#333' : '#eee' }]}>
      {/* <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        <SuggestionsList
          keyword={triggers.mention?.keyword}
          onSelect={triggers.mention?.onSelect ?? (() => {})}
          trigger="@"
          fetchFn={fetchUsers}
          isDark={isDark}
        />
        <SuggestionsList
          keyword={triggers.hashtag?.keyword}
          onSelect={triggers.hashtag?.onSelect ?? (() => {})}
          trigger="#"
          fetchFn={fetchHashtags}
          isDark={isDark}
        />

        <View style={[styles.editorWrapper]}>
          <AgoraEditor onContentChange={setContent} />;
        </View>

        <View style={[styles.footer, { borderTopColor: isDark ? '#333' : '#ccc' }]}>
          <TouchableOpacity
            style={[styles.publishButton, { opacity: content && !isPublishing ? 1 : 0.5 }]}
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
      </KeyboardAvoidingView> */}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { borderBottomWidth: 1, paddingBottom: 10 },
  editorWrapper: { paddingHorizontal: 15, paddingTop: 10 },
  footer: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  publishButton: {
    backgroundColor: '#1DA1F2',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  publishText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  suggestionsContainer: {
    maxHeight: 200,
    marginHorizontal: 15,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionsLight: { backgroundColor: '#fff', borderColor: '#eee' },
  suggestionsDark: { backgroundColor: '#1a1a1a', borderColor: '#333' },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
});