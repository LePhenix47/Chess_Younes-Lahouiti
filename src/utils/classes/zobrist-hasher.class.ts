import BoardUtils from "./board-utils.class";
import type { AlgebraicNotation } from "../types/chess.types";
import Piece, { PieceColor } from "./piece.class";
import Player from "./player.class";

type CastlingBothColors = `${PieceColor}-${"kingSide" | "queenSide"}`;

abstract class ZobristHasher {
  private static pieceSquareKeys: Map<string, bigint>;
  private static sideToMoveKey: bigint;
  private static castlingRightsKeys: Map<CastlingBothColors, bigint>;
  private static enPassantFileKeys: Map<string, bigint>;

  // Initialize all keys once
  public static initialize = (): void => {
    if (ZobristHasher.pieceSquareKeys) {
      // ? Already initialized, do nothing
      return;
    }

    ZobristHasher.pieceSquareKeys = new Map();
    ZobristHasher.castlingRightsKeys = new Map();
    ZobristHasher.enPassantFileKeys = new Map();

    ZobristHasher.sideToMoveKey = ZobristHasher.random64BitBigInt();

    const pieceTypes = [
      "king",
      "queen",
      "rook",
      "bishop",
      "knight",
      "pawn",
    ] as const;
    const colors = ["white", "black"] as const;
    const files = [...BoardUtils.reverseFileMap.keys()] as const;
    const ranks = [...BoardUtils.reverseRankMap.keys()] as const;

    const castlingRightsForBothColors: CastlingBothColors[] = [
      "white-kingSide",
      "white-queenSide",
      "black-kingSide",
      "black-queenSide",
    ] as const;

    colorsLoop: for (const color of colors) {
      pieceTypesLoop: for (const pieceType of pieceTypes) {
        filesLoop: for (const file of files) {
          ranksLoop: for (const rank of ranks) {
            const key = `${color}-${pieceType}-${file}${rank}`;
            ZobristHasher.pieceSquareKeys.set(
              key,
              ZobristHasher.random64BitBigInt()
            );
          }
        }
      }
    }

    // Generate keys for castling rights
    for (const right of castlingRightsForBothColors) {
      ZobristHasher.castlingRightsKeys.set(
        right,
        ZobristHasher.random64BitBigInt()
      );
    }

    // Generate keys for en passant files
    for (const file of files) {
      ZobristHasher.enPassantFileKeys.set(
        file,
        ZobristHasher.random64BitBigInt()
      );
    }
  };

  private static random64BitBigInt = (): bigint => {
    // Generate a random 32-bit unsigned integer
    const random32bit = () => BigInt(Math.floor(Math.random() * 2 ** 32));

    let high = random32bit(); // upper 32 bits
    high = high << 32n;

    const low = random32bit(); // lower 32 bits

    /*
     * Combine high and low 32-bit parts into a full 64-bit bigint.
     *
     * 'high' has been shifted left by 32 bits, so its lower 32 bits are zero:
        HHHH HHHH HHHH HHHH 0000 0000 0000 0000 (upper 32 bits)
     *
     * 'low' contains the lower 32 bits:
        0000 0000 0000 0000 LLLL LLLL LLLL LLLL (lower 32 bits)
     *
     * Using the bitwise OR operator (|) merges these two parts without overlap,
     * resulting in a complete 64-bit value:
        HHHH HHHH HHHH HHHH LLLL LLLL LLLL LLLL
     *
     * This works because the shifted 'high' fills the upper half, and 'low' fills the lower half,
     * so their bits do not interfere.
     */
    return high | low;
  };

  public static computeHash = (
    piecesMap: Map<AlgebraicNotation, Piece>,
    currentPlayer: Player,
    enPassantSquare: AlgebraicNotation | null
  ): bigint => {
    ZobristHasher.initialize(); // ensure keys are ready

    let hash: bigint = 0n;

    // 1. Pieces on squares
    for (const [square, piece] of piecesMap.entries()) {
      // ? ex: "white-king-a1" or "black-pawn-h8"
      const key = `${piece.color}-${piece.type}-${square}`;

      const pieceKey = ZobristHasher.pieceSquareKeys.get(key);
      if (!pieceKey) {
        console.warn(`Missing Zobrist key for piece: ${key}`);
        continue;
      }

      hash ^= pieceKey;
    }

    // 2. Side to move (XOR only if black to move)
    if (currentPlayer.color === "black") {
      hash ^= ZobristHasher.sideToMoveKey;
    }

    // 3. Castling rights
    for (const [right, canCastle] of currentPlayer.canCastle.entries()) {
      if (!canCastle) {
        continue;
      }

      // ? Right is like "white-kingSide" or "black-queenSide"
      const castlingRightKey: CastlingBothColors = `${currentPlayer.color}-${right}`;
      const castlingKeyValue: bigint =
        ZobristHasher.castlingRightsKeys.get(castlingRightKey);
      if (!castlingKeyValue) {
        console.warn(`Missing Zobrist key for castling right: ${right}`);
        continue;
      }

      hash ^= castlingKeyValue;
    }

    // 4. En passant file
    if (enPassantSquare) {
      const [file, rank] = enPassantSquare; // e.g. "e4" => "e"
      const enPassantKey: bigint = ZobristHasher.enPassantFileKeys.get(file);
      if (!enPassantKey) {
        console.warn(`Missing Zobrist key for en passant file: ${file}`);
      } else {
        hash ^= enPassantKey;
      }
    }

    return hash;
  };
}

export default ZobristHasher;
