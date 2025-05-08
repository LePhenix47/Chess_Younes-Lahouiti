import BoardUtils from "./board-utils.class";
import { AlgebraicNotation, ChessFile } from "./chess-board.class";
import MovesGenerator, {
  KingPiece,
  Offset,
  SlidingPiece,
} from "./move-generator.class";
import Piece, { PieceColor } from "./piece.class";
import Player from "./player.class";

type CastleSquares = `${"c" | "d" | "e" | "f" | "g"}${"1" | "8"}`;

abstract class RulesEngine {
  public static isKingInCheck = (
    pieces: Map<AlgebraicNotation, Piece>,
    player: Player
  ): boolean => {
    const piecesArray: Piece[] = [...pieces.values()];
    const king = piecesArray.find((p): p is KingPiece => {
      return p.type === "king" && p.color === player.color;
    });

    const attackedSquares = MovesGenerator.getAttackedSquaresByOpponent(
      player,
      pieces
    );

    return attackedSquares.includes(king.position.algebraicNotation);
  };

  public static getKingAttackers = (
    king: KingPiece,
    pieces: Map<AlgebraicNotation, Piece>,
    rival: Player
  ): { attacker: Piece; from: AlgebraicNotation }[] => {
    if (king.color === rival.color) {
      throw new Error("King and rival cannot be of the same color");
    }

    const attackers: { attacker: Piece; from: AlgebraicNotation }[] = [];

    for (const [pos, piece] of pieces) {
      if (piece.color === king.color) {
        continue;
      }

      const attacks: AlgebraicNotation[] = MovesGenerator.generateMoveForPiece(
        piece,
        pieces,
        rival
      );

      if (attacks.includes(king.position.algebraicNotation)) {
        attackers.push({ attacker: piece, from: pos });
      }
    }

    return attackers;
  };

  private static getCastleFileRank = (
    side: "kingSide" | "queenSide",
    color: PieceColor,
    includeCurrentSquare: boolean = false
  ) => {
    const rank = color === "white" ? "1" : "8";

    const files: ChessFile[] =
      side === "kingSide"
        ? ["f", "g"] // ? Squares the king touches: between, and destination
        : ["c", "d"];

    if (includeCurrentSquare) {
      files.push("e");
      files.sort();
    }

    return {
      rank,
      files,
    };
  };

  private static getCastleDangerSquares = (
    side: "kingSide" | "queenSide",
    color: PieceColor,
    includeCurrentSquare: boolean = false
  ): CastleSquares[] => {
    const { files, rank } = RulesEngine.getCastleFileRank(
      side,
      color,
      includeCurrentSquare
    );

    const squares = files.map((file) => `${file}${rank}` as CastleSquares);

    return squares;
  };

  public static canCastle = (
    side: "kingSide" | "queenSide",
    player: Player,
    pieces: Map<AlgebraicNotation, Piece>
  ): [
    { piece: KingPiece; position: AlgebraicNotation },
    { piece: SlidingPiece; position: AlgebraicNotation }
  ] => {
    if (!player.canCastle) {
      return null;
    }

    const { color } = player;
    const rank = color === "white" ? "1" : "8"; // Rank is based on color
    const kingStart = `e${rank}` as AlgebraicNotation;
    const rookStart: AlgebraicNotation =
      side === "queenSide" ? `a${rank}` : `h${rank}`;

    const king = pieces.get(kingStart) as KingPiece;
    const rook = pieces.get(rookStart) as SlidingPiece;

    if (
      !Boolean(king) ||
      !Boolean(rook) ||
      king.type !== "king" ||
      rook.type !== "rook"
    ) {
      return null;
    }

    if (king.hasMoved || rook.hasMoved) {
      return null;
    }

    const pathSquaresArray = RulesEngine.getCastleDangerSquares(
      side,
      player.color
    );

    const attackedSquares = MovesGenerator.getAttackedSquaresByOpponent(
      player,
      pieces
    );

    // 1. Check for attacking danger
    for (const pathSquare of pathSquaresArray) {
      if (attackedSquares.includes(pathSquare) || pieces.has(pathSquare)) {
        return null;
      }
    }

    return [
      { piece: king, position: kingStart },
      { piece: rook, position: rookStart },
    ];
  };

  public static getPinnedPieces = (
    king: KingPiece,
    pieces: Map<AlgebraicNotation, Piece>
  ): {
    pinned: Piece;
    by: Piece;
    direction: Offset;
    moves: AlgebraicNotation[];
  }[] => {
    const pinnedPieces: {
      pinned: Piece;
      by: Piece;
      direction: Offset;
      moves: AlgebraicNotation[];
    }[] = [];

    const kingFile: number = Number(king.position.fileIndex);
    const kingRank: number = Number(king.position.rankIndex);

    // Iterate over all cardinal directions (N, NE, E, etc.)
    for (const cardinalDirection of MovesGenerator.directionOffsetsMap) {
      const [directionKey, [dx, dy]] = cardinalDirection;

      let foundAlly: Piece | null = null;
      let file = kingFile + dx;
      let rank = kingRank + dy;

      // * Iterate over squares in the current direction
      while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        const targetSquare: AlgebraicNotation =
          BoardUtils.getAlgebraicNotationFromBoardIndices(file, rank);

        const targetPiece: Piece | null = pieces.get(targetSquare);
        const isKing: boolean = targetPiece === king;
        if (isKing) {
          break;
        }

        const isEmptySquare: boolean = !targetPiece;
        if (isEmptySquare) {
          // Continue scanning if the square is empty
          file += dx;
          rank += dy;
          continue;
        }

        if (targetPiece.color === king.color) {
          // If we find an ally, make sure there's no second ally in the line
          if (foundAlly) {
            break;
          }
          foundAlly = targetPiece;
          file += dx;
          rank += dy;
          continue;
        }

        // Enemy piece
        const isRookDir: boolean = ["N", "S", "E", "W"].includes(directionKey);
        const isBishopDir: boolean = ["NE", "NW", "SE", "SW"].includes(
          directionKey
        );

        const canPin: boolean =
          (targetPiece.type === "rook" && isRookDir) ||
          (targetPiece.type === "bishop" && isBishopDir) ||
          targetPiece.type === "queen";

        if (!canPin || !foundAlly) {
          break;
        }

        // * Pin detected !!!! Now track valid moves for the pinned piece
        const validMoves: AlgebraicNotation[] = [];
        let moveFile = file + dx;
        let moveRank = rank + dy;

        // * Check for available moves along the direction
        while (moveFile >= 0 && moveFile < 8 && moveRank >= 0 && moveRank < 8) {
          const moveSquare: AlgebraicNotation =
            BoardUtils.getAlgebraicNotationFromBoardIndices(moveFile, moveRank);

          const movePiece: Piece | null = pieces.get(moveSquare);
          if (movePiece) {
            // If it's an enemy piece, we can stop
            break;
          }

          validMoves.push(moveSquare);

          moveFile += dx;
          moveRank += dy;
        }

        // * Add the pinned piece with its available moves
        pinnedPieces.push({
          pinned: foundAlly,
          by: targetPiece,
          direction: [dx, dy],
          moves: validMoves,
        });

        break;
      }
    }

    return pinnedPieces;
  };
}

export default RulesEngine;
