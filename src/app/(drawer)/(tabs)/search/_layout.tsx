import React, { createContext, useState, Dispatch, SetStateAction } from 'react';
import AppBar from '@/Components/AppBar';
import AppSearchBar from '@/Components/AppSearchBar';
import { MaterialTopTabs } from '@/Components/TopBar/materialtopbars';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

type SearchContextValue = {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
};

export const SearchContext = createContext<SearchContextValue>({
  searchQuery: '',
  setSearchQuery: () => {},
});

export default function SearchLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }} edges={['top']}>
        <AppSearchBar query={searchQuery} onSearch={setSearchQuery} />

        <MaterialTopTabs
          screenOptions={{
            tabBarStyle: {
              backgroundColor: isDark ? '#000' : '#fff',
              overflow: 'visible',
              elevation: 1,
              shadowColor: '',
              paddingBottom: 2,
            },
            tabBarItemStyle: {
              height: 40,
            },
            tabBarIndicatorStyle: {
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: isDark ? '#fff' : '#000',
            },
            tabBarLabelStyle: {
              fontWeight: 'bold',
              fontSize: 16,
            },
            tabBarActiveTintColor: isDark ? '#fff' : '#000',
            tabBarInactiveTintColor: isDark ? '#eee' : '#000',
          }}
        >
          <MaterialTopTabs.Screen name="index" options={{ title: 'Tendencias' }} />
          <MaterialTopTabs.Screen name="usersearch" options={{ title: 'Usuarios' }} />
        </MaterialTopTabs>
      </SafeAreaView>
    </SearchContext.Provider>
  );
}