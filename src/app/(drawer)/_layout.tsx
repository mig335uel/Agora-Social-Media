import React from 'react';
import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '@/Components/CustomDrawerContent';
import { Octicons } from '@expo/vector-icons';

export default function DrawerLayout() {
  return (
    
    <Drawer
     drawerContent={(props) => <CustomDrawerContent {...props} />} 
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        swipeEdgeWidth: 40,
        overlayColor: 'rgba(0,0,0,0.35)',
      }}
    >

      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerItemStyle:{display:'none'} 
         
        }}
      />
      <Drawer.Screen
        name="post"
        options={{
          drawerItemStyle:{display:'none'} 
         
        }}
      />
      <Drawer.Screen
        name="editar"
        options={{
          drawerItemStyle:{display:'none'} 
         
        }}
      />
    </Drawer>
  );
}
