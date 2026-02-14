const { Chess } = require('chess.js');

const PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
};

// Simplified Position Bonus Tables (Mid-Game)
// Scores are from White's perspective. 
// For Black, we mirror the rank (r becomes 7-r) and file (c becomes 7-c) if needed, 
// but for simple center/activity, usually mirroring rank is enough.

const PAWN_TABLE = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0]
];

const KNIGHT_TABLE = [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50]
];

const BISHOP_TABLE = [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20]
];

// Rooks like open files, but simple table: stay off edges/activity
const ROOK_TABLE = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0]
];

const QUEEN_TABLE = [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20]
];

const KING_TABLE = [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20]
];

class BotEngine {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.depth = this.getDepth(difficulty);
        this.nodesCount = 0;
    }

    getDepth(difficulty) {
        switch (difficulty) {
            case 'hard': return 3; // Reduced from 4 to keep it simpler/stable
            case 'medium': return 2;
            case 'easy': default: return 1;
        }
    }

    getBestMove(fen) {
        const game = new Chess(fen);
        this.nodesCount = 0;
        const color = game.turn(); // 'w' or 'b'

        // Start Minimax
        // isMaximizing = true because we want the best move for the current turn
        const result = this.minimax(game, this.depth, -Infinity, Infinity, true, color);

        console.log(`[BOT] Difficulty: ${this.difficulty}, Depth: ${this.depth}, Nodes: ${this.nodesCount}`);
        return result.move;
    }

    evaluate(game) {
        const board = game.board();
        let score = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;

                let val = PIECE_VALUES[piece.type];
                let posBonus = 0;

                // Simple Table Lookup
                // Note: board is 0-indexed from top (Rank 8 is r=0)
                // If White (Standard perspective): r=0 is Rank 8.
                // Our tables are typically drawn as r=0 is Rank 8 or Rank 1?
                // Let's assume tables above are drawn Top-to-Bottom (r=0 is Rank 8, r=7 is Rank 1).

                // If White: We want Pesto from Bottom-Up (Rank 1 to 8).
                // So if piece is on r=7 (Rank 1), we look at index 7.
                // Actually most tables online are Rank 8 .. Rank 1.
                // Let's assume tables above are Rank 8 (top) to Rank 1 (bottom).

                // White pawns start at r=6 (Rank 2).
                // If table[6] has 50s, that matches.

                // White: Use table as is? 
                // Checks: PAWN_TABLE[1] has 50s. That is r=1 (Rank 7). White Promotes there. Good.
                // PAWN_TABLE[6] has 5s/10s. r=6 (Rank 2). Start.

                // So for White, we use the table directly.
                // For Black, we mirror. Black starts at r=1 (Rank 7). Promotes at r=6 (Rank 2).
                // So Black at r=1 needs score from r=6 in table.

                if (piece.color === 'w') {
                    if (piece.type === 'p') posBonus = PAWN_TABLE[r][c];
                    else if (piece.type === 'n') posBonus = KNIGHT_TABLE[r][c];
                    else if (piece.type === 'b') posBonus = BISHOP_TABLE[r][c];
                    else if (piece.type === 'r') posBonus = ROOK_TABLE[r][c];
                    else if (piece.type === 'q') posBonus = QUEEN_TABLE[r][c];
                    else if (piece.type === 'k') posBonus = KING_TABLE[r][c];

                    score += (val + posBonus);
                } else {
                    // Mirror for Black
                    let mr = 7 - r; // Mirror rank
                    let mc = c; // Mirror file (optional, tables usually symmetric)

                    if (piece.type === 'p') posBonus = PAWN_TABLE[mr][mc];
                    else if (piece.type === 'n') posBonus = KNIGHT_TABLE[mr][mc];
                    else if (piece.type === 'b') posBonus = BISHOP_TABLE[mr][mc];
                    else if (piece.type === 'r') posBonus = ROOK_TABLE[mr][mc];
                    else if (piece.type === 'q') posBonus = QUEEN_TABLE[mr][mc];
                    else if (piece.type === 'k') posBonus = KING_TABLE[mr][mc];

                    score -= (val + posBonus);
                }
            }
        }
        return score;
    }

    minimax(game, depth, alpha, beta, isMaximizing, playerColor) {
        this.nodesCount++;

        // Base Case
        if (depth === 0 || game.isGameOver()) {
            if (game.isCheckmate()) {
                // If isMaximizing is true, it means current turn (playerColor) got checkmated? 
                // No, isMaximizing=true means we ARE 'playerColor'. 
                // If it's our turn and we are checkmated, we lost. -> huge negative.
                // If it's opponents turn and they are checkmated, we won. -> huge positive.

                // Actually simply:
                // If turn is white and checkmate -> Black wins. Score = -20000.
                // If turn is black and checkmate -> White wins. Score = +20000.
                // Evaluation function returns (White - Black).

                const turn = game.turn();
                if (turn === 'w') return { score: -20000 + this.nodesCount }; // White lost
                else return { score: 20000 - this.nodesCount }; // Black lost (White won)
            }
            if (game.isDraw()) return { score: 0 };

            return { score: this.evaluate(game) };
        }

        const moves = game.moves({ verbose: true });

        // Simple Move Ordering: Captures first
        moves.sort((a, b) => {
            let scoreA = 0, scoreB = 0;
            if (a.captured) scoreA = 10 * (PIECE_VALUES[a.captured] || 1);
            if (b.captured) scoreB = 10 * (PIECE_VALUES[b.captured] || 1);
            return scoreB - scoreA;
        });

        let bestMove = null;

        if (isMaximizing) {
            let maxScore = -Infinity;
            for (const move of moves) {
                game.move(move);
                // Next level is minimizing
                const result = this.minimax(game, depth - 1, alpha, beta, false, playerColor);
                game.undo();

                if (result.score > maxScore) {
                    maxScore = result.score;
                    bestMove = move;
                }
                alpha = Math.max(alpha, maxScore);
                if (beta <= alpha) break; // Prune
            }
            return { score: maxScore, move: bestMove };
        } else {
            let minScore = Infinity;
            for (const move of moves) {
                game.move(move);
                // Next level is maximizing
                const result = this.minimax(game, depth - 1, alpha, beta, true, playerColor);
                game.undo();

                if (result.score < minScore) {
                    minScore = result.score;
                    bestMove = move;
                }
                beta = Math.min(beta, minScore);
                if (beta <= alpha) break; // Prune
            }
            return { score: minScore, move: bestMove };
        }
    }
}

module.exports = BotEngine;
