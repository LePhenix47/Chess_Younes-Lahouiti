import BoardUtils from "./board-utils.class";
import { AlgebraicNotation } from "./chess-board.class";
import MovesGenerator, {
  DirectionKey,
  KingPiece,
  Offset,
  PawnPiece,
  SlidingPiece,
  SlidingPieceType,
} from "./move-generator.class";
import Piece from "./piece.class";
import Player from "./player.class";

abstract class BaseMovesGenerator {
  private static readonly cardinalDirectionOffsets = {
    /**
     * North direction, x = 0, y = 1
     */
    N: [0, 1],
    /**
     * South direction, x = 0, y = -1
     */
    S: [0, -1],
    /**
     * East direction, x = 1, y = 0
     */
    E: [1, 0],
    /**
     * West direction, x = -1, y = 0
     */
    W: [-1, 0],
    /**
     * NorthEast direction, x = 1, y = 1
     */
    NE: [1, 1],
    /**
     * NorthWest direction, x = -1, y = 1
     */
    NW: [-1, 1],
    /**
     * SouthEast direction, x = 1, y = -1
     */
    SE: [1, -1],
    /**
     * SouthWest direction, x = -1, y = -1
     */
    SW: [-1, -1],
  } as const;

  public static readonly directionOffsetsMap = new Map<DirectionKey, Offset>(
    Object.entries(BaseMovesGenerator.cardinalDirectionOffsets) as [
      DirectionKey,
      Offset
    ][]
  );

  public static readonly slidingDirectionsMap = new Map<
    SlidingPieceType,
    DirectionKey[]
  >(
    Object.entries({
      rook: ["N", "S", "E", "W"],
      bishop: ["NE", "NW", "SE", "SW"],
      queen: ["N", "S", "E", "W", "NE", "NW", "SE", "SW"],
    }) as [SlidingPieceType, DirectionKey[]][]
  );

  private static readonly knightOffsets = [
    [1, 2], // * →↑↑
    [2, 1], // * →→↑
    [2, -1], // * →→↓
    [1, -2], // * →↓↓
    [-1, -2], // * ←↓↓
    [-2, -1], // * ←←↓
    [-2, 1], // * ←←↑
    [-1, 2], // * ←↑↑
  ];

  public static generatePawnMoves = (
    piece: PawnPiece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    const legalMoves: AlgebraicNotation[] = [];
    const direction = piece.color === "white" ? -1 : 1;

    const file = Number(piece.position.fileIndex);
    const rank = Number(piece.position.rankIndex);

    const oneStepForward = BoardUtils.getAlgebraicNotationFromBoardIndices(
      file,
      rank + direction
    );
    const oneStepPiece = pieces.get(oneStepForward);

    if (!oneStepPiece) {
      legalMoves.push(oneStepForward);
    }

    const visualRank = 7 - rank;

    const isStartingRank: boolean =
      (piece.color === "white" && visualRank === 1) ||
      (piece.color === "black" && visualRank === 6);

    if (isStartingRank) {
      const twoStepsForward = BoardUtils.getAlgebraicNotationFromBoardIndices(
        file,
        rank + 2 * direction
      );
      const twoStepPiece = pieces.get(twoStepsForward);

      const isPathClear = !oneStepPiece && !twoStepPiece;

      if (isPathClear) {
        legalMoves.push(twoStepsForward);
      }
    }

    return legalMoves;
  };

  public static generateKnightMoves = (
    piece: Piece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    const moves: AlgebraicNotation[] = [];

    const { fileIndex, rankIndex } =
      BoardUtils.getBoardIndicesFromAlgebraicNotation(
        piece.position.algebraicNotation
      );

    for (const [dx, dy] of BaseMovesGenerator.knightOffsets) {
      const newFile = Number(fileIndex) + dx;
      const newRank = Number(rankIndex) + dy;

      if (newFile < 0 || newFile > 7 || newRank < 0 || newRank > 7) {
        continue;
      }

      const target = BoardUtils.getAlgebraicNotationFromBoardIndices(
        newFile,
        newRank
      );

      const targetPiece = pieces.get(target);

      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push(target);
      }
    }

    return moves;
  };

  public static generateKingMoves = (
    piece: KingPiece,
    pieces: Map<AlgebraicNotation, Piece>,
    player: Player
  ): AlgebraicNotation[] => {
    const legalMoves: AlgebraicNotation[] = [];

    const directionKeys = [
      ...Object.keys(this.cardinalDirectionOffsets),
    ] as DirectionKey[];

    const file = Number(piece.position.fileIndex);
    const rank = Number(piece.position.rankIndex);

    for (const directionKey of directionKeys) {
      const [dx, dy] =
        BaseMovesGenerator.directionOffsetsMap.get(directionKey)!;

      const newFile = file + dx;
      const newRank = rank + dy;

      if (newFile < 0 || newFile > 7 || newRank < 0 || newRank > 7) {
        continue;
      }

      const targetSquare = BoardUtils.getAlgebraicNotationFromBoardIndices(
        newFile,
        newRank
      );

      const targetPiece = pieces.get(targetSquare);
      const isEmptySquare: boolean = !targetPiece;

      // ? If the square is empty or has a piece of the opposite color → it's a legal move
      if (isEmptySquare || targetPiece.color !== piece.color) {
        legalMoves.push(targetSquare);
      }
    }

    return legalMoves;
  };

  // Private
  public static generateSlidingMoves = (
    piece: SlidingPiece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    const directionKeys = BaseMovesGenerator.slidingDirectionsMap.get(
      piece.type
    );
    if (!directionKeys) {
      return [];
    }

    const legalMoves: AlgebraicNotation[] = [];

    for (const directionKey of directionKeys) {
      const [dx, dy] =
        BaseMovesGenerator.directionOffsetsMap.get(directionKey)!;

      let file = Number(piece.position.fileIndex);
      let rank = Number(piece.position.rankIndex);

      while (true) {
        file += dx;
        rank += dy;

        // ? Skip if out of bounds
        if (file < 0 || file > 7 || rank < 0 || rank > 7) {
          break;
        }

        const targetSquare = BoardUtils.getAlgebraicNotationFromBoardIndices(
          file,
          rank
        );

        const potentialTargetPiece = pieces.get(targetSquare);
        const isOccupied = Boolean(potentialTargetPiece);

        // ? Square blocked by friendly piece → can't move further
        if (isOccupied && potentialTargetPiece.color === piece.color) {
          break;
        }

        // ? Square is either empty or blocked by enemy piece
        legalMoves.push(targetSquare);

        // ? Square blocked by enemy piece, we can take it but can't move further in this direction
        if (isOccupied && potentialTargetPiece.color !== piece.color) {
          break;
        }

        // ? Otherwise square is empty
      }
    }

    return legalMoves;
  };
}

export default BaseMovesGenerator;
