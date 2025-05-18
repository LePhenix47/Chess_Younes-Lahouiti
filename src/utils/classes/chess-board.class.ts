import Piece, { PieceColor, PieceType } from "./piece.class";
import { clamp } from "@utils/functions/helper-functions/number.functions";
import BoardUtils from "./board-utils.class";
import ChessBoardController from "./chess-board-controller";
import RulesEngine from "./rules-engine.class";
import { KingPiece } from "./move-generator.class";
import Player from "./player.class";

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

    if (!RulesEngine.isMoveLegal(this, piece, to)) {
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

  private rejectMove = (piece: Piece, noAnimation: boolean): void => {
    console.error("Move rejected, putting piece back.");
    piece.moveTo(piece.position, noAnimation);
  };

  private isEnPassantCapture = (
    piece: Piece,
    from: AlgebraicNotation,
    to: AlgebraicNotation
  ): boolean => {
    const isPawn: boolean = piece.type === "pawn";
    const isDiagonalMove: boolean = from.charAt(0) !== to.charAt(0);
    const isToSquareEmpty: boolean = !this.piecesMap.has(to);
    const isEnPassantSquare: boolean = this.enPassantSquare === to;

    return isPawn && isDiagonalMove && isToSquareEmpty && isEnPassantSquare;
  };

  private getEnPassantCapturedSquare = (
    to: AlgebraicNotation,
    color: "white" | "black"
  ): AlgebraicNotation => {
    const toPos = BoardUtils.getBoardIndicesFromAlgebraicNotation(to);
    const fileIndex = Number(toPos.fileIndex);
    const rankIndex = Number(toPos.rankIndex);

    const captureRank = color === "white" ? rankIndex - 1 : rankIndex + 1;

    return BoardUtils.getAlgebraicNotationFromBoardIndices(
      fileIndex,
      captureRank
    );
  };

  private createMove = (
    piece: Piece,
    from: AlgebraicNotation,
    to: AlgebraicNotation
  ): Move => {
    if (this.isEnPassantCapture(piece, from, to)) {
      const capturedSquare: AlgebraicNotation = this.getEnPassantCapturedSquare(
        to,
        piece.color
      );
      const captured: Piece = this.piecesMap.get(capturedSquare);

      const isValidEnPassantTarget: boolean =
        captured?.type === "pawn" && captured.color !== piece.color;

      return {
        from,
        to,
        piece,
        capturedPiece: isValidEnPassantTarget ? captured : undefined,
        promotion: undefined,
      };
    }

    const captured = this.piecesMap.get(to);

    return {
      from,
      to,
      piece,
      capturedPiece: captured ?? undefined,
      promotion: undefined,
    };
  };

  private capturePiece = (targetPiece: Piece, noAnimation: boolean): void => {
    const animate: boolean = !noAnimation;
    targetPiece.removePiece({ animate }); // Remove from DOM
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

    // * ♔♖ Castling
    if (piece.isCastlingMove(from, to)) {
      this.handleCastling(move, noAnimation);
    }

    // * ♙♟ En passant (en croissant 🥐 🇫🇷)
    if (piece.isPawnDoubleAdvance(from, to)) {
      this.handleEnPassantMarking(to);
    } else {
      this.clearEnPassantMarking();
    }

    const selectedPieceLegalMoves = this.legalMovesForSelectedPiece || [];
    this.highlightLegalMoves(selectedPieceLegalMoves, "remove");

    this.recordMove(move);

    this.updateCheckStateFor(this.currentPlayer);
    this.updateCheckStateFor(this.rivalPlayer);

    this.switchTurnTo();

    console.log(this.enPassantSquare);
  };

  private handleCastling = (move: Move, noAnimation: boolean): void => {
    const { piece, from, to } = move;

    const { fileIndex: fromFileStr, rankIndex: fromRankStr } =
      BoardUtils.getBoardIndicesFromAlgebraicNotation(from);
    const { fileIndex: toFileStr } =
      BoardUtils.getBoardIndicesFromAlgebraicNotation(to);

    const fromFile = Number(fromFileStr);
    const toFile = Number(toFileStr);

    const fileDiff: number = toFile - fromFile;

    const [file, rank] = from;
    const isKingSide: boolean = fileDiff > 0;

    const rookFrom: AlgebraicNotation = (
      isKingSide ? `h${rank}` : `a${rank}`
    ) as AlgebraicNotation;
    const rookTo: AlgebraicNotation = (
      isKingSide ? `f${rank}` : `d${rank}`
    ) as AlgebraicNotation;

    const rook = this.piecesMap.get(rookFrom);
    if (!rook) {
      console.warn(`Rook not found at expected castling position: ${rookFrom}`);
      return;
    }

    this.movePiece(rook, rookTo, noAnimation);
    this.updateGameState(rookFrom, rookTo, rook);
  };

  private handleEnPassantMarking = (to: AlgebraicNotation): void => {
    const pos = BoardUtils.getBoardIndicesFromAlgebraicNotation(to);
    const file = Number(pos.fileIndex);
    const rank = Number(pos.rankIndex);

    // ? Only check adjacent pawns on the pawn's current rank
    const hasNotLandedAdjacentToEnemyPawn: boolean =
      !this.hasAdjacentOpponentPawn(file, rank, this.currentPlayer.color);
    if (hasNotLandedAdjacentToEnemyPawn) {
      this.enPassantSquare = null;
      return;
    }

    // ? + 1 ↓, - 1 ↑
    const enPassantRank =
      this.currentPlayer.color === "white" ? rank + 1 : rank - 1;

    this.enPassantSquare = BoardUtils.getAlgebraicNotationFromBoardIndices(
      file,
      enPassantRank
    );
  };

  private hasAdjacentOpponentPawn = (
    file: number,
    rank: number,
    playerColor: "white" | "black"
  ): boolean => {
    const adjacentFiles = [file - 1, file + 1];

    for (const adjFile of adjacentFiles) {
      if (!RulesEngine.isWithinBounds(adjFile, rank)) {
        // * skip out-of-board files
        continue;
      }

      const adjSquare = BoardUtils.getAlgebraicNotationFromBoardIndices(
        adjFile,
        rank
      );
      const piece = this.piecesMap.get(adjSquare);

      if (piece?.type === "pawn" && piece.color !== playerColor) {
        return true;
      }
    }

    return false;
  };

  private clearEnPassantMarking = (): void => {
    this.enPassantSquare = null;
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

  private updateCheckStateFor = (player: Player): void => {
    const isInCheck = RulesEngine.isKingInCheck(this.piecesMap, player);

    const king = ChessBoard.getPieceFromArray(
      this.piecesMap,
      "king",
      player.color
    );

    if (isInCheck) {
      this.highlightCheck(king.position.algebraicNotation);
    } else {
      this.clearCheckHighlightSquare();
    }

    this.updatePlayerState(player, isInCheck, {
      kingSide: player.canCastle.get("kingSide"),
      queenSide: player.canCastle.get("queenSide"),
    });
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
