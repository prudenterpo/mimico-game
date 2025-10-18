import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080/ws";

class StompClient {
    private client: Client | null = null;
    private connected: boolean = false;
    private token: string | null = null;

    constructor() {
        if (typeof window !== "undefined") {
            this.token = localStorage.getItem("token");
        }
    }

    setToken(token: string | null) {
        this.token = token;
    }

    connect(onConnected?: () => void, onError?: (error: any) => void) {
        if (this.connected) {
            console.log("Already connected");
            return;
        }

        this.client = new Client({
            webSocketFactory: () => new SockJS(WS_URL) as any,
            connectHeaders: {
                Authorization: this.token ? `Bearer ${this.token}` : "",
            },
            debug: (str) => {
                console.log("STOMP:", str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        this.client.onConnect = () => {
            console.log("STOMP Connected");
            this.connected = true;
            if (onConnected) onConnected();
        };

        this.client.onStompError = (frame) => {
            console.error("STOMP Error:", frame);
            this.connected = false;
            if (onError) onError(frame);
        };

        this.client.onWebSocketClose = () => {
            console.log("WebSocket Closed");
            this.connected = false;
        };

        this.client.activate();
    }

    disconnect() {
        if (this.client && this.connected) {
            this.client.deactivate();
            this.connected = false;
            console.log("STOMP Disconnected");
        }
    }

    subscribe(destination: string, callback: (message: IMessage) => void) {
        if (!this.client || !this.connected) {
            console.error("STOMP not connected");
            return null;
        }

        return this.client.subscribe(destination, callback);
    }

    publish(destination: string, body: any) {
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
}

export const stompClient = new StompClient();