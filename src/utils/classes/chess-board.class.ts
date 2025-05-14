import Piece, { PieceColor, PieceType } from "./piece.class";
import { clamp } from "@utils/functions/helper-functions/number.functions";
import BoardUtils from "./board-utils.class";
import ChessBoardController from "./chess-board-controller";

export type ChessFile = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type ChessRank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

export type AlgebraicNotation = `${ChessFile}${ChessRank}`;

export type Move = {
  from: AlgebraicNotation;
  to: AlgebraicNotation;
  piece: Piece;
  capturedPiece?: Piece;
  promotion?: PieceType;
};

class ChessBoard extends ChessBoardController {
  public static getPieceFromArray = (
    pieces: Map<AlgebraicNotation, Piece> | Piece[],
    type: PieceType,
    color: PieceColor,
    algebraicNotation?: AlgebraicNotation
  ): Piece | null => {
    if (pieces instanceof Map) {
      pieces = [...pieces.values()];
    }

    const piece: Piece | null =
      pieces.find((p) => {
        const isSamePieceType = p.type === type && p.color === color;

        if (algebraicNotation) {
          return (
            isSamePieceType &&
            p.position.algebraicNotation === algebraicNotation
          );
        }

        return isSamePieceType;
      }) || null;

    return piece;
  };

  constructor(container: HTMLElement) {
    super(container);
  }

  /*
   * Methods for handling pieces
   */
  // TODO: not finished yet
  public updatePiecePosition = (
    piece: Piece,
    rankIndex: number,
    fileIndex: number,
    noAnimation: boolean = false
  ): void => {
    const to: AlgebraicNotation = this.resolveTargetSquare(
      rankIndex,
      fileIndex
    );
    const from: AlgebraicNotation = piece.position.algebraicNotation;

    // ? Cannot skip turn
    const pieceHasNotMoved: boolean = from === to;
    if (pieceHasNotMoved) {
      this.rejectMove(piece, noAnimation);
      return;
    }

    if (!this.isMoveLegal(piece, to)) {
      this.rejectMove(piece, noAnimation);
      return;
    }

    const move: Move = this.createMove(piece, from, to);
    this.applyMove(move, noAnimation);
    this.clearSelectedPiece(from);
  };

  private resolveTargetSquare = (
    rankIndex: number,
    fileIndex: number
  ): AlgebraicNotation => {
    const clampedRank = clamp(0, rankIndex, 7);
    const clampedFile = clamp(0, fileIndex, 7);

    const file = BoardUtils.fileMap.get(clampedFile)!;
    const rank = BoardUtils.rankMap.get(clampedRank)!;

    return `${file}${rank}` as AlgebraicNotation;
  };

  private isMoveLegal = (piece: Piece, to: AlgebraicNotation): boolean => {
    if (piece.color !== this.currentTurn) {
      console.error("Not your turn! Cannot move piece.");
      return false;
    }

    const target: Piece = this.piecesMap.get(to);
    const isFriendlyFire: boolean = target?.color === piece.color;
    if (isFriendlyFire) {
      console.warn("Square occupied by friendly piece.");
      return false;
    }

    const isPseudoIllegalMove: boolean =
      !this.legalMovesForSelectedPiece?.includes(to);
    if (isPseudoIllegalMove) {
      console.warn("Illegal pseudo-move!");
      return false;
    }

    return true;
  };

  private rejectMove = (piece: Piece, noAnimation: boolean): void => {
    console.error("Move rejected, putting piece back.");
    piece.moveTo(piece.position, noAnimation);
  };

  private createMove = (
    piece: Piece,
    from: AlgebraicNotation,
    to: AlgebraicNotation
  ): Move => {
    const captured = this.piecesMap.get(to);
    return {
      from,
      to,
      piece,
      capturedPiece: captured,
      promotion: undefined,
    };
  };

  private capturePiece = (targetPiece: Piece, noAnimation: boolean): void => {
    const animate: boolean = !noAnimation;
    targetPiece.delete({ animate }); // Remove from DOM
    this.piecesMap.delete(
      targetPiece.position.algebraicNotation as AlgebraicNotation
    ); // Remove from internal map
  };

  private applyMove = (move: Move, noAnimation: boolean): void => {
    // TODO: Remove this when done testing
    this.clearTest();
    const { from, to, piece, capturedPiece } = move;

    if (capturedPiece) {
      this.capturePiece(capturedPiece, noAnimation);
    }

    this.movePiece(piece, to, noAnimation);

    this.updateGameState(from, to, piece);

    const selectedPieceLegalMoves = this.legalMovesForSelectedPiece || [];
    this.highlightLegalMoves(selectedPieceLegalMoves, "remove");

    this.recordMove(move);

    this.switchTurnTo();
  };

  private movePiece = (
    piece: Piece,
    to: AlgebraicNotation,
    noAnimation: boolean
  ): void => {
    const newPosition = BoardUtils.getBoardIndicesFromAlgebraicNotation(to);
    piece.moveTo(newPosition, noAnimation);
  };

  private updateGameState = (
    from: AlgebraicNotation,
    to: AlgebraicNotation,
    piece: Piece
  ): void => {
    // * Remove the piece from the old position
    this.piecesMap.delete(from);
    this.clearOccupiedSquare(from);

    // * Set the piece at the new position
    this.piecesMap.set(to, piece);
    this.setOccupiedSquare(to, piece);
  };

  private recordMove = (move: Move): void => {
    this.playedMoves = [...this.playedMoves, move];
  };

  /**
   * Checks and updates the repetition count for the current position.
   * This should be called *after* a move is made and the FEN is updated.
   * Only the relevant portion of FEN (piece placement, side to move,
   * castling rights, and en passant square) is used for repetition detection.
   *
   * Once a position has occurred 3 times, it's a draw by repetition.
   */
  private readonly updateRepetitionTracker = (fen: string): void => {
    // TODO: Extract repetition key from FEN and track its count in a Map<string, number>
    // If the count reaches 3, trigger draw-by-repetition logic
  };

  // Placeholder for FEN and PGN methods
  public loadFen = (fen: string): void => {};
  // Placeholder for FEN and PGN methods
  public loadPgn = (pgn: string): void => {};
}

export default ChessBoard;
