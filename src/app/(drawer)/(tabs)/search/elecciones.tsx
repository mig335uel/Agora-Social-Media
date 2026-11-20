import React, { useContext } from 'react';
import { View, useColorScheme } from 'react-native';
import { SearchContext } from './_layout';
import EventoElecciones29N from '@/Components/Elecciones/EventoElecciones29N';

export default function Elecciones29NScreen() {
  const isDark = useColorScheme() === 'dark';
  const { searchQuery } = useContext(SearchContext);

  return (
    <View style={{ flex: 1 }} className={isDark ? 'bg-black' : 'bg-white'}>
      <EventoElecciones29N externalSearchQuery={searchQuery} />
    </View>
  );
}
