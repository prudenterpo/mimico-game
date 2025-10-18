import {ReactNode} from "react";

interface BadgeProps {
    children: ReactNode,
    variant?: "default" | "success" | "error" | "warning" | "teal" | "amber",
    className?: string
}

export default function Badge({children, variant = "default", className}: BadgeProps) {
    const colors = {
        default: "var(--color-accent)",
        success: "var(--color-success)",
        error: "var(--color-error)",
        warning: "#FFB88C",
        teal: "#60BFB2",
        amber: "#FFB54A",
    };

    return (
        <span
            className={`inline-block px-3 py-1 text-xs font-semibold rounded-full text-white ${className}`}
            style={{backgroundColor: colors[variant]}}
        >
      {children}
    </span>
    );
}