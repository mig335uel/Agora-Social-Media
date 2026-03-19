import useAuth from '@/hooks/useAuth';
import { signOut } from '@/Services/authService';
import { useState } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Modal, Platform, ActionSheetIOS, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';



export default function UserAvatar() {
    const user = useAuth();
    const [isVisible, setIsVisible] = useState<boolean>(false);

    const navigation = useNavigation();

    const handlePress = () => {
        navigation.dispatch(DrawerActions.toggleDrawer());
    };

    if (user?.profile_picture_url !== null) {
        return (
            <>
                <TouchableOpacity onPress={handlePress} className='rounded-full overflow-hidden'>
                    <Image source={{ uri: user?.profile_picture_url }} style={styles.avatar} />
                </TouchableOpacity>
            </>
        );
    }

    return (
        <>
            <TouchableOpacity onPress={handlePress} className='rounded-full overflow-hidden'>
                <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }} style={styles.avatar} />
            </TouchableOpacity>


        </>
    );



}


const styles = StyleSheet.create({
    avatar: {
        width: 30,
        height: 30,

    }
});
