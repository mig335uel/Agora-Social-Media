import useAuth from "@/hooks/useAuth";
import { View,Text, useColorScheme } from "react-native";




export default function Soporte(){
    
    const isDark = useColorScheme() === 'dark';
    
    return(
        <View className={`flex-1 ${isDark ? 'bg-black' : 'bg-white'}`}>
            
        </View>
    )
}