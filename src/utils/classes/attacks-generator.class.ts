import BaseMovesGenerator from "./base-moves-generator.class";
import BoardUtils from "./board-utils.class";
import { AlgebraicNotation } from "./chess-board.class";
import MovesGenerator, {
  PawnPiece,
  SlidingPiece,
  KnightPiece,
  KingPiece,
  DirectionKey,
} from "./move-generator.class";
import Piece from "./piece.class";
import Player from "./player.class";
import RulesEngine, { PinnedPieceInfo } from "./rules-engine.class";

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

  public static getLegalPawnCaptures = (
    piece: PawnPiece,
    pieces: Map<AlgebraicNotation, Piece>,
    pinConstraint: PinnedPieceInfo | undefined
  ): AlgebraicNotation[] => {
    if (pinConstraint) {
      const [pinDx, pinDy] = pinConstraint.direction;

      // Vertical Pin or Horizontal Pin: No attacks allowed
      const isHorizontalPin = pinDx === 0;
      const isVerticalPin = pinDy === 0;
      if (isHorizontalPin || isVerticalPin) {
        return [];
      }
    }

    const legalAttacks: AlgebraicNotation[] = [];
    // ? white moves up, black moves, but due to board coords and CSS-JS coords mismatch on the Y axis → it's inverted
    const newDy = piece.color === "white" ? -1 : 1;

    const file = Number(piece.position.fileIndex);
    const rank = Number(piece.position.rankIndex);

    const leftDx: number = -1;
    const rightDx: number = 1;

    const leftSquareFromFile = file + leftDx;
    const rightSquareFromFile = file + rightDx;

    const [pinDx, pinDy] = pinConstraint?.direction || [];

    const newRank = rank + newDy;

    const canAttackLeft: boolean =
      RulesEngine.isWithinBounds(leftSquareFromFile, newRank) &&
      // ? If there's no pin OR the direction of the pin is colinear with the left square → can attack
      (!pinConstraint ||
        (pinConstraint &&
          MovesGenerator.areColinear(leftDx, newDy, pinDx, pinDy)));

    if (canAttackLeft) {
      // * Diagonal left attack
      const attackLeft: AlgebraicNotation =
        BoardUtils.getAlgebraicNotationFromBoardIndices(
          leftSquareFromFile, // ? left square
          newRank // ? move up or down by one square
        );
      const attackPieceLeft: Piece = pieces.get(attackLeft);

      // ? Check if the diagonal left square is within bounds and has an enemy piece
      if (Boolean(attackPieceLeft) && attackPieceLeft.color !== piece.color) {
        legalAttacks.push(attackLeft);
      }
    }

    const canAttackRight: boolean =
      RulesEngine.isWithinBounds(rightSquareFromFile, newRank) &&
      // ? If there's no pin OR the direction of the pin is colinear with the right square → can attack
      (!pinConstraint ||
        (pinConstraint &&
          MovesGenerator.areColinear(rightDx, newDy, pinDx, pinDy)));

    if (canAttackRight) {
      // * Diagonal right attack
      const attackRight = BoardUtils.getAlgebraicNotationFromBoardIndices(
        rightSquareFromFile, // ? right square
        newRank // ? move up or down by one square
      );
      const attackPieceRight: Piece = pieces.get(attackRight);
      // ? Check if the diagonal right square is within bounds and has an enemy piece
      if (Boolean(attackPieceRight) && attackPieceRight.color !== piece.color) {
        legalAttacks.push(attackRight);
      }
    }

    // TODO: Implement en passant logic.
    // TODO: Requires access to last move and move history to verify if an adjacent enemy pawn just moved two squares.

    return legalAttacks;
  };

  public static getKnightAttackingSquares = (
    knight: KnightPiece
  ): AlgebraicNotation[] => {
    const attackedSquares: AlgebraicNotation[] = [];

    const { fileIndex, rankIndex } =
      BoardUtils.getBoardIndicesFromAlgebraicNotation(
        knight.position.algebraicNotation
      );

    for (const [dx, dy] of BaseMovesGenerator.knightOffsets) {
      const newFile = Number(fileIndex) + dx;
      const newRank = Number(rankIndex) + dy;

      if (!RulesEngine.isWithinBounds(newFile, newRank)) {
        continue;
      }

      const targetSquare = BoardUtils.getAlgebraicNotationFromBoardIndices(
        newFile,
        newRank
      );

      // ? Push regardless of whether a friendly piece is there or not
      attackedSquares.push(targetSquare);
    }

    return attackedSquares;
  };

  // ? This method is used to restrict the king moves when in check
  public static getExtendedAttackedSquaresForSlidingPiece = (
    piece: SlidingPiece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    const attackedSquares: AlgebraicNotation[] = [];
    const fileValue = Number(piece.position.fileIndex);
    const rankValue = Number(piece.position.rankIndex);

    // Get the movement directions based on piece type (rook, bishop, queen)
    const directions = BaseMovesGenerator.slidingDirectionsMap.get(piece.type)!;

    for (const dir of directions) {
      const [dx, dy] = BaseMovesGenerator.directionOffsetsMap.get(dir)!;

      let file = fileValue + dx;
      let rank = rankValue + dy;

      while (RulesEngine.isWithinBounds(file, rank)) {
        const square = BoardUtils.getAlgebraicNotationFromBoardIndices(
          file,
          rank
        );
        const target = pieces.get(square);

        attackedSquares.push(square);

        if (target) {
          // Stop scanning unless it's an enemy king
          if (target.type === "king" && target.color !== piece.color) {
            const beyondFile = file + dx;
            const beyondRank = rank + dy;

            if (RulesEngine.isWithinBounds(beyondFile, beyondRank)) {
              const beyondSquare =
                BoardUtils.getAlgebraicNotationFromBoardIndices(
                  beyondFile,
                  beyondRank
                );
              attackedSquares.push(beyondSquare);
            }
          }

          break; // Stop in all cases after encountering any piece
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

  public static getKingAttackingSquares = (
    king: KingPiece
  ): AlgebraicNotation[] => {
    const attackedSquares: AlgebraicNotation[] = [];

    const directionKeys = [
      ...Object.keys(BaseMovesGenerator.cardinalDirectionOffsets),
    ] as DirectionKey[];

    const file = Number(king.position.fileIndex);
    const rank = Number(king.position.rankIndex);

    for (const directionKey of directionKeys) {
      const [dx, dy] =
        BaseMovesGenerator.directionOffsetsMap.get(directionKey)!;

      const newFile = file + dx;
      const newRank = rank + dy;

      if (!RulesEngine.isWithinBounds(newFile, newRank)) {
        continue;
      }

      const targetSquare = BoardUtils.getAlgebraicNotationFromBoardIndices(
        newFile,
        newRank
      );

      // * Include all squares regardless of what's on them
      attackedSquares.push(targetSquare);
    }

    return attackedSquares;
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
          attacks = AttacksGenerator.getKnightAttackingSquares(
            piece as KnightPiece
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
          attacks = AttacksGenerator.getKingAttackingSquares(
            piece as KingPiece
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
