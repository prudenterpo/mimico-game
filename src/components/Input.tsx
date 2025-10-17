import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, fullWidth = false, className = "", ...props }, ref) => {
        return (
            <div className={`${fullWidth ? "w-full" : ""}`}>
                {label && (
                    <label
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'var(--color-accent)' }}
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={`px-4 py-3 border-2 focus:outline-none focus:ring-2 transition-all ${className}`}
                    style={{
                        borderRadius: "var(--radius-card)",
                        borderColor: error ? "var(--color-error)" : "var(--color-accent)",
                        backgroundColor: "white",
                        color: "var(--color-accent)",
                    }}
                    {...props}
                />
                {error && (
                    <p className="text-sm mt-1" style={{ color: 'var(--color-error)' }}>
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";

export default Input;