import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
  FlatList
} from 'react-native';
import { createPost, getTrendingTopics } from '../Services/PostService';
import { searchUsers } from '../Services/UserService';
import { MentionInput, SuggestionsProvidedProps } from 'react-native-controlled-mentions';

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
      setContent('');
    } catch (error) {
      console.error('Error publicando:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  // Componente de sugerencias reutilizable para @ y #
  const SuggestionsList = ({
    keyword,
    onSuggestionPress,
    trigger,
    fetchFn,
  }: SuggestionsProvidedProps & {
    trigger: string;
    fetchFn: (q: string) => Promise<{ id: string; name: string }[]>;
  }) => {
    const [suggestions, setSuggestions] = useState<{ id: string; name: string }[]>([]);

    React.useEffect(() => {
      if (keyword == null) {
        setSuggestions([]);
        return;
      }
      fetchFn(keyword).then(setSuggestions);
    }, [keyword]);

    if (!keyword || suggestions.length === 0) return null;

    return (
      <View style={[styles.suggestionsContainer, isDark ? styles.suggestionsDark : styles.suggestionsLight]}>
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => onSuggestionPress(item)} style={styles.suggestionItem}>
              <Text style={{ color: isDark ? 'white' : 'black' }}>
                {trigger}{item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const triggersConfig = {
    mention: {
      trigger: '@',
      renderSuggestions: (props: SuggestionsProvidedProps) => (
        <SuggestionsList
          {...props}
          trigger="@"
          fetchFn={async (q) => {
            const users = await searchUsers(q);
            return users.map((u) => ({ id: u.id, name: u.username }));
          }}
        />
      ),
      textStyle: { fontWeight: 'bold' as const, color: '#1DA1F2' },
    },
    hashtag: {
      trigger: '#',
      renderSuggestions: (props: SuggestionsProvidedProps) => (
        <SuggestionsList
          {...props}
          trigger="#"
          fetchFn={async (q) => {
            const trends = await getTrendingTopics(q);
            return trends.map((t) => ({ id: t, name: t }));
          }}
        />
      ),
      textStyle: { fontWeight: 'bold' as const, color: '#1DA1F2' },
    },

  };

  return (
    <View style={[styles.mainContainer, { borderBottomColor: isDark ? '#333' : '#eee' }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.editorWrapper, { height: 150 }]}>
          <MentionInput
            value={content}
            onChange={setContent}
            patternsConfig={{
              plainText: {
                pattern: /[\s\S]+/g,
                textStyle: { color: isDark ? '#fff' : '#000', fontSize: 18 },
              },
              
              
            }}
            triggersConfig={triggersConfig}
            placeholder="¿Qué está pasando?"
            placeholderTextColor={isDark ? '#FFFFFF' : '#000000'}
            style={{
              flex: 1,
              fontSize: 18,
              textAlignVertical: 'top',
              paddingTop: 0,
            }}
            multiline
          />
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
      </KeyboardAvoidingView>
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