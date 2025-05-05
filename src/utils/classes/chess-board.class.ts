import {
  getInnerCssVariables,
  selectQuery,
} from "@utils/functions/helper-functions/dom.functions";
import Piece, { PieceColor, IPieceAlgorithm, PieceType } from "./piece.class";
import { clamp } from "@utils/functions/helper-functions/number.functions";
import Player, { CastlingRights } from "./player.class";
import BoardUtils from "./board-utils.class";
import MovesGenerator from "./move-generator.class";

export type ChessFile = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type ChessRank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

export type AlgebraicNotation = `${ChessFile}${ChessRank}`;

export type Move = {
  from: AlgebraicNotation;
  to: AlgebraicNotation;
  piece: Piece;
  capturedPiece?: Piece;
  promotion?: PieceType;
  // fenBefore: string;
  // fenAfter: string;
};

interface IGameLogic {
  currentTurn: PieceColor;
  currentPlayer: Player;
  selectPiece(el: HTMLElement): void;
  clearSelectedPiece(oldPosition?: AlgebraicNotation): void;
  switchTurnTo(color?: PieceColor): void;
  updatePlayerState(
    player: Player,
    inCheck: boolean,
    canCastle: CastlingRights
  ): void;
  updatePiecePosition(
    piece: Piece,
    rankIndex: number,
    fileIndex: number,
    noAnimation?: boolean
  ): void;
}

interface IBoardUI {
  get squareSize(): number;
  container: HTMLElement;
  elementIsChessPiece(el: HTMLElement): boolean;
  elementIsPieceSelected(el: HTMLElement): boolean;
  getPieceFromElement(el: HTMLElement): Piece | null;
  addPiece(
    type: PieceType,
    color: PieceColor,
    position:
      | AlgebraicNotation
      | Omit<IPieceAlgorithm["position"], "algebraicNotation">
  ): void;
  dragPiece(piece: Piece, offsetX: number, offsetY: number): void;
}

class ChessBoard implements IGameLogic, IBoardUI {
  public container: HTMLElement;

  public readonly initialFen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  private readonly piecesMap = new Map<AlgebraicNotation, Piece>();

  private readonly squareElementsMap = new Map<
    AlgebraicNotation,
    HTMLElement
  >();

  private readonly playedMoves: Move[] = [];

  public selectedPiece: Piece | null = null;
  public selectedPieceLegalMoves: AlgebraicNotation[] | null = null;
  public boardPerspective: PieceColor = "white";
  public legalMovesForSelectedPiece: AlgebraicNotation[] | null = null;

  public currentTurn: PieceColor = "white";
  public whitePlayer: Player;
  public blackPlayer: Player;

  constructor(container: HTMLElement) {
    this.container = container;

    this.whitePlayer = new Player("white");
    this.blackPlayer = new Player("black");
  }

  public set currentPlayer(player: Player) {
    if (player.color !== this.currentTurn) {
      throw new Error("The player color doesn't match the current turn.");
    }
    if (player.color === "white") {
      this.whitePlayer = player;
    } else {
      this.blackPlayer = player;
    }
  }

  public get currentPlayer(): Player {
    return this.currentTurn === "white" ? this.whitePlayer : this.blackPlayer;
  }

  public get squareSize(): number {
    const parsedSquaredSizeCssVariable = getInnerCssVariables(
      this.container,
      "--_square-size"
    );

    const squareSize = Number(
      parsedSquaredSizeCssVariable.replace(/px|%/g, "")
    );

    return squareSize;
  }

  public updatePlayerState = (
    player: Player,
    inCheck: boolean,
    canCastle: CastlingRights
  ) => {
    player.setInCheck(inCheck);
    player.setCanCastle(canCastle);
  };

  public switchTurnTo = (color?: PieceColor): void => {
    if (color) {
      this.currentTurn = color;
      return;
    }

    this.currentTurn = this.currentTurn === "white" ? "black" : "white";
  };

  // TODO: Update to follow the side-effect isolation pattern
  public generateBoard = (): void => {
    this.container.innerHTML = ""; // clear container

    const getLabelClasses = (
      isDark: boolean,
      labelType?: "rank" | "file"
    ): string[] => [
      "chess__label",
      `chess__label--${isDark ? "light" : "dark"}`,
      `chess__label--${labelType === "rank" ? "rank" : "file"}`,
    ];

    for (let visualRank = 0; visualRank < 8; visualRank++) {
      /**
       * Logical rank due to coordinates mismatch between visual (board) and logical (internal game logic) rank
       */
      const rank = 7 - visualRank;

      for (let file = 0; file < 8; file++) {
        const square: HTMLDivElement = document.createElement("div");
        square.classList.add("chess__square");

        square.dataset.file = file.toString();
        square.dataset.rank = rank.toString(); // ? Visual rank, the data attr are relative to the chess board, not in-game logic
        square.dataset.algebraicNotation =
          BoardUtils.fileMap.get(file) + BoardUtils.rankMap.get(visualRank);

        const isDark: boolean = (file + rank) % 2 === 0;
        square.classList.add(isDark ? "dark-square" : "light-square");

        // Add file label to bottom row (visualRank === 7)
        if (visualRank === 7) {
          const fileLabel = document.createElement("p");

          const fileLabelClasses = getLabelClasses(isDark, "file");

          fileLabel.classList.add(...fileLabelClasses);

          fileLabel.textContent = BoardUtils.fileMap.get(file);
          square.appendChild(fileLabel);
        }

        // Add rank number (8 to 1) to the first column
        if (file === 0) {
          const rankLabelClasses = getLabelClasses(isDark, "rank");

          const rankLabel = document.createElement("p");

          rankLabel.classList.add(...rankLabelClasses);

          // Show actual rank number (from 8 to 1)
          rankLabel.textContent = BoardUtils.rankMap.get(visualRank);
          square.appendChild(rankLabel);
        }

        this.container.appendChild(square);

        this.squareElementsMap.set(
          square.dataset.algebraicNotation as AlgebraicNotation,
          square
        );
      }
    }
  };

  public getPieceFromElement = (el: HTMLElement): Piece | null => {
    const piece: Piece | null = [...this.piecesMap.values()].find(
      (piece) => piece.element === el
    );

    return piece || null;
  };

  // TODO: Update to follow the side-effect isolation pattern
  public addPiece = (
    type: PieceType,
    color: PieceColor,
    position:
      | Omit<IPieceAlgorithm["position"], "algebraicNotation">
      | AlgebraicNotation
  ): void => {
    const normalizedPosition: IPieceAlgorithm["position"] =
      BoardUtils.normalizePosition(position);

    // * Create the piece using the updated normalizedPosition
    const piece = new Piece(type, color, normalizedPosition);

    // * Attach to board
    piece.attachToBoard(this.container);

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

  public elementIsChessPiece = (element: HTMLElement): boolean => {
    if (!element) {
      return false;
    }

    return element.hasAttribute("data-piece");
  };

  public dragPiece = (piece: Piece, offsetX: number, offsetY: number) => {
    // Turn check: Ensure it's the current player's turn before dragging
    if (piece.color !== this.currentTurn) {
      piece.moveTo(piece.position, true);
      console.error("It's not your turn! Cannot drag piece.");
      return;
    }

    piece.drag(offsetX, offsetY);
  };

  // TODO: Update to follow the side-effect isolation pattern
  public selectPiece = (el: HTMLElement) => {
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

    this.legalMovesForSelectedPiece = MovesGenerator.generateMoveForPiece(
      this.selectedPiece,
      this.piecesMap,
      this.currentPlayer
    );

    this.highlightLegalMoves(this.legalMovesForSelectedPiece, "add");
  };

  // TODO: Update to follow the side-effect isolation pattern
  public clearSelectedPiece = (oldPosition?: AlgebraicNotation): void => {
    if (!this.selectedPiece) {
      return;
    }

    this.highlightSelectedSquare(
      oldPosition || this.selectedPiece.position.algebraicNotation,
      "remove"
    );

    this.highlightLegalMoves(this.legalMovesForSelectedPiece, "remove");

    this.selectedPiece = null;
  };

  public elementIsPieceSelected = (el: HTMLElement): boolean => {
    const piece: Piece = this.getPieceFromElement(el);

    return Boolean(piece) && piece === this.selectedPiece;
  };

  /*
   * Abstraction methods for updating the squares
   */

  private readonly updateSquareHighlight = ({
    targetSquares,
    type,
    mode = "add",
    value = "true",
  }: {
    targetSquares: AlgebraicNotation | AlgebraicNotation[];
    type: "selected" | "can-move" | "occupied";
    mode?: "add" | "remove" | "toggle";
    value?: string;
  }): void => {
    value = mode === "add" ? value : "";

    const squares: AlgebraicNotation[] =
      typeof targetSquares === "string" ? [targetSquares] : targetSquares;

    const attrMap = new Map<string, string>(
      Object.entries({
        selected: "data-selected-square",
        "can-move": "data-available-move",
        occupied: "data-occupied-by",
      })
    );

    const attrName = attrMap.get(type);
    if (!attrName) {
      console.warn(`Unknown highlight type "${type}"`);
      return;
    }

    console.debug(
      `Updating squares "${squares.join(
        ", "
      )}" with attribute "${attrName}", value "${value}", mode "${mode}"`
    );

    for (const an of squares) {
      const square = this.squareElementsMap.get(an);
      if (!square) continue;

      switch (mode) {
        case "add": {
          square.setAttribute(attrName, value);
          break;
        }

        case "remove": {
          square.removeAttribute(attrName);
          break;
        }

        case "toggle": {
          if (square.hasAttribute(attrName)) {
            square.removeAttribute(attrName);
          } else {
            square.setAttribute(attrName, value);
          }
          break;
        }

        default:
          console.warn(
            `Unknown mode "${mode}" passed to updateSquareHighlight`
          );
      }
    }
  };

  private readonly highlightSelectedSquare = (
    square: AlgebraicNotation,
    mode: "add" | "remove" | "toggle" = "add"
  ) => {
    this.updateSquareHighlight({
      targetSquares: square,
      type: "selected",
      mode,
    });
  };

  private readonly highlightLegalMoves = (
    squares: AlgebraicNotation[],
    mode: "add" | "remove" | "toggle" = "add"
  ) => {
    this.updateSquareHighlight({
      targetSquares: squares,
      type: "can-move",
      mode,
    });
  };

  private readonly setOccupiedSquare = (
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

  private readonly clearOccupiedSquare = (square: AlgebraicNotation) => {
    this.updateSquareHighlight({
      targetSquares: square,
      type: "occupied",
      mode: "remove",
    });
  };

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
    const { from, to, piece, capturedPiece } = move;

    if (capturedPiece) {
      this.capturePiece(capturedPiece, noAnimation);
    }

    const newPosition = BoardUtils.getBoardIndicesFromAlgebraicNotation(to);
    piece.moveTo(newPosition, noAnimation);

    this.piecesMap.delete(from);
    this.clearOccupiedSquare(from);

    this.piecesMap.set(to, piece);
    this.setOccupiedSquare(to, piece);

    this.highlightLegalMoves(this.legalMovesForSelectedPiece || [], "remove");
    this.playedMoves.push(move);

    this.switchTurnTo();
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
