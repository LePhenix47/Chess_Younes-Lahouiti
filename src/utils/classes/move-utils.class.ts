import ChessBoard, { AlgebraicNotation } from "./chess-board.class";
import Piece from "./piece.class";
import Player, { CastlingRights } from "./player.class";

export type SlidingPieceType = "rook" | "bishop" | "queen";

export type SlidingPiece = Piece & {
  type: SlidingPieceType;
};

type DirectionKey = "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW";
type Offset = readonly [number, number];

class MoveUtils {
  private static readonly directionOffsets = {
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
    Object.entries(MoveUtils.directionOffsets) as [DirectionKey, Offset][]
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

  // Public
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
    piece: Piece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    // TODO
  };

  private static generatePawnAttacks = (
    piece: Piece,
    pieces: Map<AlgebraicNotation, Piece>,
    onlyCaptures = false
  ): AlgebraicNotation[] => {
    MoveUtils.generatePawnMoves(piece, pieces);
    // TODO
  };

  private static generateKnightMoves = (
    piece: Piece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    // TODO
  };

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
          attacks = MoveUtils.generatePawnMoves(piece, pieces, true);
          break;
        }

        case "knight": {
          attacks = MoveUtils.generateKnightMoves(piece, pieces);
          break;
        }

        case "bishop":
        case "rook":
        case "queen": {
          attacks = MoveUtils.generateSlidingMoves(
            piece as SlidingPiece,
            pieces
          );
          break;
        }

        case "king": {
          attacks = MoveUtils.generateKingMoves(piece, pieces, player);
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

  private static canCastle = (
    side: "kingSide" | "queenSide",
    player: Player,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation | null => {
    //  TODO
  };

  private static generateKingMoves = (
    piece: Piece,
    pieces: Map<AlgebraicNotation, Piece>,
    player: Player
  ): AlgebraicNotation[] => {
    const legalMoves: AlgebraicNotation[] = [];

    const directionKeys = [
      ...Object.keys(this.directionOffsets),
    ] as DirectionKey[];

    const file = Number(piece.position.fileIndex);
    const rank = Number(piece.position.rankIndex);

    for (const directionKey of directionKeys) {
      const [dx, dy] = MoveUtils.directionOffsetsMap.get(directionKey)!;

      const newFile = file + dx;
      const newRank = rank + dy;

      if (newFile < 0 || newFile > 7 || newRank < 0 || newRank > 7) {
        continue;
      }

      const targetSquare = ChessBoard.getAlgebraicNotationFromBoardIndices(
        newFile,
        newRank
      );

      const targetPiece = pieces.get(targetSquare);

      // ? If the square is empty or has a piece of the opposite color → it's a legal move
      if (!targetPiece || targetPiece.color !== piece.color) {
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
    const directionKeys = MoveUtils.slidingDirectionsMap.get(piece.type);
    if (!directionKeys) {
      return [];
    }

    const legalMoves: AlgebraicNotation[] = [];

    for (const directionKey of directionKeys) {
      const [dx, dy] = MoveUtils.directionOffsetsMap.get(directionKey)!;

      let file = Number(piece.position.fileIndex);
      let rank = Number(piece.position.rankIndex);

      while (true) {
        file += dx;
        rank += dy;

        // ? Skip if out of bounds
        if (file < 0 || file > 7 || rank < 0 || rank > 7) {
          break;
        }

        const targetSquare = ChessBoard.getAlgebraicNotationFromBoardIndices(
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

export default MoveUtils;
