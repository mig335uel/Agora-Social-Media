import { Usuario } from "./Users";

export interface Notifications{
    id: string;
    receiver_id: string;
    sender_id: string;
    type: string;
    text_notification: string;
    post_id: string;
    created_at: string;
    users?: Usuario;
    is_read: boolean;
}