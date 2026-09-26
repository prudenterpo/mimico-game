import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080/ws";
const MAX_RECONNECT_ATTEMPTS = 8;

export interface StompConnectionListeners {
    onConnectionLost?: () => void;
    onRetriesExhausted?: () => void;
}

class StompClient {
    private client: Client | null = null;
    private connected: boolean = false;
    private token: string | null = null;
    private subscriptions = new Map<string, any>();
    private onConnected: (() => void) | null = null;
    private onError: ((error: unknown) => void) | null = null;
    private onConnectionLost: (() => void) | null = null;
    private onRetriesExhausted: (() => void) | null = null;
    private closing = false;
    private closeCount = 0;

    constructor() {
        if (typeof window !== "undefined") {
            this.token = localStorage.getItem("token");
        }
    }

    setToken(token: string | null) {
        this.token = token;
        if (typeof window !== "undefined") {
            if (token) {
                localStorage.setItem("token", token);
            } else {
                localStorage.removeItem("token");
            }
        }
    }

    setConnectionListeners(listeners: StompConnectionListeners) {
        this.onConnectionLost = listeners.onConnectionLost ?? null;
        this.onRetriesExhausted = listeners.onRetriesExhausted ?? null;
    }

    connect(onConnected?: () => void, onError?: (error: any) => void) {
        if (onConnected) this.onConnected = onConnected;
        if (onError) this.onError = onError;

        if (this.connected) {
            onConnected?.();
            return;
        }

        if (this.client && !this.closing) {
            return;
        }

        this.closing = false;
        this.closeCount = 0;
        this.client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: {
                Authorization: this.token ? `Bearer ${this.token}` : "",
            },
            debug: (str) => {
                if (process.env.NODE_ENV === "development") {
                    console.log("STOMP:", str);
                }
            },
            reconnectDelay: 2000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        this.client.onConnect = () => {
            this.connected = true;
            this.closeCount = 0;
            this.onConnected?.();
        };

        this.client.onStompError = (frame) => {
            console.error("STOMP Error:", frame);
            this.connected = false;
            this.onError?.(frame);
        };

        this.client.onWebSocketError = (error) => {
            console.error("WebSocket Error:", error);
            this.connected = false;
            this.onError?.(error);
        };

        this.client.onWebSocketClose = () => {
            this.connected = false;
            this.subscriptions.clear();
            if (this.closing) return;
            this.closeCount += 1;
            if (this.closeCount >= MAX_RECONNECT_ATTEMPTS) {
                this.closing = true;
                const client = this.client;
                this.client = null;
                this.onRetriesExhausted?.();
                client?.deactivate();
                return;
            }
            this.onConnectionLost?.();
        };

        this.client.onDisconnect = () => {
            this.connected = false;
            this.subscriptions.clear();
        };

        this.client.activate();
    }

    disconnect() {
        this.closing = true;
        this.closeCount = 0;
        if (this.client) {
            this.subscriptions.clear();
            this.client.deactivate({ force: true});
            this.connected = false;
            this.token = null;
            this.client = null;
        }
    }

    subscribe(destination: string, callback: (message: any) => void) {
        if (!this.client || !this.connected) {
            console.error("STOMP not connected");
            return null;
        }

        if (this.subscriptions.has(destination)) {
            this.subscriptions.get(destination).unsubscribe();
        }

        const subscription = this.client.subscribe(destination, (message: IMessage) => {
            try {
                const parsedMessage = JSON.parse(message.body);
                callback(parsedMessage);
            } catch (error) {
                console.error("Error parsing STOMP message:", error);
                callback({ error: "Failed to parse message", raw: message.body });
            }
        });

        this.subscriptions.set(destination, subscription);
        return subscription;
    }

    publish(destination: string, body: any = {}) {
        if (!this.client || !this.connected) {
            console.error("STOMP not connected");
            return;
        }

        this.client.publish({
            destination,
            body: JSON.stringify(body),
        });
    }

    isConnected() {
        return this.connected;
    }

    getActiveSubscriptions() {
        return Array.from(this.subscriptions.keys());
    }

    unsubscribe(destination: string) {
        if (this.subscriptions.has(destination)) {
            this.subscriptions.get(destination).unsubscribe();
            this.subscriptions.delete(destination);
        }
    }
}

export function parseStompMessage<T = any>(message: any): T | null {
    try {
        if (typeof message.body === 'string') {
            return JSON.parse(message.body);
        }
        return message;

    } catch (error) {
        console.error('Error parsing STOMP message:', error);
        return null;
    }
}

export const stompClient = new StompClient();
