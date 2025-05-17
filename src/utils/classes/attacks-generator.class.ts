import BaseMovesGenerator from "./base-moves-generator.class";
import BoardUtils from "./board-utils.class";
import { AlgebraicNotation } from "./chess-board.class";
import MovesGenerator, {
  PawnPiece,
  SlidingPiece,
  KnightPiece,
  KingPiece,
  DirectionKey,
  Offset,
} from "./move-generator.class";
import Piece from "./piece.class";
import Player from "./player.class";
import RulesEngine, { PinnedPieceInfo } from "./rules-engine.class";

export type DetailedAttackResult = {
  direction: Offset; // The direction tuple (dx, dy)
  attacks: AlgebraicNotation[]; // List of attacked squares in that direction
};

export type OpponentAttackDetail = {
  piece: Piece;
  from: AlgebraicNotation;
  directions: DetailedAttackResult[]; // <--- Keep all info here
};

abstract class AttacksGenerator {
  public static generatePawnAttackSquares = (
    piece: PawnPiece,
    options?: Partial<{ detailed: boolean }>
  ): AlgebraicNotation[] | DetailedAttackResult[] => {
    const attackSquares: AlgebraicNotation[] = [];
    const attackSquaresDetailed: DetailedAttackResult[] = [];

    const newDy = piece.color === "white" ? -1 : 1; // Up for white, down for black
    const file = Number(piece.position.fileIndex);
    const rank = Number(piece.position.rankIndex);

    const leftDx: number = -1;
    const rightDx: number = 1;

    const newRank = rank + newDy;

    // Define bounds for attack checks
    const leftSquareFromFile = file + leftDx;
    const rightSquareFromFile = file + rightDx;

    // Top-left diagonal (relative to pawn perspective)
    if (RulesEngine.isWithinBounds(leftSquareFromFile, newRank)) {
      const attackSquare: AlgebraicNotation =
        BoardUtils.getAlgebraicNotationFromBoardIndices(
          leftSquareFromFile,
          newRank
        );
      if (options?.detailed) {
        attackSquaresDetailed.push({
          direction: [leftDx, newDy],
          attacks: [attackSquare],
        });
      } else {
        attackSquares.push(attackSquare);
      }
    }

    // Top-right diagonal (relative to pawn perspective)
    if (RulesEngine.isWithinBounds(rightSquareFromFile, newRank)) {
      const attackSquare: AlgebraicNotation =
        BoardUtils.getAlgebraicNotationFromBoardIndices(
          rightSquareFromFile,
          newRank
        );
      if (options?.detailed) {
        attackSquaresDetailed.push({
          direction: [rightDx, newDy],
          attacks: [attackSquare],
        });
      } else {
        attackSquares.push(attackSquare);
      }
    }

    return options?.detailed ? attackSquaresDetailed : attackSquares;
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
    knight: KnightPiece,
    options?: Partial<{ detailed: boolean }>
  ): AlgebraicNotation[] | DetailedAttackResult[] => {
    const simpleAttacks: AlgebraicNotation[] = [];
    const detailedAttacks: DetailedAttackResult[] = [];

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
      if (options?.detailed) {
        detailedAttacks.push({
          direction: [dx, dy],
          attacks: [targetSquare],
        });
      } else {
        simpleAttacks.push(targetSquare);
      }
    }

    return options?.detailed ? detailedAttacks : simpleAttacks;
  };

  // ? This method is used to restrict the king moves when in check
  public static getExtendedAttackedSquaresForSlidingPiece = (
    piece: SlidingPiece,
    pieces: Map<AlgebraicNotation, Piece>,
    options?: { detailed?: boolean }
  ): AlgebraicNotation[] | DetailedAttackResult[] => {
    const simpleAttacks: AlgebraicNotation[] = [];
    const detailedAttacks: DetailedAttackResult[] = [];

    const fileValue = Number(piece.position.fileIndex);
    const rankValue = Number(piece.position.rankIndex);

    const directions = BaseMovesGenerator.slidingDirectionsMap.get(piece.type)!;

    for (const dir of directions) {
      const [dx, dy] = BaseMovesGenerator.directionOffsetsMap.get(dir)!;

      let file = fileValue + dx;
      let rank = rankValue + dy;

      const directionSquares: AlgebraicNotation[] = [];

      while (RulesEngine.isWithinBounds(file, rank)) {
        const square = BoardUtils.getAlgebraicNotationFromBoardIndices(
          file,
          rank
        );
        const target = pieces.get(square);

        directionSquares.push(square);

        if (target) {
          if (target.type === "king" && target.color !== piece.color) {
            const beyondFile = file + dx;
            const beyondRank = rank + dy;

            if (RulesEngine.isWithinBounds(beyondFile, beyondRank)) {
              const beyondSquare =
                BoardUtils.getAlgebraicNotationFromBoardIndices(
                  beyondFile,
                  beyondRank
                );
              directionSquares.push(beyondSquare);
            }
          }
          break; // Stop scanning after hitting any piece
        }

        file += dx;
        rank += dy;
      }

      if (options?.detailed) {
        if (directionSquares.length) {
          detailedAttacks.push({
            direction: [dx, dy],
            attacks: directionSquares,
          });
        }
      } else {
        simpleAttacks.push(...directionSquares);
      }
    }

    return options?.detailed ? detailedAttacks : simpleAttacks;
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

  public static getAttackedSquaresByOpponent = (
    player: Player,
    pieces: Map<AlgebraicNotation, Piece>,
    opponentAttacksDetailed?: OpponentAttackDetail[]
  ): AlgebraicNotation[] => {
    const detailed =
      opponentAttacksDetailed ??
      AttacksGenerator.getAttackedSquaresByOpponentDetailed(player, pieces);
    const squares: AlgebraicNotation[] = detailed.flatMap((entry) =>
      entry.directions.flatMap((dir) => dir.attacks)
    );

    return [...new Set(squares)];
  };

  public static getAttackedSquaresByOpponentDetailed = (
    player: Player,
    pieces: Map<AlgebraicNotation, Piece>
  ): OpponentAttackDetail[] => {
    const results: OpponentAttackDetail[] = [];

    for (const [pos, piece] of pieces) {
      if (piece.color === player.color) {
        continue;
      }

      let directions: DetailedAttackResult[] = [];

      switch (piece.type) {
        case "pawn": {
          directions = AttacksGenerator.generatePawnAttackSquares(
            piece as PawnPiece,
            { detailed: true }
          ) as DetailedAttackResult[];
          break;
        }

        case "knight": {
          directions = AttacksGenerator.getKnightAttackingSquares(
            piece as KnightPiece,
            { detailed: true }
          ) as DetailedAttackResult[];
          break;
        }

        case "bishop":
        case "rook":
        case "queen": {
          directions =
            AttacksGenerator.getExtendedAttackedSquaresForSlidingPiece(
              piece as SlidingPiece,
              pieces,
              { detailed: true }
            ) as DetailedAttackResult[];
          break;
        }

        case "king": {
          const attacks = AttacksGenerator.getKingAttackingSquares(
            piece as KingPiece
          ) as AlgebraicNotation[];
          directions = attacks.map((square) => ({
            direction: [0, 0], // You can refine this if needed
            attacks: [square],
          }));
          break;
        }
      }

      results.push({ piece, from: pos, directions });
    }

    return results;
  };
}

export default AttacksGenerator;
