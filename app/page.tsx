import Button from "@/components/Button";
import Logo from "@/components/Logo";
import Link from "next/link";
import Image from "next/image";
import ReactCountryFlag from "react-country-flag";

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden"
              style={{ backgroundColor: 'var(--color-background)' }}
        >
            <div className="hidden md:block absolute bottom-0 left-0 opacity-90"
                 style={{width: '500px', height: 'auto'}}
            >
                <Image
                    src="/left_main_illustration.svg"
                    alt=""
                    width={400}
                    height={300}
                    className="w-full h-auto object-contain"
                />
            </div>

            <div className="hidden md:block absolute bottom-0 right-0 opacity-90"
                 style={{width: '400px', height: 'auto'}}>
                <Image
                    src="/right_main_illustration.svg"
                    alt=""
                    width={400}
                    height={300}
                    className="w-full h-auto object-contain"
                />
            </div>

            <div className="max-w-sm sm:max-w-md lg:max-w-lg w-full text-center relative z-10">
                <div className="flex justify-center">
                    <Logo size="xl"/>
                </div>

                <div className="space-y-6 sm:space-y-3">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading"
                        style={{color: 'var(--color-accent)'}}>
                        Mímico
                    </h1>
                    <p className="text-base sm:text-lg lg:text-xl px-2 mb-6" style={{color: 'var(--color-accent)' }}>
                        Faça sua melhor mímica em uma vídeo chamada!
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="max-w-xs mx-auto">
                        <Link href="/login">
                            <Button variant="primary" fullWidth>
                                Entrar
                            </Button>
                        </Link>
                    </div>
                    <div className="max-w-xs mx-auto">
                        <Link href="/about">
                            <Button variant="outlined" fullWidth>
                                Sobre o jogo
                            </Button>
                        </Link>
                    </div>

                    <div className="text-center pt-2">
                        <p className="text-base">
                            Não tem conta?{" "}
                            <Link
                                href="/register"
                                className="font-semibold hover:underline transition-colors"
                                style={{color: 'var(--color-primary)'}}
                            >
                                Registrar
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="flex justify-center items-center gap-4 mt-4 text-sm pt-4">
                    <button
                        className="flex items-center gap-2 px-2 py-1 transition-opacity hover:opacity-70 cursor-pointer">
                        <ReactCountryFlag
                            countryCode="BR"
                            svg
                            style={{
                                width: '20px',
                                height: '15px',
                            }}
                        />
                        <span style={{color: 'var(--color-accent)'}}>PT-BR</span>
                    </button>
                    <div className="w-px h-4 bg-gray-300"></div>

                    <button
                        className="flex items-center gap-2 px-2 py-1 transition-opacity hover:opacity-70 opacity-60 cursor-pointer">
                        <ReactCountryFlag
                            countryCode="US"
                            svg
                            style={{
                                width: '20px',
                                height: '15px',
                            }}
                        />
                        <span style={{color: 'var(--color-accent)'}}>EN-US</span>
                    </button>
                </div>
            </div>
        </main>
    );
}