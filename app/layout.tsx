import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import React from "react";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["400", "600", "700"],
    variable: "--font-poppins",
});

export const metadata: Metadata = {
    title: "Mímico - Jogo de Mímica Online",
    description: "Faça sua melhor mímica em uma vídeo chamada!",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR">
        <body
            className={`${inter.variable} ${poppins.variable} font-sans antialiased bg-background`}
        >
        {children}
        <Toaster position="top-right" richColors />
        </body>
        </html>
    );
}