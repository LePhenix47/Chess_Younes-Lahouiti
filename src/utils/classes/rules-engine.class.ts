import AttacksGenerator from "./attacks-generator.class";
import BaseMovesGenerator from "./base-moves-generator.class";
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

    for (const [pos, piece] of pieces) {
      if (piece.color === king.color) {
        continue;
      }

      if (!["rook", "bishop", "queen"].includes(piece.type)) {
        continue;
      }

      const extendedAttacks =
        AttacksGenerator.getExtendedAttackedSquaresForSlidingPiece(
          piece as SlidingPiece,
          pieces
        );

      if (!extendedAttacks.includes(king.position.algebraicNotation)) {
        continue;
      }

      const kingFile = Number(king.position.fileIndex);
      const kingRank = Number(king.position.rankIndex);

      // Between piece and king, we must find *exactly one* ally piece
      const fileStep = Math.sign(
        Number(kingFile) - Number(piece.position.fileIndex)
      );
      const rankStep = Math.sign(
        Number(kingRank) - Number(piece.position.rankIndex)
      );

      const pinnedPath: AlgebraicNotation[] = [];
      let file = Number(piece.position.fileIndex) + fileStep;
      let rank = Number(piece.position.rankIndex) + rankStep;

      let foundAlly: Piece | null = null;

      while (file !== kingFile || rank !== kingRank) {
        const square = BoardUtils.getAlgebraicNotationFromBoardIndices(
          file,
          rank
        );
        const interveningPiece = pieces.get(square);

        if (interveningPiece) {
          if (interveningPiece.color !== king.color) {
            foundAlly = null;
            break; // enemy in the way — can't be a pin
          }

          if (foundAlly) {
            foundAlly = null;
            break; // more than one ally in the way — no pin
          }

          foundAlly = interveningPiece;
        } else {
          pinnedPath.push(square);
        }

        file += fileStep;
        rank += rankStep;
      }

      if (foundAlly) {
        pinnedPieces.push({
          pinned: foundAlly,
          by: piece,
          direction: [fileStep, rankStep],
          moves: pinnedPath,
        });
      }
    }

    return pinnedPieces;
  };
}

export default RulesEngine;
