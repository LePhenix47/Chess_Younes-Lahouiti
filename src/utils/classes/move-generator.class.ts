import AttacksGenerator, {
  OpponentAttackDetail,
} from "./attacks-generator.class";
import BaseMovesGenerator from "./base-moves-generator.class";
import ChessBoardController from "./chess-board-controller";
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

type GenerateLegalMovesParams = {
  piecesMap: Map<AlgebraicNotation, Piece>;
  player: Player;
  enPassantSquare?: AlgebraicNotation | null;
  opponentAttacksDetailed?: OpponentAttackDetail[];
};

abstract class MovesGenerator {
  public static generateLegalMoves = ({
    piecesMap,
    player,
    enPassantSquare = null,
    opponentAttacksDetailed,
  }: GenerateLegalMovesParams): {
    piece: Piece;
    moves: AlgebraicNotation[];
  }[] => {
    const king = ChessBoard.getPieceFromArray(
      piecesMap,
      "king",
      player.color
    ) as KingPiece;

    const attacks =
      opponentAttacksDetailed ??
      AttacksGenerator.getAttackedSquaresByOpponentDetailed(player, piecesMap);

    const pseudoLegalMoves = MovesGenerator.generatePseudoLegalMoves(
      piecesMap,
      player,
      attacks
    );

    if (!player.inCheck) {
      // ? Not in check → All pseudo-legal moves are valid
      return pseudoLegalMoves;
    }

    const attackingPieces = RulesEngine.getAttackingPiecesAndPathToKing(
      king,
      player,
      piecesMap,
      attacks
    );

    // ? Double or triple check → only king can move
    const moreThanOnePieceAttackingKing: boolean = attackingPieces.length > 1;
    if (moreThanOnePieceAttackingKing) {
      console.log("One piece attacking", attackingPieces);

      const kingOnlyMoves = pseudoLegalMoves.filter(
        ({ piece }) => piece.type === "king"
      );

      return kingOnlyMoves;
    }

    const { pathToKing, attackingPiece: attacker } = attackingPieces[0];
    const blockingSquares = new Set(pathToKing);

    console.log("Multiple pieces attacking", attackingPieces);

    // ? Only allow moves that capture attacker or block check
    const legalMoves: { piece: Piece; moves: AlgebraicNotation[] }[] = [];

    for (const { piece, moves } of pseudoLegalMoves) {
      if (piece.type === "king") {
        legalMoves.push({ piece, moves });
        continue;
      }

      const filteredMoves: AlgebraicNotation[] = [];

      for (const move of moves) {
        const isCapture: boolean = move === attacker.position.algebraicNotation;
        const isBlock: boolean = blockingSquares.has(move);

        if (isCapture || isBlock) {
          filteredMoves.push(move);
        }
      }

      if (filteredMoves.length > 0) {
        legalMoves.push({ piece, moves: filteredMoves });
      }
    }

    return legalMoves;
  };

  /*
   * Move generation methods
   */
  public static generatePseudoLegalMoves = (
    pieces: Map<AlgebraicNotation, Piece>,
    player: Player,
    opponentAttacksDetailed?: OpponentAttackDetail[]
  ): { moves: AlgebraicNotation[]; piece: Piece }[] => {
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

    const opponentAttackingSquares =
      AttacksGenerator.getAttackedSquaresByOpponent(
        player,
        pieces,
        opponentAttacksDetailed
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
        opponentAttackingSquares,
        potentialPinConstraint
      );

      if (moves.length > 0) {
        result.push({ piece, moves });
      }
    }

    return result;
  };

  public static generateMoveForPiece = (
    piece: Piece,
    pieces: Map<AlgebraicNotation, Piece>,
    player: Player,
    opponentAttackingSquares: AlgebraicNotation[],
    pinConstraint?: PinnedPieceInfo
  ): AlgebraicNotation[] => {
    switch (piece.type) {
      case "pawn": {
        const pawnMoves = BaseMovesGenerator.generatePawnMoves(
          piece as PawnPiece,
          pieces,
          pinConstraint
        ) as AlgebraicNotation[];

        const pawnAttacks = AttacksGenerator.getLegalPawnCaptures(
          piece as PawnPiece,
          pieces,
          pinConstraint
        );

        return [...pawnMoves, ...pawnAttacks];
      }

      case "knight": {
        const knightMoves = BaseMovesGenerator.generateKnightMoves(
          piece as KnightPiece,
          pieces,
          pinConstraint
        ) as AlgebraicNotation[];
        return knightMoves;
      }

      case "bishop":
      case "rook":
      case "queen": {
        const slidingMoves = BaseMovesGenerator.generateSlidingMoves(
          piece as SlidingPiece,
          pieces,
          pinConstraint
        ) as AlgebraicNotation[];
        return slidingMoves;
      }

      case "king": {
        let kingMoves = BaseMovesGenerator.generateKingMoves(
          piece as KingPiece,
          pieces,
          player,
          { includeCastling: true }
        ) as AlgebraicNotation[];

        kingMoves = RulesEngine.filterIllegalKingMoves(
          kingMoves,
          opponentAttackingSquares
        );

        return kingMoves;
      }

      default:
        return [];
    }
  };

  /**
   * Returns true if the first direction (dx1, dy1) is aligned with the second direction (dx2, dy2).
   *
   * The mathematical check for colinearity is:
   *   `dx1 / dx2 === dy1 / dy2`
   *
   * To avoid division (especially division by zero), we use the equivalent cross-multiplication form:
   *   `dx1 * dy2 === dy1 * dx2`
   * If this condition fails, the directions are not colinear.
   */
  public static areColinear = (
    dx1: number,
    dy1: number,
    dx2: number,
    dy2: number
  ) => {
    return dx1 * dy2 === dy1 * dx2;
  };

  /*
   * Miscellaneous methods
   */
}

export default MovesGenerator;
