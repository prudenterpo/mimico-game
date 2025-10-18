import { ReactNode, useEffect } from "react";
import Button from "./Button";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={onClose}
        >
            <div
                className="bg-white shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                style={{ borderRadius: "var(--radius-card)" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-2xl font-heading" style={{ color: "var(--color-accent)" }}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-2xl hover:opacity-70 transition-opacity"
                        style={{ color: "var(--color-accent)" }}
                    >
                        ×
                    </button>
                </div>

                <div className="p-6">{children}</div>

                {footer && (
                    <div className="flex items-center justify-end gap-3 p-6 border-t">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}