import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: "primary" | "secondary" | "ghost" | "teal" | "amber" | "outlined";
    fullWidth?: boolean;
    isLoading?: boolean;
}

export default function Button({
   children,
   variant = "primary",
   fullWidth = false,
   isLoading = false,
   disabled,
   className = "",
   ...props
}: ButtonProps) {
    const baseClasses =
        "font-semibold py-3 px-6 min-h-[44px] flex items-center justify-center transition-all duration-200 rounded-[var(--radius-button)] disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]";

    const variants: Record<string, string> = {
        primary: "bg-[var(--color-primary)] text-white shadow-md hover:shadow-lg hover:opacity-90",
        secondary: "bg-transparent border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-opacity-10",
        ghost: "bg-transparent text-[var(--color-accent)] hover:bg-gray hover:bg-opacity-5",
        teal: "bg-[#60BFB2] text-white shadow-md hover:shadow-lg hover:opacity-90",
        amber: "bg-[#FFB54A] text-white shadow-md hover:shadow-lg hover:opacity-90",
        outlined: "bg-transparent text-[var(--color-accent)] border-2 border-[#7AD9C1] hover:bg-[#7AD9C122]",
    };

    const widthClass = fullWidth ? "w-full" : "";

    return (
        <button
            className={clsx(
                baseClasses,
                variants[variant],
                widthClass,
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Carregando...
        </span>
            ) : (
                children
            )}
        </button>
    );
}
