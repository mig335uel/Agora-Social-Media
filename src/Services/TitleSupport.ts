



import { useState, useEffect } from 'react';

export default class TitleSupport {
    private static currentTitle: string = "Ayuda y Soporte";
    private static listeners: Set<(title: string) => void> = new Set();

    static setTitle(newTitle: string) {
        this.currentTitle = newTitle;
        this.listeners.forEach(l => l(newTitle));
    }

    static getTitle() {
        return this.currentTitle;
    }

    static subscribe(listener: (title: string) => void) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }

    static titleTicket(id: string) {
        return `Ticket #${id.slice(0, 8).toUpperCase()}`;
    }
}

export function useSupportTitle() {
    const [title, setTitle] = useState(TitleSupport.getTitle());

    useEffect(() => {
        return TitleSupport.subscribe(setTitle);
    }, [setTitle]);

    return title;
}