import AttacksGenerator from "./attacks-generator.class";
import BaseMovesGenerator from "./base-moves-generator.class";
import BoardUtils from "./board-utils.class";
import { AlgebraicNotation, ChessFile } from "./chess-board.class";
import MovesGenerator, {
  DirectionKey,
  KingPiece,
  Offset,
  SlidingPiece,
  SlidingPieceType,
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

    const attackedSquares = AttacksGenerator.getAttackedSquaresByOpponent(
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

    const attackedSquares = AttacksGenerator.getAttackedSquaresByOpponent(
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
    const pinnedPieces = [];

    const kingFile = Number(king.position.fileIndex);
    const kingRank = Number(king.position.rankIndex);

    for (const [dirKey, [dx, dy]] of BaseMovesGenerator.directionOffsetsMap) {
      let file = kingFile + dx;
      let rank = kingRank + dy;

      let potentialPinned: Piece | null = null;
      const legalMovesIfPinned: AlgebraicNotation[] = [];

      while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        const square = BoardUtils.getAlgebraicNotationFromBoardIndices(
          file,
          rank
        );
        const target = pieces.get(square);

        if (!target) {
          if (potentialPinned) {
            legalMovesIfPinned.push(square);
          }
          file += dx;
          rank += dy;
          continue;
        }

        const isAlly = target.color === king.color;

        if (isAlly) {
          if (potentialPinned) {
            // Second ally = not pinned
            break;
          }

          potentialPinned = target;
          file += dx;
          rank += dy;
          continue;
        }

        // Now target is enemy
        const isSliding = Piece.isType(target.type, [
          "rook",
          "bishop",
          "queen",
        ]);
        const validDirs = BaseMovesGenerator.slidingDirectionsMap.get(
          target.type as SlidingPieceType
        );

        const attacksAlongRay =
          isSliding && validDirs?.includes(dirKey as DirectionKey);

        if (potentialPinned && attacksAlongRay) {
          pinnedPieces.push({
            pinned: potentialPinned,
            by: target,
            direction: [dx, dy],
            moves: legalMovesIfPinned,
          });
        }

        break; // Any enemy piece ends the ray
      }
    }

    return pinnedPieces;
  };

  public static filterMovesDueToPin = (
    piece: Piece,
    pinnedData: {
      pinned: Piece;
      by: Piece;
      direction: Offset;
      moves: AlgebraicNotation[];
    }[],
    candidateMoves: AlgebraicNotation[]
  ): AlgebraicNotation[] => {
    const pinInfo = pinnedData.find((pin) => pin.pinned === piece);
    if (!pinInfo) return candidateMoves;

    return candidateMoves.filter((move) => pinInfo.moves.includes(move));
  };
}

export default RulesEngine;
