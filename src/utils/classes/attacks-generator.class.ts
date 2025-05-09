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
  public static generatePawnAttackSquares = (
    piece: PawnPiece
  ): AlgebraicNotation[] => {
    const attackSquares: AlgebraicNotation[] = [];

    const direction = piece.color === "white" ? -1 : 1; // Up for white, down for black
    const file = Number(piece.position.fileIndex);
    const rank = Number(piece.position.rankIndex);

    // Define bounds for attack checks
    const isFileInBoundsLeft = file - 1 >= 0;
    const isFileInBoundsRight = file + 1 < 8;
    const isRankInBounds = rank + direction >= 0 && rank + direction < 8;

    // Top-left diagonal (relative to pawn perspective)
    if (isFileInBoundsLeft && isRankInBounds) {
      attackSquares.push(
        BoardUtils.getAlgebraicNotationFromBoardIndices(
          file - 1,
          rank + direction
        )
      );
    }

    // Top-right diagonal (relative to pawn perspective)
    if (isFileInBoundsRight && isRankInBounds) {
      attackSquares.push(
        BoardUtils.getAlgebraicNotationFromBoardIndices(
          file + 1,
          rank + direction
        )
      );
    }

    return attackSquares;
  };

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

  // ? This method is used to restrict the king moves when in check
  public static getExtendedAttackedSquaresForSlidingPiece = (
    piece: SlidingPiece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    const attackedSquares: AlgebraicNotation[] = [];
    const fileValue = Number(piece.position.fileIndex);
    const rankValue = Number(piece.position.rankIndex);

    const directions = BaseMovesGenerator.slidingDirectionsMap.get(piece.type)!;

    for (const dir of directions) {
      const [dx, dy] = BaseMovesGenerator.directionOffsetsMap.get(dir)!;

      let file = fileValue + dx;
      let rank = rankValue + dy;

      while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        const square = BoardUtils.getAlgebraicNotationFromBoardIndices(
          file,
          rank
        );

        const target: Piece | null = pieces.get(square);

        if (target?.color === piece.color) {
          break;
        }

        attackedSquares.push(square); // Always add square as attacked

        if (target) {
          if (target.type === "king" && target.color !== piece.color) {
            // Passed enemy king — keep going one more square
            file += dx;
            rank += dy;
            if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
              const beyond = BoardUtils.getAlgebraicNotationFromBoardIndices(
                file,
                rank
              );
              attackedSquares.push(beyond);
            }
          }
          break; // Stop after hitting any piece
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
    console.log(
      detailed.flatMap((entry) => {
        return {
          piece: entry.piece,
          from: entry.from,
          attacks: entry.attacks,
        };
      })
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
          attacks = AttacksGenerator.generatePawnAttackSquares(
            piece as PawnPiece
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
