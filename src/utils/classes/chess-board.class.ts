import Piece, { PieceColor, PieceType } from "./piece.class";
import { clamp } from "@utils/functions/helper-functions/number.functions";
import BoardUtils from "./board-utils.class";
import ChessBoardController, { LegalMoves } from "./chess-board-controller";
import RulesEngine from "./rules-engine.class";
import { KingPiece } from "./move-generator.class";
import Player from "./player.class";
import ZobristHasher from "./zobrist-hasher.class";

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

export type WinLossResult = "checkmate" | "resign" | "timeout";
export type DrawResult =
  | "draw-agreement"
  | "threefold-repetition"
  | "50-move-rule"
  | "stalemate"
  | "insufficient-checkmating-material"
  | "timeout-vs-insufficient-material";

export type PlayerMaterialCount = {
  kings: number;
  pawns: number;
  bishops: number;
  knights: number;
  rooks: number;
  queens: number;
  bishopColors: Set<"light" | "dark">;
};

class ChessBoard extends ChessBoardController {
  public static getPlayerMaterial = (
    piecesMap: Map<AlgebraicNotation, Piece>,
    playerColor: "white" | "black"
  ): PlayerMaterialCount => {
    const initialCounts = {
      kings: 0,
      pawns: 0,
      bishops: 0,
      knights: 0,
      rooks: 0,
      queens: 0,
    };

    const materialMap = new Map<keyof PlayerMaterialCount, number>(
      Object.entries(initialCounts) as [keyof PlayerMaterialCount, number][]
    );

    // Bishop colors stored separately
    const bishopColors = new Set<"light" | "dark">();

    for (const [square, piece] of piecesMap.entries()) {
      if (piece.color !== playerColor) continue;

      const key = `${piece.type}s` as keyof PlayerMaterialCount;

      // Increment count for piece type if it's tracked
      if (materialMap.has(key)) {
        const previousCount: number = materialMap.get(key) ?? 0;
        materialMap.set(key, previousCount + 1);
      }

      if (piece.type === "bishop") {
        const bishopSquareColor = BoardUtils.isSquareOfType(square, "light")
          ? "light"
          : "dark";
        bishopColors.add(bishopSquareColor);
      }
    }

    // Convert Map back to object
    const countsObject = Object.fromEntries(materialMap.entries()) as Omit<
      PlayerMaterialCount,
      "bishopColors"
    >;

    // Return full PlayerMaterialCount including bishopColors
    return {
      ...countsObject,
      bishopColors,
    };
  };

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

  public isGameOver = false;

  constructor(container: HTMLElement) {
    super(container);
  }

  /*
   * Methods for handling pieces
   */
  // TODO: not finished yet
  public updatePiecePosition = async (
    piece: Piece,
    rankIndex: number,
    fileIndex: number,
    noAnimation: boolean = false
  ): Promise<void> => {
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

    if (RulesEngine.canPromotePawn(piece, to)) {
      console.log("Pawn promotion available");
      const chosen = await this.showPromotionDialog(to, piece.color);
      if (!chosen) {
        console.log("Promotion cancelled");
        this.rejectMove(piece, noAnimation);
        return;
      }

      piece.promotePawn(chosen);
      move.promotion = chosen;
    }

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

    const captureRank = color === "white" ? rankIndex + 1 : rankIndex - 1;

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
      console.log("en passant,capturedSquare", capturedSquare);

      const captured: Piece = this.piecesMap.get(capturedSquare);

      const isValidEnPassantTarget: boolean =
        captured?.type === "pawn" && captured.color !== piece.color;

      console.log("en passant,captured", captured, isValidEnPassantTarget);

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

    const { algebraicNotation } = targetPiece.position;

    this.piecesMap.delete(algebraicNotation as AlgebraicNotation);

    this.clearOccupiedSquare(algebraicNotation);
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

    this.recordMoveAsHash();

    this.incrementHalfMoveClock(move);
    this.incrementFullMoveNumber();

    this.updateCheckStateFor(this.currentPlayer);
    this.updateCheckStateFor(this.rivalPlayer);

    this.switchTurnTo();
    this.updateAllLegalMovesForCurrentPlayer();

    this.checkGameEndConditions();
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

  private recordMoveAsHash = (): void => {
    const hash = ZobristHasher.computeHash(
      this.piecesMap,
      this.currentPlayer,
      this.enPassantSquare ?? null
    );

    const currentCount = this.positionRepetitionMap.get(hash) ?? 0;
    this.positionRepetitionMap.set(hash, currentCount + 1);
  };

  public incrementHalfMoveClock = (move: Move): void => {
    const isPawnMove: boolean =
      move.piece.type === "pawn" || Boolean(move.promotion);
    const isCapture: boolean = !!move.capturedPiece;

    if (isPawnMove || isCapture) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }
  };

  public incrementFullMoveNumber = (): void => {
    if (this.currentPlayer.color === "white") {
      return;
    }

    this.fullMoveNumber++;
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

  private checkGameEndConditions = (): void => {
    const currentPlayer: Player = this.currentPlayer;
    const legalMoves: LegalMoves = this.allLegalMovesForCurrentPlayer;

    // ♔ Checkmate
    if (RulesEngine.isCheckmate({ legalMoves, currentPlayer })) {
      const rivalPlayer: PieceColor = this.rivalPlayer.color;
      this.endGame({ winner: rivalPlayer, reason: "checkmate" });
      return;
    }
    // TODO for much later: Win-Loss by timeout or resign

    // 🤝 Stalemate
    if (RulesEngine.isStalemate({ legalMoves, currentPlayer })) {
      this.endGame({ winner: null, reason: "stalemate" });
      return;
    }

    // 📋 Threefold Repetition
    if (RulesEngine.isThreefoldRepetitionDraw(this.positionRepetitionMap)) {
      this.endGame({ winner: null, reason: "threefold-repetition" });
      return;
    }

    // ⏱️ Fifty-Move Rule
    if (RulesEngine.isFiftyMoveRuleDraw(this.halfMoveClock)) {
      this.endGame({ winner: null, reason: "50-move-rule" });
      return;
    }

    // 🪙 Insufficient Material
    if (RulesEngine.isInsufficientMaterialDraw(this.piecesMap)) {
      this.endGame({
        winner: null,
        reason: "insufficient-checkmating-material",
      });
      return;
    }

    // TODO: Handle other draw scenarios: timeout vs insufficient material and agreement
  };

  private endGame = ({
    winner,
    reason,
  }: {
    winner: PieceColor | null;
    reason: WinLossResult | DrawResult;
  }): void => {
    this.isGameOver = true;

    if (winner) {
      alert(`Game over! ${winner} wins by ${reason}`);
      console.log(
        `%c${winner} wins by checkmate !!!`,
        `background: ${winner}; color: ${
          winner === "white" ? "black" : "white"
        }; padding: 5px;`
      );
    } else {
      alert(`Game over! Draw by ${reason}`);
      console.log(
        `%cDraw by ${reason}`,
        "background: grey; color: black; padding: 5px;"
      );
    }

    // TODO: Disable interaction, show modal, highlight king, etc.
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
