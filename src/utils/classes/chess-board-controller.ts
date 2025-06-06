import BoardUtils from "./board-utils.class";
import { KingPiece } from "./move-generator.class";

import Piece, {
  PieceColor,
  PieceType,
  IPieceLogic,
  PromotedPiece,
} from "./piece.class";
import Player, { CastlingRights } from "./player.class";

import type {
  AlgebraicNotation,
  WinLossResult,
  DrawResult,
  Move,
} from "./chess-board.class"; //
import RulesEngine from "./rules-engine.class";
import ChessBoard from "./chess-board.class";
import GameLogic, { IGameLogic } from "./game-logic.class";
import BoardUI, { IBoardUI } from "./board-ui.class";

export type LegalMoves = {
  piece: Piece;
  moves: AlgebraicNotation[];
}[];

abstract class ChessBoardController implements IGameLogic, IBoardUI {
  public container: HTMLElement;

  public readonly initialFen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  public readonly piecesMap = new Map<AlgebraicNotation, Piece>();

  public readonly squareElementsMap = new Map<AlgebraicNotation, HTMLElement>();

  public boardPerspective: PieceColor = "white";

  // ? Using Zobrist hashing
  public readonly positionRepetitionMap = new Map<bigint, number>();

  public promotionDialogContainer: HTMLElement | null = null;

  public allLegalMovesForCurrentPlayer: LegalMoves = [];

  public selectedPiece: Piece | null = null;
  public selectedPieceLegalMoves: AlgebraicNotation[] | null = null;
  public legalMovesForSelectedPiece: AlgebraicNotation[] | null = null;

  public currentTurn: PieceColor = "black";
  public readonly whitePlayer: Player;
  public readonly blackPlayer: Player;

  public enPassantSquare: AlgebraicNotation | null = null;

  public halfMoveClock: number = 0;
  public fullMoveNumber: number = 1;

  public isGamePlayable: boolean = false;
  public isGameOver: WinLossResult | DrawResult | null = null;

  public pgnMoveText = [];

  private readonly gameLogic: GameLogic;
  private readonly boardUI: BoardUI;

  test = () => {};
  clearTest = () => {};

  constructor(container: HTMLElement) {
    this.container = container;

    this.whitePlayer = new Player("white");
    this.blackPlayer = new Player("black");

    this.gameLogic = new GameLogic(this);
    this.boardUI = new BoardUI(this);
  }

  public get currentPlayer(): Player {
    return this.currentTurn === "white" ? this.whitePlayer : this.blackPlayer;
  }

  public get rivalPlayer(): Player {
    return this.currentTurn === "white" ? this.blackPlayer : this.whitePlayer;
  }

  public get squareSize(): number {
    const square =
      this.container.querySelector<HTMLDivElement>("[data-square]");

    const squareSize = square.offsetWidth;

    return squareSize;
  }

  public readonly generateBoard = (): void => {
    this.boardUI.generateBoard();
  };

  public readonly updateAllLegalMovesForCurrentPlayer = (): void => {
    this.gameLogic.updateAllLegalMovesForCurrentPlayer();
  };

  protected readonly showPromotionDialog = (
    square: AlgebraicNotation,
    color: "white" | "black"
  ): Promise<PromotedPiece> => {
    return this.boardUI.showPromotionDialog(square, color);
  };

  public readonly addPiece = (
    type: PieceType,
    color: PieceColor,
    position:
      | Omit<IPieceLogic["position"], "algebraicNotation">
      | AlgebraicNotation
  ): void => {
    const normalizedPosition: IPieceLogic["position"] =
      BoardUtils.normalizePosition(position);

    let piece: Piece;

    if (this.piecesMap.has(normalizedPosition.algebraicNotation)) {
      piece = this.piecesMap.get(normalizedPosition.algebraicNotation) as Piece;

      piece.moveTo(normalizedPosition, false);

      this.piecesMap.delete(normalizedPosition.algebraicNotation);
    } else {
      // * Create the piece using the updated normalizedPosition
      piece = new Piece(type, color, normalizedPosition);

      // * Attach to board
      piece.attachToBoard(this.container);
    }

    // * Update square occupation

    this.setOccupiedSquare(
      normalizedPosition.algebraicNotation as AlgebraicNotation,
      piece
    );

    // * Step 7: Save to internal map
    this.piecesMap.set(
      normalizedPosition.algebraicNotation as AlgebraicNotation,
      piece
    );
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

  public readonly elementIsChessPiece = (element: HTMLElement): boolean => {
    return this.boardUI.elementIsChessPiece(element);
  };

  public readonly getPieceFromElement = (el: HTMLElement): Piece | null => {
    const piece: Piece | null = [...this.piecesMap.values()].find(
      (piece) => piece.element === el
    );

    return piece || null;
  };

  public readonly selectPiece = (el: HTMLElement) => {
    const piece = this.getPieceFromElement(el);
    if (!piece) {
      return;
    }

    if (piece.color !== this.currentTurn) {
      console.error("It's not your turn! Cannot select piece.");
      return;
    }

    this.clearSelectedPiece();
    this.selectedPiece = piece;

    const { algebraicNotation } = piece.position;
    this.highlightSelectedSquare(algebraicNotation, "add");

    this.legalMovesForSelectedPiece = this.getLegalMovesForSelectedPiece(piece);

    this.highlightLegalMoves(this.legalMovesForSelectedPiece, "add");
  };

  private readonly getLegalMovesForSelectedPiece = (
    piece: Piece
  ): AlgebraicNotation[] => {
    return this.gameLogic.getLegalMovesForSelectedPiece(piece);
  };

  public readonly clearSelectedPiece = (
    oldPosition?: AlgebraicNotation
  ): void => {
    const prev = this.selectedPiece;

    if (!prev) {
      return;
    }

    const an: AlgebraicNotation =
      oldPosition || prev.position.algebraicNotation;

    // ? UI update
    this.highlightSelectedSquare(an as AlgebraicNotation, "remove");
    this.highlightLegalMoves(this.legalMovesForSelectedPiece, "remove");

    // ? Logic update
    this.selectedPiece = null;
    this.legalMovesForSelectedPiece = null;
  };

  public readonly elementIsPieceSelected = (el: HTMLElement): boolean => {
    return this.boardUI.elementIsPieceSelected(el);
  };

  public readonly updatePlayerState = (
    player: Player,
    inCheck: boolean,
    canCastle?: CastlingRights
  ) => {
    this.gameLogic.updatePlayerState(player, inCheck, canCastle);
  };

  public readonly switchTurnTo = (color?: PieceColor): void => {
    this.gameLogic.switchTurnTo(color);
  };

  public readonly movePiece = (
    piece: Piece,
    to: AlgebraicNotation,
    noAnimation: boolean
  ) => {
    this.boardUI.movePiece(piece, to, noAnimation);
  };

  // TODO: Improve types for the param, RN I'm manually adding the possible values for the type parameter
  protected readonly updateSquareHighlight = ({
    targetSquares,
    type,
    mode = "add",
    value = "true",
    className = "",
  }: {
    targetSquares: AlgebraicNotation | AlgebraicNotation[];
    type?: "selected" | "can-move" | "occupied" | "checked" | "last-move";
    mode?: "add" | "remove" | "toggle";
    value?: string;
    className?: string;
  }): void => {
    this.boardUI.updateSquareHighlight({
      targetSquares,
      type,
      mode,
      value,
      className,
    });
  };

  protected readonly highlightCheck = (square: AlgebraicNotation) => {
    this.updateSquareHighlight({
      targetSquares: square,
      mode: "add",
      type: "checked",
    });
  };

  public readonly clearCheckHighlightSquare = () => {
    const checkedSquare =
      this.container.querySelector<HTMLDivElement>("[data-checked]");
    if (!checkedSquare) {
      return;
    }

    const square = checkedSquare.dataset.algebraicNotation as AlgebraicNotation;

    this.updateSquareHighlight({
      targetSquares: square,
      mode: "remove",
      type: "checked",
    });
  };

  public readonly highlightSelectedSquare = (
    square: AlgebraicNotation,
    mode: "add" | "remove" | "toggle" = "add"
  ) => {
    this.updateSquareHighlight({
      targetSquares: square,
      type: "selected",
      mode,
    });
  };

  public readonly highlightLegalMoves = (
    squares: AlgebraicNotation[],
    mode: "add" | "remove" | "toggle" = "add"
  ) => {
    this.updateSquareHighlight({
      targetSquares: squares,
      type: "can-move",
      mode,
    });
  };

  public readonly updateGameState = (
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

  public readonly setOccupiedSquare = (
    square: AlgebraicNotation,
    piece: Piece
  ) => {
    this.updateSquareHighlight({
      targetSquares: square,
      type: "occupied",
      value: `${piece.color}-${piece.type}`,
      mode: "add",
    });
  };

  protected readonly clearOccupiedSquare = (square: AlgebraicNotation) => {
    this.updateSquareHighlight({
      targetSquares: square,
      type: "occupied",
      mode: "remove",
    });
  };

  public readonly clearBoard = (): void => {
    // 1. Remove all piece elements from the DOM and internal map
    for (const piece of this.piecesMap.values()) {
      piece.removePiece();
    }
    this.piecesMap.clear();

    // 2. Clear square highlight attributes & classnames
    for (const square of this.squareElementsMap.values()) {
      square.removeAttribute("data-occupied-by");
      square.removeAttribute("data-selected-square");
      square.removeAttribute("data-available-move");
      square.removeAttribute("data-checked");

      square.classList.remove("test");
    }

    this.gameLogic.resetBoardState();

    // 5. Clear promotion dialog if open
    this.boardUI.clearPromotionDialog();

    this.clearLastMove();
  };

  public readonly getAllCastlingRights = () => {
    const black = {
      kingSide: this.blackPlayer.canCastle.get("kingSide"),
      queenSide: this.blackPlayer.canCastle.get("queenSide"),
    };

    const white = {
      kingSide: this.whitePlayer.canCastle.get("kingSide"),
      queenSide: this.whitePlayer.canCastle.get("queenSide"),
    };

    return {
      black,
      white,
    };
  };

  public readonly recordMoveAsHash = () => {
    this.gameLogic.recordMoveAsHash();
  };

  public readonly incrementHalfMoveClock = (move: Move): void => {
    const isPawnMove: boolean =
      move.piece.type === "pawn" || Boolean(move.promotion);
    const isCapture: boolean = !!move.capturedPiece;

    if (isPawnMove || isCapture) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }
  };

  public readonly incrementFullMoveNumber = (): void => {
    if (this.currentPlayer.color === "white") {
      return;
    }

    this.fullMoveNumber++;
  };

  public readonly getEnPassantCapturedSquare = (
    to: AlgebraicNotation,
    color: "white" | "black"
  ): AlgebraicNotation => {
    return this.gameLogic.getEnPassantCapturedSquare(to, color);
  };

  public readonly isEnPassantCapture = (
    piece: Piece,
    from: AlgebraicNotation,
    to: AlgebraicNotation
  ): boolean => {
    return this.gameLogic.isEnPassantCapture(piece, from, to);
  };

  public readonly removeCastlingRights = (
    player: Player,
    movedPiece?: Piece,
    previousPosition?: AlgebraicNotation
  ) => {
    this.gameLogic.removeCastlingRights(player, movedPiece, previousPosition);
  };

  public readonly handleCastling = (move: Move, noAnimation: boolean) => {
    this.gameLogic.handleCastling(move, noAnimation);
  };

  public readonly handleEnPassantMarking = (to: AlgebraicNotation) => {
    this.enPassantSquare = this.gameLogic.getEnPassantMarking(to);
  };

  public readonly clearEnPassantMarking = () => {
    this.enPassantSquare = this.gameLogic.clearEnPassantMarking();
  };

  public readonly markLastMove = (
    from: AlgebraicNotation,
    to: AlgebraicNotation
  ) => {
    this.updateSquareHighlight({
      targetSquares: [from, to],
      type: "last-move",
      mode: "add",
    });
  };

  public readonly clearLastMove = () => {
    const lastTwoMovesSquares =
      this.container.querySelectorAll<HTMLDivElement>("[data-last-move]");

    for (const square of lastTwoMovesSquares) {
      square.removeAttribute("data-last-move");
    }
  };
}
export default ChessBoardController;
