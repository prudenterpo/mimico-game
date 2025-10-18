"use client";

import { useParams } from "next/navigation";

export default function GamePage() {
    const params = useParams();
    const gameId = params.id as string;

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto p-8">
                <h1 className="text-4xl mb-4">Game in Progress</h1>
                <p className="text-xl">Game ID: {gameId}</p>

                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h2 className="text-2xl mb-4">Board (52 spaces)</h2>
                        <div className="h-96 bg-gray-700 rounded flex items-center justify-center">
                            Board will be here
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-gray-800 p-6 rounded-lg">
                            <h2 className="text-2xl mb-4">Video</h2>
                            <div className="grid grid-cols-2 gap-2">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="bg-gray-700 aspect-video rounded flex items-center justify-center">
                                        Player {i}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-800 p-6 rounded-lg">
                            <h2 className="text-2xl mb-4">Chat</h2>
                            <div className="h-48 bg-gray-700 rounded"></div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <button className="bg-orange-500 px-8 py-4 rounded-lg text-2xl">
                        Roll Dice
                    </button>
                </div>
            </div>
        </div>
    );
}