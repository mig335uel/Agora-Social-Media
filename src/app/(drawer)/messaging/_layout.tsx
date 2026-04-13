import { Stack } from 'expo-router';

export default function MessagingLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen
                name="[chatId]"
                options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                }}
            />
        </Stack>
    );
}
