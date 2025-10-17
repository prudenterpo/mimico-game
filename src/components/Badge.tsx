import { ReactNode } from "react";

interface BadgeProps {
    children: ReactNode;
    variant?: "default" | "success" | "error" | "warning";
}

export default function Badge({ children, variant = "default" }: BadgeProps) {
    const colors = {
        default: "var(--color-accent)",
        success: "var(--color-success)",
        error: "var(--color-error)",
        warning: "#FFB88C",
    };

    return (
        <span
            className="inline-block px-3 py-1 text-xs font-semibold rounded-full text-white"
            style={{ backgroundColor: colors[variant] }}
        >
      {children}
    </span>
    );
}