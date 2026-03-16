import React, { useRef, useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Text, Image } from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { uploadAgoraImage } from '../Services/ImageService';
import { searchUsers } from '../Services/UserService';
import { getTrendingTopics } from '../Services/PostService';
import { Usuario } from '../Types/Users';
import { useColorScheme } from 'react-native';

interface Props {
  onContentChange: (html: string) => void;
}

export const AgoraEditor = ({ onContentChange }: Props) => {
  const richText = useRef<RichEditor>(null);
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  // Estados para sugerencias
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'mention' | 'hashtag' | null>(null);

  const handleInsertImage = async () => {
    const url = await uploadAgoraImage();
    if (url) {
      richText.current?.insertImage(url);
    }
  };

  const handleChange = async (html: string) => {
    onContentChange(html);

    // 1. Limpiamos HTML para detectar texto plano al final
    // Sustituimos etiquetas por nada para no añadir espacios extra que rompan la detección al escribir
    const cleanText = html.replace(/<[^>]*>?/gm, '');

    // 2. Detección de Menciones (@usuario)
    // Cambiado a * para que salte desde que pones el @ si hay resultados generales o populares
    const mentionMatch = cleanText.match(/@(\w*)$/);
    if (mentionMatch) {
      const query = mentionMatch[1];
      // Si solo hay @, podemos mostrar sugerencias generales o esperar a 1-2 letras para evitar ruido
      if (query.length >= 0) {
        const results = await searchUsers(query);
        setSuggestions(results);
        setSuggestionType('mention');
        setShowSuggestions(results.length > 0);
        return;
      }
    }

    // 3. Detección de Hashtags (#tema)
    const hashtagMatch = cleanText.match(/#(\w*)$/);
    if (hashtagMatch) {
      const query = hashtagMatch[1];
      if (query.length >= 0) {
        const results = await getTrendingTopics(query);
        setSuggestions(results);
        setSuggestionType('hashtag');
        setShowSuggestions(results.length > 0);
        return;
      }
    }

    setShowSuggestions(false);
  };

  const selectSuggestion = (item: any) => {
    let htmlToInsert = '';

    if (suggestionType === 'mention') {
      const user = item as Usuario;
      htmlToInsert = `<span style="color: #1DA1F2; font-weight: bold;">@${user.username}</span>&nbsp;`;
    } else if (suggestionType === 'hashtag') {
      const topic = item as string;
      htmlToInsert = `<span style="color: #1DA1F2; font-weight: bold;">#${topic}</span>&nbsp;`;
    }

    // Insertamos el HTML estilizado. 
    // Nota: Esto NO borra el @ o # que el usuario ya escribió, lo añade después.
    // Para borrar lo anterior se necesitaría acceso directo al cursor del WebView, 
    // que es complejo en esta librería. Pero visualmente es funcional.
    richText.current?.insertHTML(htmlToInsert);
    setShowSuggestions(false);
  };

  const renderSuggestionItem = ({ item }: { item: any }) => {
    if (suggestionType === 'mention') {
      const user = item as Usuario;
      return (
        <TouchableOpacity style={styles.suggestionItem} onPress={() => selectSuggestion(user)}>
          <Image
            source={{ uri: user.profile_picture_url || 'https://via.placeholder.com/40' }}
            style={styles.suggestionAvatar}
          />
          <View>
            <Text style={styles.suggestionName}>{user.display_name}</Text>
            <Text style={styles.suggestionUsername}>@{user.username}</Text>
          </View>
        </TouchableOpacity>
      );
    } else {
      const topic = item as string;
      return (
        <TouchableOpacity style={styles.suggestionItem} onPress={() => selectSuggestion(topic)}>
          <View style={styles.hashtagIcon}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>#</Text>
          </View>
          <View>
            <Text style={styles.suggestionName}>{topic}</Text>
            <Text style={styles.suggestionUsername}>Tendencia en Agora</Text>
          </View>
        </TouchableOpacity>
      );
    }
  };

  return (
    <View style={styles.container} className={isDark ? 'bg-black' : 'bg-white'}>
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestionItem}
            keyExtractor={(item, index) => (suggestionType === 'mention' ? `m-${item.id}` : `h-${index}`)}
            keyboardShouldPersistTaps="always"
          />
        </View>
      )}

      <RichEditor
        ref={richText}
        placeholder="¿Qué está pasando en tu perímetro?..."
        onChange={handleChange}
        style={styles.editor}
        initialFocus={true}
        containerStyle={{ backgroundColor: isDark ? 'black' : 'white' }}
      />

      <RichToolbar
        editor={richText}
        actions={[
          actions.setBold,
          actions.setItalic,
          actions.insertOrderedList,
          actions.insertLink,
          actions.insertImage,
        ]}
        onPressAddImage={handleInsertImage}
        iconTint="#555"
        style={{ ...styles.toolbar, backgroundColor: isDark ? 'black' : '#fff' }}

        selectedIconTint="#000"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { minHeight: 180, marginBottom: 10, zIndex: 10 },
  editor: { flex: 1, minHeight: 150 },
  toolbar: {
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#eee'
  },
  suggestionsContainer: {
    position: 'absolute',
    bottom: 52, // Justo encima de la toolbar
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 9999, // Asegurar que pase por encima de todo
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#eee'
  },
  suggestionItem: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  suggestionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  hashtagIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1DA1F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  suggestionName: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#000'
  },
  suggestionUsername: {
    color: '#666',
    fontSize: 12,
  },
});