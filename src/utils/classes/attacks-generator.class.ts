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
    const fileValue = Number(piece.position.fileIndex);
    const rankValue = Number(piece.position.rankIndex);

    for (const [
      cardinalDirection,
      [dx, dy],
    ] of BaseMovesGenerator.directionOffsetsMap) {
      let file = fileValue + dx;
      let rank = rankValue + dy;
      let passedKing = false; // Flag to indicate if we've passed the enemy king

      while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        const square: AlgebraicNotation =
          BoardUtils.getAlgebraicNotationFromBoardIndices(file, rank);
        const target: Piece = pieces.get(square);

        if (target) {
          if (target.type === "king" && target.color !== piece.color) {
            // If we hit an enemy king, mark that we've passed the king
            passedKing = true;

            // Move one square beyond the king and check if it's a valid square
            file += dx;
            rank += dy;

            // If the square is within bounds, add it as an attacked square
            if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
              const nextSquare =
                BoardUtils.getAlgebraicNotationFromBoardIndices(file, rank);
              attackedSquares.push(nextSquare);
            }

            break; // Stop after processing the square beyond the king
          } else if (target.color === piece.color) {
            // If we hit a friendly piece, stop sliding in this direction
            break;
          } else {
            // If we hit an enemy piece (not a king), stop sliding
            break;
          }
        }

        // If we haven't passed the king yet, add this square to the attack list
        if (!passedKing) {
          attackedSquares.push(square);
        }

        // Continue sliding in the current direction
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
          ) as AlgebraicNotation[];
          break;
        }

        case "bishop":
        case "rook":
        case "queen": {
          attacks = AttacksGenerator.getExtendedAttackedSquaresForSlidingPiece(
            piece as SlidingPiece,
            pieces
          );
          break;
        }

        case "king": {
          attacks = BaseMovesGenerator.generateKingMoves(
            piece as KingPiece,
            pieces
            // player
          ) as AlgebraicNotation[];
          break;
        }
      }

      results.push({ piece, from: pos, attacks });
    }

    return results;
  };
}

export default AttacksGenerator;
