import BaseMovesGenerator from "./base-moves-generator.class";
import BoardUtils from "./board-utils.class";
import { AlgebraicNotation } from "./chess-board.class";
import MovesGenerator, {
  PawnPiece,
  SlidingPiece,
  KnightPiece,
  KingPiece,
} from "./move-generator.class";
import Piece from "./piece.class";
import Player from "./player.class";

abstract class AttacksGenerator {
  public static generatePawnAttacks = (
    piece: PawnPiece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    const legalAttacks: AlgebraicNotation[] = [];
    const direction = piece.color === "white" ? -1 : 1; // white moves up, black moves down

    const file = Number(piece.position.fileIndex);
    const rank = Number(piece.position.rankIndex);

    // TODO: Make checks to not call getAlgebraicNotationFromBoardIndices if out of bounds
    const leftSquare = file - 1;
    const rightSquare = file + 1;

    // * Diagonal left attack
    const attackLeft: AlgebraicNotation =
      BoardUtils.getAlgebraicNotationFromBoardIndices(
        leftSquare, // ? left square
        rank + direction // ? move up or down by one square
      );
    const attackPieceLeft: Piece = pieces.get(attackLeft);

    // ? Check if the diagonal left square is within bounds and has an enemy piece
    if (Boolean(attackPieceLeft) && attackPieceLeft.color !== piece.color) {
      legalAttacks.push(attackLeft);
    }

    // * Diagonal right attack
    const attackRight = BoardUtils.getAlgebraicNotationFromBoardIndices(
      rightSquare, // ? left square
      rank + direction // ? move up or down by one square
    );
    const attackPieceRight: Piece = pieces.get(attackRight);
    // ? Check if the diagonal right square is within bounds and has an enemy piece
    if (Boolean(attackPieceRight) && attackPieceRight.color !== piece.color) {
      legalAttacks.push(attackRight);
    }

    // TODO: Implement en passant logic.
    // TODO: Requires access to last move and move history to verify if an adjacent enemy pawn just moved two squares.

    return legalAttacks;
  };

  public static getExtendedAttackedSquaresForSlidingPiece = (
    piece: SlidingPiece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    const attackedSquares: AlgebraicNotation[] = [];

    const { fileIndex, rankIndex } = piece.position;

    const fileValue = Number(piece.position.fileIndex);
    const rankValue = Number(piece.position.rankIndex);

    for (const [_, [dx, dy]] of BaseMovesGenerator.directionOffsetsMap) {
      let file = fileValue + dx;
      let rank = rankValue + dy;
      let passedKing = false;

      while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        const square = BoardUtils.getAlgebraicNotationFromBoardIndices(
          file,
          rank
        );
        const target = pieces.get(square);

        if (target) {
          if (target.type === "king" && target.color !== piece.color) {
            // Don't include king's square, but mark what's behind
            passedKing = true;
            file += dx;
            rank += dy;
            continue;
          } else {
            // Any other piece ends the ray
            break;
          }
        }

        if (passedKing) {
          attackedSquares.push(square);
        }

        file += dx;
        rank += dy;
      }
    }

    return attackedSquares;
  };

  public static getAttackedSquaresByOpponent = (
    player: Player,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    const detailed = AttacksGenerator.getAttackedSquaresByOpponentDetailed(
      player,
      pieces
    );

    const attackedSquares = detailed.flatMap((entry) => entry.attacks);

    const uniqueAttackedSquares = new Set(attackedSquares);

    return [...uniqueAttackedSquares];
  };

  public static getAttackedSquaresByOpponentDetailed = (
    player: Player,
    pieces: Map<AlgebraicNotation, Piece>
  ): {
    piece: Piece;
    from: AlgebraicNotation;
    attacks: AlgebraicNotation[];
  }[] => {
    const results: {
      piece: Piece;
      from: AlgebraicNotation;
      attacks: AlgebraicNotation[];
    }[] = [];

    for (const [pos, piece] of pieces) {
      if (piece.color === player.color) {
        continue;
      }

      let attacks: AlgebraicNotation[] = [];

      switch (piece.type) {
        case "pawn": {
          attacks = AttacksGenerator.generatePawnAttacks(
            piece as PawnPiece,
            pieces
          );
          break;
        }

        case "knight": {
          attacks = BaseMovesGenerator.generateKnightMoves(
            piece as KnightPiece,
            pieces
          );
          break;
        }

        case "bishop":
        case "rook":
        case "queen": {
          attacks = BaseMovesGenerator.generateSlidingMoves(
            piece as SlidingPiece,
            pieces
          );
          break;
        }

        case "king": {
          attacks = BaseMovesGenerator.generateKingMoves(
            piece as KingPiece,
            pieces,
            player
          );
          break;
        }
      }

      results.push({ piece, from: pos, attacks });
    }

    return results;
  };
}

export default AttacksGenerator;
