import useAuth from "@/hooks/useAuth";
import { getNotifcations } from "@/Services/NotificacitonService";
import { Notifications } from "@/Types/Notifications";
import { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";


export default function NotificationScreen() {

    const [notifications, setNotifications] = useState<Notifications[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const user = useAuth();
    useEffect(() => {
        const fetchNotifications = async () => {
            const notifications = await getNotifcations(user?.id || '');
            setNotifications(notifications);
            setLoading(false);
        }
        fetchNotifications();
    }, []);


    const renderItem = useCallback(({ item }: { item: Notifications }) => {
        return (
            <View>
                <Text>{item.text_notification}</Text>
            </View>
        );
    }, []);
    return (
        <View>
            {notifications.map((notification) => (
                <Text key={notification.id}>{notification.text_notification}</Text>
            ))}
        </View>
    );
}