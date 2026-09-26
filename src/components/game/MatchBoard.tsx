import { isSpecialTile } from "@/lib/matchRules";

interface MatchBoardProps {
    teamAPosition: number;
    teamBPosition: number;
}

const pathCoordinates = () => {
    const coords: Array<{ x: number; y: number }> = [];
    const rows = 8;
    const cols = 13;
    let currentPos = 0;

    for (let col = 0; col < cols && currentPos < 52; col += 1) {
        coords.push({ x: 10 + (col * 80) / cols, y: 85 });
        currentPos += 1;
    }
    for (let row = rows - 2; row >= 0 && currentPos < 52; row -= 1) {
        coords.push({ x: 90, y: 15 + (row * 70) / (rows - 1) });
        currentPos += 1;
    }
    for (let col = cols - 2; col >= 0 && currentPos < 52; col -= 1) {
        coords.push({ x: 10 + (col * 80) / cols, y: 15 });
        currentPos += 1;
    }
    for (let row = 1; row < rows - 1 && currentPos < 52; row += 1) {
        coords.push({ x: 10, y: 15 + (row * 70) / (rows - 1) });
        currentPos += 1;
    }
    let innerMargin = 15;
    while (currentPos < 52) {
        coords.push({
            x: 20 + innerMargin + (currentPos % 4) * 15,
            y: 30 + innerMargin + Math.floor((currentPos % 8) / 4) * 15,
        });
        currentPos += 1;
        if (innerMargin < 25 && currentPos % 8 === 0) innerMargin += 2;
    }
    return coords;
};

const coordinates = pathCoordinates();

export default function MatchBoard({ teamAPosition, teamBPosition }: MatchBoardProps) {
    return (
        <div className="relative h-64 sm:h-80 lg:h-96 bg-gray-50 rounded-lg overflow-hidden" aria-label="Tabuleiro">
            {coordinates.map((coord, index) => {
                const tile = index + 1;
                const special = isSpecialTile(tile);
                return (
                    <div
                        key={tile}
                        aria-label={special ? `Casa ${tile}, especial` : `Casa ${tile}`}
                        className={`absolute w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold ${
                            special
                                ? "bg-amber-100 border-amber-400 text-amber-800"
                                : "bg-white border-gray-300 text-gray-600"
                        }`}
                        style={{
                            left: `${coord.x}%`,
                            top: `${coord.y}%`,
                            transform: "translate(-50%, -50%)",
                        }}
                    >
                        {tile}
                        {special && <span className="sr-only"> especial</span>}
                        {teamAPosition === tile && (
                            <span className="absolute -top-2 -left-2 w-4 h-4 bg-teal-500 rounded-full border-2 border-white" aria-hidden="true" />
                        )}
                        {teamBPosition === tile && (
                            <span className="absolute -top-2 -right-2 w-4 h-4 bg-orange-500 rounded-full border-2 border-white" aria-hidden="true" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
