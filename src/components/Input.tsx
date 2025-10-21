"use client";
import React, { forwardRef, InputHTMLAttributes, useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, fullWidth = false, className = "", type = "text", ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);
        const isPassword = type === "password";
        const inputType = isPassword && showPassword ? "text" : type;

        return (
            <div className={fullWidth ? "w-full" : ""}>
                {label && (
                    <label
                        htmlFor={props.id}
                        className="block text-sm font-medium mb-2 text-left"
                        style={{ color: "var(--color-accent)" }}
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    <input
                        ref={ref}
                        type={inputType}
                        aria-invalid={!!error}
                        className={`w-full px-4 py-3 bg-gray-50 border-0 rounded-xl 
                                    focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50
                                    transition-all duration-200 text-gray-800 placeholder-gray-500
                                    ${error ? "ring-2 ring-red-400" : ""} ${className}`
                        }
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute inset-y-0 right-3 flex items-center justify-center text-gray-500 hover:text-gray-700 transition"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    )}
                </div>
                {error && <p className="text-sm text-red-500 text-left mt-1 animate-fadeIn">{error}</p>}
            </div>
        );
    }
);

Input.displayName = "Input";
export default Input;
