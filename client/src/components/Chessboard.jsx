import React, { useState } from 'react';
import { Chess } from 'chess.js';
import clsx from 'clsx';

const PIECE_IMAGES = {
    w: {
        p: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
        n: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
        b: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
        r: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
        q: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
        k: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    },
    b: {
        p: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
        n: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
        b: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
        r: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
        q: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
        k: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
    },
};

const Chessboard = ({ fen, onMove, orientation = 'white' }) => {
    const [draggedPiece, setDraggedPiece] = useState(null);
    const [selectedSquare, setSelectedSquare] = useState(null); // New: Click selection
    const [legalMoves, setLegalMoves] = useState([]);

    // Safe initialization
    let game;
    try {
        game = new Chess(fen);
    } catch (e) {
        game = new Chess();
    }

    const board = game.board();
    const boardDisplay = orientation === 'white' ? board : [...board].reverse().map(row => [...row].reverse());

    const getSquareName = (rowIndex, colIndex) => {
        const file = orientation === 'white' ? String.fromCharCode(97 + colIndex) : String.fromCharCode(104 - colIndex);
        const rank = orientation === 'white' ? 8 - rowIndex : 1 + rowIndex;
        return `${file}${rank}`;
    };

    const handleDragStart = (e, square, piece) => {
        if (piece.color !== (game.turn())) {
            e.preventDefault();
            return;
        }
        setDraggedPiece({ square, piece });
        setSelectedSquare(square); // Auto-select on drag too
        const moves = game.moves({ square, verbose: true }).map(m => m.to);
        setLegalMoves(moves);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e, targetSquare) => {
        e.preventDefault();
        if (!draggedPiece) return;
        executeMove(draggedPiece.square, targetSquare);
        setDraggedPiece(null);
    };

    const executeMove = (from, to) => {
        try {
            const move = {
                from,
                to,
                promotion: 'q',
            };
            if (game.move(move)) {
                onMove(move);
                setSelectedSquare(null);
                setLegalMoves([]);
                return true;
            }
        } catch (err) { }
        return false;
    };

    const handleSquareClick = (squareName, piece) => {
        // Method 1: If clicking a legal move target (and we have a selection) -> Move
        if (selectedSquare && legalMoves.includes(squareName)) {
            executeMove(selectedSquare, squareName);
            return;
        }

        // Method 2: If clicking own piece -> Select it
        if (piece && piece.color === game.turn()) {
            if (selectedSquare === squareName) {
                // Deselect if clicking same
                setSelectedSquare(null);
                setLegalMoves([]);
            } else {
                setSelectedSquare(squareName);
                const moves = game.moves({ square: squareName, verbose: true }).map(m => m.to);
                setLegalMoves(moves);
            }
            return;
        }

        // Method 3: Clicking empty square or opponent piece (not a legal move) -> Deselect
        setSelectedSquare(null);
        setLegalMoves([]);
    };

    return (
        <div className="relative rounded-lg overflow-hidden shadow-2xl border-[8px] border-zinc-800 bg-[#ebecd0] touch-none select-none">
            <div className="w-full sm:w-[400px] md:w-[500px] lg:w-[550px] aspect-square grid grid-cols-8 grid-rows-8">
                {boardDisplay.map((row, rowIndex) => (
                    <React.Fragment key={rowIndex}>
                        {row.map((square, colIndex) => {
                            const squareName = getSquareName(rowIndex, colIndex);
                            const isLight = (rowIndex + colIndex) % 2 === 0;
                            const isLegal = legalMoves.includes(squareName);
                            const isSource = draggedPiece?.square === squareName || selectedSquare === squareName;

                            // Chess.com style colors
                            const baseBg = isLight ? "bg-[#ebecd0]" : "bg-[#739552]";
                            const highlightClass = isSource ? "bg-yellow-200/50" : ""; // Highlight selected

                            return (
                                <div
                                    key={squareName}
                                    className={clsx(
                                        "w-full h-full flex items-center justify-center relative",
                                        baseBg,
                                        highlightClass,
                                        isLegal && !square && "after:content-[''] after:w-[30%] after:h-[30%] after:bg-black/10 after:rounded-full",
                                        isLegal && square && "after:absolute after:inset-0 after:border-[6px] after:border-black/10 after:rounded-full",
                                    )}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDrop(e, squareName)}
                                    // Touch/Click Handler
                                    onClick={() => handleSquareClick(squareName, square)}
                                >
                                    {/* Coordinates */}
                                    {colIndex === 0 && orientation === 'white' && (
                                        <span className={clsx("absolute top-0.5 left-1 text-[10px] font-bold select-none", isLight ? "text-[#739552]" : "text-[#ebecd0]")}>
                                            {8 - rowIndex}
                                        </span>
                                    )}
                                    {rowIndex === 7 && orientation === 'white' && (
                                        <span className={clsx("absolute bottom-0.5 right-1 text-[10px] font-bold select-none", isLight ? "text-[#739552]" : "text-[#ebecd0]")}>
                                            {String.fromCharCode(97 + colIndex)}
                                        </span>
                                    )}

                                    {square && (
                                        <img
                                            src={PIECE_IMAGES[square.color][square.type]}
                                            alt={`${square.color}${square.type}`}
                                            className={clsx(
                                                "w-[85%] h-[85%] z-10 select-none cursor-grab active:cursor-grabbing",
                                                isSource && "opacity-80 scale-105", // Slight pop for selected
                                                "transition-transform duration-75"
                                            )}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, squareName, square)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default Chessboard;
