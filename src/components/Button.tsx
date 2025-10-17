import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: "primary" | "secondary" | "ghost";
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
    const baseStyles = "font-semibold py-3 px-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

    const variantStyles = {
        primary: "text-white shadow-md hover:shadow-lg hover:opacity-90",
        secondary: "bg-transparent border-2 hover:text-white",
        ghost: "bg-transparent hover:opacity-80",
    };

    const widthStyle = fullWidth ? "w-full" : "";

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${widthStyle} ${className}`}
            style={{
                backgroundColor: variant === "primary" ? "var(--color-primary)" : "transparent",
                borderColor: variant === "secondary" ? "var(--color-accent)" : "transparent",
                color: variant === "primary" ? "white" : "var(--color-accent)",
                borderRadius: "var(--radius-button)",
                borderWidth: variant === "secondary" ? "2px" : "0",
            }}
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