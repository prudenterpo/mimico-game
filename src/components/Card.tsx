import { ReactNode } from "react";

interface CardProps {
    children: ReactNode;
    className?: string;
    padding?: "none" | "sm" | "md" | "lg";
}

export default function Card({ children, className = "", padding = "md" }: CardProps) {
    const paddingStyles = { none: "p-0", sm: "p-4", md: "p-6", lg: "p-8",};

    return (
        <div
            className={`bg-white shadow-lg ${paddingStyles[padding]} ${className}`}
            style={{borderRadius: "var(--radius-card)",}}
        >
            {children}
        </div>
    );
}