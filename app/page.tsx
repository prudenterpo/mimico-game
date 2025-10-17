export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: 'var(--color-background)' }}>
            <div className="max-w-md w-full text-center space-y-8">
                {/* Logo Placeholder */}
                <div className="flex justify-center">
                    <div
                        className="w-32 h-32 rounded-full flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                        <span className="text-6xl">🐵</span>
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <h1 className="text-5xl" style={{ color: 'var(--color-accent)' }}>
                        Mímico
                    </h1>
                    <p className="text-lg opacity-70" style={{ color: 'var(--color-accent)' }}>
                        Faça sua melhor mímica em uma vídeo chamada!
                    </p>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                    <button
                        className="w-full text-white font-semibold py-3 px-6 shadow-md hover:shadow-lg transition-all"
                        style={{
                            backgroundColor: 'var(--color-primary)',
                            borderRadius: 'var(--radius-button)'
                        }}
                    >
                        Entrar
                    </button>
                    <button
                        className="w-full bg-transparent border-2 font-semibold py-3 px-6 transition-all hover:text-white"
                        style={{
                            borderColor: 'var(--color-accent)',
                            color: 'var(--color-accent)',
                            borderRadius: 'var(--radius-button)'
                        }}
                    >
                        Registrar
                    </button>
                </div>

                {/* Language Toggle */}
                <div className="flex justify-center gap-2 text-sm">
                    <button
                        className="px-4 py-2 rounded-full text-white font-medium"
                        style={{ backgroundColor: 'var(--color-accent)' }}
                    >
                        PT-BR
                    </button>
                    <button
                        className="px-4 py-2 rounded-full font-medium transition-colors"
                        style={{
                            backgroundColor: 'rgba(45, 49, 66, 0.1)',
                            color: 'var(--color-accent)'
                        }}
                    >
                        EN-US
                    </button>
                </div>
            </div>
        </main>
    );
}