interface AvatarProps {
    nickname: string,
    src?: string,
    size?: "sm" | "md" | "lg",
    online?: boolean,
    showOnline?: boolean
}

export default function Avatar({nickname, src, size = "md", online = false }: AvatarProps) {
    const sizeStyles = {
        sm: "w-8 h-8 text-sm",
        md: "w-12 h-12 text-md",
        lg: "w-16 h-16 text-2xl",
    };

    const getAvatarColor = (nickname: string) => {
        const colors = [
            '#FF6B6B',
            '#4ECDC4',
            '#45B7D1',
            '#96CEB4',
            '#FFEAA7',
            '#DDA0DD',
            '#98D8C8',
            '#F7DC6F',
            '#BB8FCE',
            '#85C1E9'
        ];

        let hash = 0;
        for (let i = 0; i < nickname.length; i++) {
            hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colors[Math.abs(hash) % colors.length];
    };

    const safeNickname = nickname || "Unknown";
    const initials = safeNickname
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const avatarColor = getAvatarColor(safeNickname);

    return (
        <div className="relative inline-block">
            <div
                className={`${sizeStyles[size]} rounded-full flex items-center justify-center font-bold text-white overflow-hidden`}
                style={{backgroundColor: avatarColor}}
            >
                {src ? (
                    <img src={src} alt={safeNickname} className="w-full h-full object-cover"/>
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
