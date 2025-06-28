import Piece, { FenPieceType, PieceColor, PieceType } from "./piece.class";
import BoardUtils from "./board-utils.class";
import ChessBoardController, { LegalMoves } from "./chess-board-controller";
import RulesEngine from "./rules-engine.class";
import Player from "./player.class";
import NotationUtils from "./notation-utils.class";
import DragManager from "./drag-manager.class";

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

  protected readonly uiDragManager: DragManager;

  constructor(container: HTMLElement) {
    super(container);

    this.generateBoard();

    this.uiDragManager = new DragManager(container);

    this.uiDragManager.setCallbacks({
      onDragStart: this.handleDragStart,
      onDragMove: this.handleDragMove,
      onDrop: this.handleDrop,
      onPieceClick: this.handlePieceClick,
      onEmptySquareClick: this.handleEmptySquareClick,
    });
  }

  public setPerspective = (color: PieceColor): void => {
    this.boardPerspective = color;

    const isBlacksPerspective = color === "black";
    const angle: number = isBlacksPerspective ? 180 : 0;
    this.uiDragManager.setAngle(angle);

    this.container.classList.toggle("black-perspective", isBlacksPerspective);
  };

  private handleDragStart = (pieceElement: HTMLElement) => {
    this.selectPiece(pieceElement);
  };

  private handleDragMove = (
    pieceElement: HTMLElement,
    pieceDragX: number,
    pieceDragY: number,
    hoveringSquare: AlgebraicNotation | null
  ) => {
    const draggedPiece = this.getPieceFromElement(pieceElement);
    if (draggedPiece.color !== this.currentTurn) {
      console.error("It's not your turn! Cannot drag piece.");
      return;
    }

    this.dragPiece(draggedPiece, pieceDragX, pieceDragY);

    this.clearDragHoveredSquare();
    if (!hoveringSquare) {
      return;
    }

    this.highlightDragHoveredSquare(hoveringSquare);
  };

  private handleDrop = (
    pieceElement: HTMLElement,
    fromSquare: AlgebraicNotation,
    toSquare: AlgebraicNotation,
    isInsideBoard: boolean
  ) => {
    this.clearDragHoveredSquare();

    console.log("custom:pointer-drag-drop");
    const draggedPiece: Piece = this.getPieceFromElement(pieceElement);

    if (!isInsideBoard) {
      draggedPiece.moveTo(draggedPiece.position, false); // `noAnimation = true`
      this.clearSelectedPiece();
      return;
    }

    const { rankIndex, fileIndex } =
      BoardUtils.getBoardIndicesFromAlgebraicNotation(toSquare);

    console.log(toSquare);

    this.updatePiecePosition(
      draggedPiece,
      Number(rankIndex),
      Number(fileIndex),
      true
    );

    this.clearSelectedPiece();
  };

  private handlePieceClick = (pieceElement: HTMLElement) => {
    console.log("custom:pointer-click");
    // TODO: BODGE FIX
    pieceElement.classList.remove("dragging");

    const draggedPiece: Piece = this.getPieceFromElement(pieceElement);

    // * 1. No piece is selected yet
    if (!this.selectedPiece) {
      this.selectPiece(pieceElement);
    }
    // * 2. Re-selected same piece → clear selection
    else if (draggedPiece === this.selectedPiece) {
      this.clearSelectedPiece();
    }
    // * 3. Clicked another of my own pieces → switch selection
    else if (draggedPiece.color === this.selectedPiece.color) {
      this.selectPiece(pieceElement);
    }
    // * 4. Has selected piece and clicked another of the opponent's pieces → try to move
    else if (
      this.selectedPiece &&
      draggedPiece.color !== this.selectedPiece.color
    ) {
      this.updatePiecePosition(
        this.selectedPiece,
        Number(draggedPiece.position.rankIndex),
        Number(draggedPiece.position.fileIndex),
        false
      );
    }
  };

  private handleEmptySquareClick = (square: AlgebraicNotation) => {
    if (!this.selectedPiece) {
      // * Clicked an empty square but no piece is selected → do nothing
      return;
    }

    const { fileIndex, rankIndex } =
      BoardUtils.getBoardIndicesFromAlgebraicNotation(square);

    this.updatePiecePosition(
      this.selectedPiece,
      Number(rankIndex),
      Number(fileIndex),
      false
    );
    this.clearSelectedPiece();
  };

  public readonly dragPiece = (
    piece: Piece,
    offsetX: number,
    offsetY: number
  ) => {
    // Turn check: Ensure it's the current player's turn before dragging
    if (piece.color !== this.currentTurn) {
      piece.moveTo(piece.position, true);
      console.error("It's not your turn! Cannot drag piece.");
      return;
    }

    piece.drag(offsetX, offsetY);
  };

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
    const to: AlgebraicNotation =
      BoardUtils.getAlgebraicNotationFromBoardIndices(fileIndex, rankIndex);

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

  private rejectMove = (piece: Piece, noAnimation: boolean): void => {
    console.error("Move rejected, putting piece back.");
    piece.moveTo(piece.position, noAnimation);
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
    const previousLegalMoves = this.allLegalMovesForCurrentPlayer;

    const { from, to, piece, capturedPiece } = move;
    this.clearLastMove();
    this.markLastMove(from, to);

    if (capturedPiece) {
      this.capturePiece(capturedPiece, noAnimation);
    }

    this.movePiece(piece, to, noAnimation);
    this.updateGameState(from, to, piece);

    // * ♔♖ Castling
    const isCastlingMove = piece.isCastlingMove(from, to);

    if (isCastlingMove) {
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

    this.updateCheckStateFor(this.currentPlayer, piece, from);
    this.updateCheckStateFor(this.rivalPlayer);

    this.switchTurnTo();
    this.updateAllLegalMovesForCurrentPlayer();

    this.checkGameEndConditions();

    const fen = NotationUtils.generateFenFromPosition({
      currentTurn: this.currentTurn,
      enPassantSquare: this.enPassantSquare,
      halfMoveClock: this.halfMoveClock,
      fullMoveNumber: this.fullMoveNumber,
      piecesMap: this.piecesMap,
      castlingRights: this.getAllCastlingRights(),
    });

    console.log("fen", fen);

    console.log(this.currentPlayer);

    const castingSide = isCastlingMove
      ? BoardUtils.getCastlingSide(from, to, piece.color)
      : null;

    const currentPgn = NotationUtils.recordPgnMove({
      castle: castingSide,
      isCheck: this.currentPlayer.inCheck,
      legalMoves: previousLegalMoves,
      move,
      isCheckmate: this.isGameOver === "checkmate",
    });

    this.pgnMoveText.push(currentPgn);
    const currPgn = this.pgnMoveText.join(" ");

    console.log("PGN:", currPgn);
    console.log("formatted:", NotationUtils.formatPgnMoves(this.pgnMoveText));
  };

  private updateCheckStateFor = (
    player: Player,
    movedPiece?: Piece,
    from?: AlgebraicNotation
  ): void => {
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

    if (movedPiece && from && Piece.isType(movedPiece.type, ["king", "rook"])) {
      this.removeCastlingRights(player, movedPiece, from);

      console.log({ player });

      console.log(
        "white:",
        this.whitePlayer.canCastle,
        "black:",
        this.blackPlayer.canCastle
      );
    }

    this.updatePlayerState(player, isInCheck, {
      kingSide: player.canCastle.get("kingSide"),
      queenSide: player.canCastle.get("queenSide"),
    });
  };

  private checkGameEndConditions = (): void => {
    const currentPlayer: Player = this.currentPlayer;
    const legalMoves: LegalMoves = this.allLegalMovesForCurrentPlayer;

    // * Win-Loss scenarios
    // ? ♔ Checkmate
    if (RulesEngine.isCheckmate({ legalMoves, currentPlayer })) {
      const rivalPlayer: PieceColor = this.rivalPlayer.color;
      this.endGame({ winner: rivalPlayer, reason: "checkmate" });
      return;
    }
    // TODO for much later: Win-Loss by timeout or resign

    // * Draw scenarios
    // ? ✖ Stalemate
    if (RulesEngine.isStalemate({ legalMoves, currentPlayer })) {
      this.endGame({ winner: null, reason: "stalemate" });
    }
    // ? 📋 Threefold Repetition
    else if (
      RulesEngine.isThreefoldRepetitionDraw(this.positionRepetitionMap)
    ) {
      this.endGame({ winner: null, reason: "threefold-repetition" });
    }
    // ? ⏱️ Fifty-Move Rule
    else if (RulesEngine.isFiftyMoveRuleDraw(this.halfMoveClock)) {
      this.endGame({ winner: null, reason: "50-move-rule" });
    }
    // ? 🪙 Insufficient Material
    else if (RulesEngine.isInsufficientMaterialDraw(this.piecesMap)) {
      this.endGame({
        winner: null,
        reason: "insufficient-checkmating-material",
      });
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
    this.isGameOver = reason;

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

  public loadFen = (fen: string): void => {
    console.log("loadFen", fen);

    const isFenSyntaxValid = NotationUtils.validateFenSyntax(fen);
    if (!isFenSyntaxValid) {
      alert("Invalid FEN syntax");
      return;
    }

    // 1. Parse raw FEN into interpreted structure
    const {
      pieces,
      sideToMove,
      castlingRights,
      enPassant,
      halfMoveClock,
      fullMoveNumber,
    } = NotationUtils.interpretFen(fen);

    // 2. Clear current board state
    this.clearBoard();

    // 3. Validate and apply the parsed piece positions
    // TODO: Make this a separate method
    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
      for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
        const char = pieces[rankIndex][fileIndex];
        if (/\s+/g.test(char)) {
          continue;
        }

        const pieceInfo = Piece.fenSymbolToPieceMap.get(char as FenPieceType);
        if (!pieceInfo) {
          throw new Error(`Invalid piece character in FEN: "${char}"`);
        }

        const square = BoardUtils.getAlgebraicNotationFromBoardIndices(
          fileIndex,
          rankIndex
        );

        this.addPiece(pieceInfo.type, pieceInfo.color, square);
      }
    }

    const fenAsciiBoard = NotationUtils.createASCIIBoard(fen);
    console.log(fenAsciiBoard);

    // 4. Sync game state (castling, en passant, turn, clocks)
    this.currentTurn = sideToMove;

    // TODO: Update player states - add check verification
    this.enPassantSquare = enPassant?.square ?? null;

    this.halfMoveClock = halfMoveClock;
    this.fullMoveNumber = fullMoveNumber;

    // 5. Update metadata (e.g., repetition map, legal moves, checks)
    this.recordMoveAsHash();

    this.updatePlayerState(this.whitePlayer, false, castlingRights.white);
    this.updatePlayerState(this.blackPlayer, false, castlingRights.black);

    this.updateCheckStateFor(this.whitePlayer);
    this.updateCheckStateFor(this.blackPlayer);

    this.updateCheckStateFor(this.currentPlayer);
    this.updateAllLegalMovesForCurrentPlayer();

    console.log({ castlingRights });

    this.isGamePlayable = RulesEngine.isFenPositionPlayable(this);

    console.log(
      `%cGame is playable: ${this.isGamePlayable}`,
      `background: ${this.isGamePlayable ? "green" : "red"}`
    );

    if (!this.isGamePlayable) {
      alert("Game is not playable! Please fix the board and try again.");
    }
  };

  public loadPgn = (pgn: string): void => {};
}

export default ChessBoard;
