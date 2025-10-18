interface AvatarProps {
    name: string,
    src?: string,
    size?: "sm" | "md" | "lg",
    online?: boolean,
    showOnline?: boolean
}

export default function Avatar({name, src, size = "md", online = false }: AvatarProps) {
    const sizeStyles = {
        sm: "w-8 h-8 text-sm",
        md: "w-12 h-12 text-md",
        lg: "w-16 h-16 text-2xl",
    };

    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="relative inline-block">
            <div
                className={`${sizeStyles[size]} rounded-full flex items-center justify-center font-bold text-white overflow-hidden`}
                style={{backgroundColor: 'var(--color-primary)'}}
            >
                {src ? (
                    <img src={src} alt={name} className="w-full h-full object-cover"/>
                ) : (
                    <span>{initials}</span>
                )}
            </div>
            {online && (
                <span
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                    style={{backgroundColor: 'var(--color-success)'}}
                />
            )}
        </div>
    );
}