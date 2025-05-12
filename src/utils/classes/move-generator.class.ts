import AttacksGenerator from "./attacks-generator.class";
import BaseMovesGenerator from "./base-moves-generator.class";
import BoardController from "./board-controller";
import BoardUtils from "./board-utils.class";
import ChessBoard, { AlgebraicNotation } from "./chess-board.class";
import Piece from "./piece.class";
import Player from "./player.class";
import RulesEngine, { PinnedPieceInfo } from "./rules-engine.class";

export type SlidingPieceType = "rook" | "bishop" | "queen";

export type SlidingPiece = Piece & {
  type: SlidingPieceType;
};

export type PawnPiece = Piece & {
  type: "pawn";
};

export type KnightPiece = Piece & {
  type: "knight";
};

export type KingPiece = Piece & {
  type: "king";
};

export type DirectionKey = "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW";
export type Offset = readonly [number, number];

abstract class MovesGenerator {
  /*
   * Move generation methods
   */
  public static generatePseudoLegalMoves(
    pieces: Map<AlgebraicNotation, Piece>,
    player: Player
  ): { moves: AlgebraicNotation[]; piece: Piece }[] {
    const result: { moves: AlgebraicNotation[]; piece: Piece }[] = [];

    const king = ChessBoard.getPieceFromArray(
      pieces,
      "king",
      player.color
    ) as KingPiece;

    const pinnedPieces: PinnedPieceInfo[] = RulesEngine.getPinnedPieces(
      king,
      pieces
    );

    for (const piece of pieces.values()) {
      if (piece.color !== player.color) {
        continue;
      }

      const potentialPinConstraint: PinnedPieceInfo | undefined =
        pinnedPieces.find((pinnedInfo) => {
          return Piece.arePiecesTheSame(pinnedInfo.pinned, piece);
        });

      console.log(potentialPinConstraint, piece);

      const moves = MovesGenerator.generateMoveForPiece(
        piece,
        pieces,
        player,
        potentialPinConstraint
      );

      if (moves.length > 0) {
        result.push({ piece, moves });
      }
    }

    return result;
  }

  public static generateMoveForPiece = (
    piece: Piece,
    pieces: Map<AlgebraicNotation, Piece>,
    player: Player,
    pinConstraint?: PinnedPieceInfo
  ): AlgebraicNotation[] => {
    /**
 // ! Temporary code: ↓
*/

    const pinnedPieces: PinnedPieceInfo[] = RulesEngine.getPinnedPieces(
      ChessBoard.getPieceFromArray(pieces, "king", player.color) as KingPiece,
      pieces
    );

    const potentialPinConstraint: PinnedPieceInfo | undefined =
      pinnedPieces.find((pinnedInfo) => {
        return Piece.arePiecesTheSame(pinnedInfo.pinned, piece);
      });

    /**
 // ! Temporary code: ↑
*/

    switch (piece.type) {
      case "pawn": {
        const pawnMoves = BaseMovesGenerator.generatePawnMoves(
          piece as PawnPiece,
          pieces,
          potentialPinConstraint
        ) as AlgebraicNotation[];

        const pawnAttacks = AttacksGenerator.getLegalPawnCaptures(
          piece as PawnPiece,
          pieces,
          potentialPinConstraint
        );

        return [...pawnMoves, ...pawnAttacks];
      }

      case "knight": {
        const knightMoves = BaseMovesGenerator.generateKnightMoves(
          piece as KnightPiece,
          pieces,
          potentialPinConstraint
        ) as AlgebraicNotation[];
        return knightMoves;
      }

      case "bishop":
      case "rook":
      case "queen": {
        const slidingMoves = BaseMovesGenerator.generateSlidingMoves(
          piece as SlidingPiece,
          pieces,
          potentialPinConstraint
        ) as AlgebraicNotation[];
        return slidingMoves;
      }

      case "king": {
        const normalMoves = BaseMovesGenerator.generateKingMoves(
          piece as KingPiece,
          pieces,
          player,
          { includeCastling: true }
        ) as AlgebraicNotation[];

        return normalMoves;
      }

      default:
        return [];
    }
  };

  /*
   * Miscellaneous methods
   */
}

export default MovesGenerator;
