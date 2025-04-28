import { AlgebraicNotation } from "./chess-board.class";
import Piece from "./piece.class";

class MoveUtils {
  // Public
  public static generatePseudoLegalMoves = (
    piece: Piece,
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    // TODO
  };

  // Private
  private static generateSlidingMoves = (
    piece: Piece,
    directions: [number, number][],
    pieces: Map<AlgebraicNotation, Piece>
  ): AlgebraicNotation[] => {
    // TODO
  };
}

export default MoveUtils;
