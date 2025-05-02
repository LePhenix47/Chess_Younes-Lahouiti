import BoardUtils from "./board-utils.class";
import ChessBoard, {
  AlgebraicNotation,
  ChessFile,
  ChessRank,
} from "./chess-board.class";
import Piece, { PieceColor } from "./piece.class";
import Player, { CastlingRights } from "./player.class";

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

type DirectionKey = "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW";
type Offset = readonly [number, number];

type CastleSquares = `${"c" | "d" | "e" | "f" | "g"}${"1" | "8"}`;

class MovesGenerator {
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

  private static readonly directionOffsetsMap = new Map<DirectionKey, Offset>(
    Object.entries(MovesGenerator.cardinalDirectionOffsets) as [
      DirectionKey,
      Offset
    ][]
  );

  private static readonly slidingDirectionsMap = new Map<
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
    [1, 2],
    [2, 1],
    [2, -1],
    [1, -2],
    [-1, -2],
    [-2, -1],
    [-2, 1],
    [-1, 2],
  ];

  /*
   * Move generation methods
   */
  public static generatePseudoLegalMoves = (
    pieces: Map<AlgebraicNotation, Piece>,
    player: Player
  ): { moves: AlgebraicNotation[]; piece: Piece }[] => {
    // TODO
  };

  public static generateMoveForPiece = (
    piece: Piece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    // TODO
  };

  private static generatePawnMoves = (
    piece: PawnPiece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    const legalMoves: AlgebraicNotation[] = [];
    const direction = piece.color === "white" ? 1 : -1;

    const file = Number(piece.position.fileIndex);
    const rank = 7 - Number(piece.position.rankIndex);

    const oneStepForward = BoardUtils.getAlgebraicNotationFromBoardIndices(
      file,
      rank + direction
    );
    const oneStepPiece = pieces.get(oneStepForward);

    if (!oneStepPiece) {
      legalMoves.push(oneStepForward);
    }

    const isStartingRank =
      (piece.color === "white" && rank === 1) ||
      (piece.color === "black" && rank === 6);

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

  private static generatePawnAttacks = (
    piece: PawnPiece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    const legalAttacks: AlgebraicNotation[] = [];
    const direction = piece.color === "white" ? 1 : -1; // white moves up, black moves down

    const file = Number(piece.position.fileIndex);
    const rank = 7 - Number(piece.position.rankIndex);

    // * Diagonal left attack
    const attackLeft: AlgebraicNotation =
      BoardUtils.getAlgebraicNotationFromBoardIndices(
        file - 1, // ? left square
        rank + direction // ? move up or down by one square
      );
    const attackPieceLeft: Piece = pieces.get(attackLeft);

    // ? Check if the diagonal left square is within bounds and has an enemy piece
    if (Boolean(attackPieceLeft) && attackPieceLeft.color !== piece.color) {
      legalAttacks.push(attackLeft);
    }

    // * Diagonal right attack
    const attackRight = BoardUtils.getAlgebraicNotationFromBoardIndices(
      file + 1, // ? left square
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

  private static generateKnightMoves = (
    piece: Piece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    const moves: AlgebraicNotation[] = [];

    const { fileIndex, rankIndex } =
      BoardUtils.getBoardIndicesFromAlgebraicNotation(
        piece.position.algebraicNotation
      );

    for (const [dx, dy] of MovesGenerator.knightOffsets) {
      const newFile = Number(fileIndex) + dx;
      const newRank = 7 - Number(rankIndex) + dy;

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

  private static generateKingMoves = (
    piece: KingPiece,
    pieces: Map<AlgebraicNotation, Piece>,
    player: Player
  ): AlgebraicNotation[] => {
    const legalMoves: AlgebraicNotation[] = [];

    const directionKeys = [
      ...Object.keys(this.cardinalDirectionOffsets),
    ] as DirectionKey[];

    const file = Number(piece.position.fileIndex);
    const rank = 7 - Number(piece.position.rankIndex);

    for (const directionKey of directionKeys) {
      const [dx, dy] = MovesGenerator.directionOffsetsMap.get(directionKey)!;

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
  private static generateSlidingMoves = (
    piece: SlidingPiece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    const directionKeys = MovesGenerator.slidingDirectionsMap.get(piece.type);
    if (!directionKeys) {
      return [];
    }

    const legalMoves: AlgebraicNotation[] = [];

    for (const directionKey of directionKeys) {
      const [dx, dy] = MovesGenerator.directionOffsetsMap.get(directionKey)!;

      let file = Number(piece.position.fileIndex);
      let rank = 7 - Number(piece.position.rankIndex);

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

  /*
   * Miscellaneous methods
   */
  public static getAttackedSquaresByOpponent = (
    player: Player,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    const attackedSquaresSet = new Set<AlgebraicNotation>();

    for (const piece of pieces.values()) {
      // ? Ignore own pieces
      if (piece.color === player.color) {
        continue;
      }

      let attacks: AlgebraicNotation[] = [];

      switch (piece.type) {
        case "pawn": {
          attacks = MovesGenerator.generatePawnAttacks(
            piece as PawnPiece,
            pieces
          );
          break;
        }

        case "knight": {
          attacks = MovesGenerator.generateKnightMoves(
            piece as KnightPiece,
            pieces
          );
          break;
        }

        case "bishop":
        case "rook":
        case "queen": {
          attacks = MovesGenerator.generateSlidingMoves(
            piece as SlidingPiece,
            pieces
          );
          break;
        }

        case "king": {
          attacks = MovesGenerator.generateKingMoves(
            piece as KingPiece,
            pieces,
            player
          );
          break;
        }

        default:
          break;
      }

      for (const square of attacks) {
        attackedSquaresSet.add(square);
      }
    }

    return [...attackedSquaresSet];
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
    const { files, rank } = MovesGenerator.getCastleFileRank(
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

    const pathSquaresArray = MovesGenerator.getCastleDangerSquares(
      side,
      player.color
    );

    const attackedSquares = MovesGenerator.getAttackedSquaresByOpponent(
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
}

export default MovesGenerator;
