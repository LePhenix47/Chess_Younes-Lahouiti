import AttacksGenerator from "./attacks-generator.class";
import BaseMovesGenerator from "./base-moves-generator.class";
import BoardUtils from "./board-utils.class";
import ChessBoard, { AlgebraicNotation } from "./chess-board.class";
import Piece from "./piece.class";
import Player from "./player.class";
import RulesEngine from "./rules-engine.class";

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

    for (const piece of pieces.values()) {
      if (piece.color !== player.color) {
        continue;
      }

      const moves = MovesGenerator.generateMoveForPiece(piece, pieces, player);

      if (moves.length > 0) {
        result.push({ piece, moves });
      }
    }

    return result;
  }

  public static generateMoveForPiece = (
    piece: Piece,
    pieces: Map<AlgebraicNotation, Piece>,
    player: Player
  ): AlgebraicNotation[] => {
    switch (piece.type) {
      case "pawn": {
        const pawnMoves = BaseMovesGenerator.generatePawnMoves(
          piece as PawnPiece,
          pieces
        ) as AlgebraicNotation[];

        const pawnAttacks = AttacksGenerator.generatePawnAttacks(
          piece as PawnPiece,
          pieces
        );

        return [...pawnMoves, ...pawnAttacks];
      }

      case "knight": {
        const knightMoves = BaseMovesGenerator.generateKnightMoves(
          piece as KnightPiece,
          pieces
        ) as AlgebraicNotation[];
        return knightMoves;
      }

      case "bishop":
      case "rook":
      case "queen": {
        const slidingMoves = BaseMovesGenerator.generateSlidingMoves(
          piece as SlidingPiece,
          pieces
        ) as AlgebraicNotation[];
        return slidingMoves;
      }

      case "king": {
        const normalMoves = BaseMovesGenerator.generateKingMoves(
          piece as KingPiece,
          pieces
          // player
        ) as AlgebraicNotation[];

        const castleMoves: AlgebraicNotation[] = [];

        const kingSideCastle = RulesEngine.canCastle(
          "kingSide",
          player,
          pieces
        );
        if (kingSideCastle) {
          const targetSquare = player.color === "white" ? "g1" : "g8";
          castleMoves.push(targetSquare as AlgebraicNotation);
        }

        const queenSideCastle = RulesEngine.canCastle(
          "queenSide",
          player,
          pieces
        );
        if (queenSideCastle) {
          const targetSquare = player.color === "white" ? "c1" : "c8";
          castleMoves.push(targetSquare as AlgebraicNotation);
        }

        return [...normalMoves, ...castleMoves];
      }

      default:
        return [];
    }
  };
  public static generateLegalMovesForPlayer(
    chessBoardInstance: ChessBoard
  ): Map<Piece, AlgebraicNotation[]> {
    const { piecesMap: pieces } = chessBoardInstance;
    const player = chessBoardInstance.rivalPlayer;

    const legalMoves = new Map<Piece, AlgebraicNotation[]>();

    const playerPieces = [...pieces.values()].filter(
      (p) => p.color === player.color
    );

    const king = playerPieces.find((p): p is KingPiece => p.type === "king");

    const attackers = RulesEngine.getKingAttackers(king, pieces, player);
    const inCheck: boolean = attackers.length > 0;
    const pinnedInfo = RulesEngine.getPinnedPieces(king, pieces);
    const pinnedSet = new Set<Piece>(pinnedInfo.map((entry) => entry.pinned));

    const kingMoves = BaseMovesGenerator.generateKingMoves(
      king,
      pieces
    ) as AlgebraicNotation[];

    const attackedSquares = new Set<AlgebraicNotation>(
      AttacksGenerator.getAttackedSquaresByOpponent(player, pieces)
    );

    const filteredKingMoves = kingMoves.filter(
      (move) => !attackedSquares.has(move)
    );
    if (filteredKingMoves.length) {
      legalMoves.set(king, filteredKingMoves);
    }

    // Handle the case of multiple attackers:
    if (attackers.length >= 2) {
      // TODO: Handle the logic for multiple attackers or a double check where only the king can move
      return legalMoves; // only king moves allowed in the case of a double check or multiple attackers
    }

    // Handle the case of a single attacker
    const blockingSquares = new Set<AlgebraicNotation>();
    if (attackers.length === 1) {
      const attacker = attackers[0].attacker;
      const fileStep = Math.sign(
        Number(king.position.fileIndex) - Number(attacker.position.fileIndex)
      );
      const rankStep = Math.sign(
        Number(king.position.rankIndex) - Number(attacker.position.rankIndex)
      );

      let file = Number(attacker.position.fileIndex) + fileStep;
      let rank = Number(attacker.position.rankIndex) + rankStep;
      while (
        file !== Number(king.position.fileIndex) ||
        rank !== Number(king.position.rankIndex)
      ) {
        const square = BoardUtils.getAlgebraicNotationFromBoardIndices(
          file,
          rank
        );
        blockingSquares.add(square);
        file += fileStep;
        rank += rankStep;
      }

      blockingSquares.add(attacker.position.algebraicNotation);
    }

    // Generate legal moves for other pieces
    for (const piece of playerPieces) {
      if (piece === king) continue;

      const pseudoMoves = MovesGenerator.generateMoveForPiece(
        piece,
        pieces,
        player
      ) as AlgebraicNotation[];

      if (pinnedSet.has(piece)) {
        const pinEntry = pinnedInfo.find((entry) => entry.pinned === piece);
        const legalAlongPin = new Set(pinEntry.moves);
        const allowedMoves = pseudoMoves.filter((move) =>
          legalAlongPin.has(move)
        );
        if (
          allowedMoves.length &&
          (!inCheck || allowedMoves.some((m) => blockingSquares.has(m)))
        ) {
          legalMoves.set(piece, allowedMoves);
        }
      } else {
        if (!inCheck) {
          if (pseudoMoves.length) legalMoves.set(piece, pseudoMoves);
        } else {
          const filteredMoves = pseudoMoves.filter((m) =>
            blockingSquares.has(m)
          );
          if (filteredMoves.length) {
            legalMoves.set(piece, filteredMoves);
          }
        }
      }
    }

    return legalMoves;
  }

  /*
   * Miscellaneous methods
   */
}

export default MovesGenerator;
