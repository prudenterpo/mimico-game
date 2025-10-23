import { Client, IMessage } from "@stomp/stompjs";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";

class StompClient {
    private client: Client | null = null;
    private connected: boolean = false;
    private token: string | null = null;
    private subscriptions = new Map<string, any>();

    constructor() {
        if (typeof window !== "undefined") {
            this.token = localStorage.getItem("token");
        }
    }

    setToken(token: string | null) {
        this.token = token;
        if (typeof window !== "undefined" && token) {
            localStorage.setItem("token", token);
        }
    }

    connect(onConnected?: () => void, onError?: (error: any) => void) {
        if (this.connected) {
            console.log("Already connected");
            onConnected?.();
            return;
        }

        this.client = new Client({
            brokerURL: WS_URL.replace("http://", "ws://").replace("https://", "wss://"),
            connectHeaders: {
                Authorization: this.token ? `Bearer ${this.token}` : "",
            },
            debug: (str) => {
                if (process.env.NODE_ENV === "development") {
                    console.log("STOMP:", str);
                }
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        this.client.onConnect = (frame) => {
            console.log("STOMP Connected");
            this.connected = true;
            onConnected?.();
        };

        this.client.onStompError = (frame) => {
            console.error("STOMP Error:", frame);
            this.connected = false;
            onError?.(frame);
        };

        this.client.onWebSocketError = (error) => {
            console.error("WebSocket Error:", error);
            this.connected = false;
            onError?.(error);
        };

        this.client.onDisconnect = () => {
            console.log("STOMP Disconnected");
            this.connected = false;
            this.subscriptions.clear();
        };

        this.client.activate();
    }

    disconnect() {
        if (this.client) {
            this.subscriptions.clear();
            this.client.deactivate();
            this.connected = false;
            console.log("STOMP Disconnected");
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

export const stompClient = new StompClient();