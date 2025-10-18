import Image from "next/image";

interface LogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
}

export default function Logo({ size = "md", className = "" }: LogoProps) {
    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-12 h-12",
        lg: "w-24 h-24 sm:w-32 sm:h-32",
        xl: "w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64"
    };

    return (
        <div className={`flex items-center justify-center ${sizeClasses[size]} ${className}`}>
            <Image
                src="/logo_mimico.svg"
                alt="Mímico"
                width={size === "xl" ? 256 : size === "lg" ? 128 : size === "md" ? 48 : 32}
                height={size === "xl" ? 256 : size === "lg" ? 128 : size === "md" ? 48 : 32}
                className="w-full h-full object-contain"
                priority
            />
        </div>
    );
}