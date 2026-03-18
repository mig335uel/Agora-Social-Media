import { View, Text, useColorScheme } from "react-native";

export default function NewPost() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    return (
        <View className={`${isDark ? 'bg-black' : 'bg-white'} flex-1`}>
            <Text className={`text-2xl font-bold text-center ${isDark ? 'text-white' : 'text-black'}`}>new post</Text>
        </View>
    );
}