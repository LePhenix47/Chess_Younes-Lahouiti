import BoardUtils from "./board-utils.class";
import ChessBoard, { AlgebraicNotation } from "./chess-board.class";
import { SlidingPiece } from "./move-generator.class";

export type PieceColor = "white" | "black";
export type PieceType =
  | "pawn"
  | "rook"
  | "knight"
  | "bishop"
  | "queen"
  | "king";

export type AllFenPieceType = "p" | "n" | "b" | "r" | "q" | "k";

export type FenPieceType =
  | AllFenPieceType
  | Capitalize<AllFenPieceType>
  | (string & {}); // ? defers the string type to avoid setting the type to just "string"

export type PromotedPiece = Exclude<PieceType, "pawn" | "king">;

export type PieceTypeMap = `${PieceColor}-${PieceType}`;

/**
 * Represents the core logical attributes of a chess piece used for move generation and game logic.
 */
export interface IPieceLogic {
  /** The type of the chess piece (e.g., `'pawn'`, `'rook'`, etc.) */
  type: PieceType;

  /** The color of the piece, either `'white'` or `'black'` */
  color: PieceColor;

  position: {
    /**
     * File index (`0–7`), left to right from white's perspective (`a–h`).
     */
    fileIndex: string;

    /**
     * Internal rank index (`0–7`) used for logic and movement calculations.
     *
     * ⚠️ **Note:** This index is **inverted** relative to algebraic notation and visual board layout.
     *
     * - Rank `0` corresponds to the **8th rank** (top row visually)
     * - Rank `7` corresponds to the **1st rank** (bottom row visually)
     *
     * This inversion is due to CSS grids using a top-left origin, **whereas** chess uses a bottom-left origin.
     *
     * 👉 To convert this index to a visual/algebraic rank: `visualRank = 7 - rankIndex`
     */
    rankIndex: string;

    /**
     * Algebraic notation of the square (e.g., `'e4'`).
     */
    algebraicNotation: AlgebraicNotation;
  };

  hasMoved: boolean;
  isSlidingPiece: boolean;
  moveTo(position: IPieceLogic["position"], noAnimation?: boolean): void;
  promotePawn(newType: PromotedPiece): void;
  toFEN(): string;
}

export interface IPieceUI {
  attachToBoard(boardElement: HTMLElement): void;
  drag(offsetX: number, offsetY: number): void;
  removePiece(options?: { animate?: boolean }): void;
}

class Piece implements IPieceLogic, IPieceUI {
  public static readonly pieceToFenSymbolMap = new Map<
    PieceTypeMap,
    FenPieceType
  >(
    Object.entries({
      "white-pawn": "P",
      "white-knight": "N",
      "white-bishop": "B",
      "white-rook": "R",
      "white-queen": "Q",
      "white-king": "K",
      "black-pawn": "p",
      "black-knight": "n",
      "black-bishop": "b",
      "black-rook": "r",
      "black-queen": "q",
      "black-king": "k",
    }) as [PieceTypeMap, FenPieceType][]
  );

  public static readonly fenSymbolToPieceMap = new Map<
    FenPieceType,
    { color: PieceColor; type: PieceType }
  >(
    Object.entries({
      P: { color: "white", type: "pawn" },
      N: { color: "white", type: "knight" },
      B: { color: "white", type: "bishop" },
      R: { color: "white", type: "rook" },
      Q: { color: "white", type: "queen" },
      K: { color: "white", type: "king" },
      p: { color: "black", type: "pawn" },
      n: { color: "black", type: "knight" },
      b: { color: "black", type: "bishop" },
      r: { color: "black", type: "rook" },
      q: { color: "black", type: "queen" },
      k: { color: "black", type: "king" },
    }) as [FenPieceType, { color: PieceColor; type: PieceType }][]
  );

  public static isType = (
    type: Piece | PieceType,
    pieceType: PieceType[] | PieceType
  ): type is PieceType => {
    const currentPieceType: PieceType[] = Array.isArray(pieceType)
      ? pieceType
      : [pieceType];

    return currentPieceType.includes(type instanceof Piece ? type.type : type);
  };

  public static arePiecesTheSame = (piece1: Piece, piece2: Piece): boolean => {
    return (
      piece1.type === piece2.type &&
      piece1.color === piece2.color &&
      piece1.position.algebraicNotation === piece2.position.algebraicNotation
    );
  };

  public static getPgnSymbol = (pieceType: PieceType) => {
    const key: PieceTypeMap = `white-${pieceType}`;

    return Piece.pieceToFenSymbolMap.get(key)!;
  };

  public get fenSymbol(): FenPieceType {
    const key: PieceTypeMap = `${this.color}-${this.type}`;
    return Piece.pieceToFenSymbolMap.get(key)!;
  }

  public get pgnSymbol(): Capitalize<AllFenPieceType> | (string & {}) {
    const fen: FenPieceType = this.fenSymbol;

    return fen.toUpperCase();
  }

  public type: PieceType;
  public color: PieceColor;
  public position: IPieceLogic["position"];
  public hasMoved: boolean = false;
  public isSlidingPiece: boolean = false;

  public element: HTMLElement | null = null;

  constructor(
    type: PieceType,
    color: PieceColor,
    position: IPieceLogic["position"]
  ) {
    this.type = type;
    this.color = color;
    this.position = position;

    this.checkSlidingPiece();

    this.element = this.createElement();
  }

  private checkSlidingPiece = () => {
    this.isSlidingPiece = this.isPieceSlidingPiece();
  };

  public isPieceSlidingPiece = (): this is SlidingPiece => {
    const slidingPieces: PieceType[] = ["rook", "bishop", "queen"];

    return slidingPieces.includes(this.type);
  };

  private createElement = (): HTMLElement => {
    const span = document.createElement("span");
    span.classList.add("chess__piece");
    span.innerHTML = /* html */ `
      <svg>
        <use href="#${this.color}-${this.type}"></use>
      </svg>
      <!-- <p data-element="piece-debug">${this.position.fileIndex}${this.position.rankIndex}</p> -->
    `;
    span.style.setProperty("--_index-x", this.position.rankIndex);
    span.style.setProperty("--_index-y", this.position.fileIndex);

    span.dataset.position = this.position.algebraicNotation;
    span.dataset.piece = this.type;
    span.dataset.color = this.color;

    return span;
  };

  public attachToBoard = (boardElement: HTMLElement): void => {
    if (!(boardElement instanceof HTMLElement)) {
      throw new Error("Board is null");
    }

    if (!this.element) {
      throw new Error("Element is null");
    }

    boardElement.appendChild(this.element);
  };

  public drag = (offsetX: number, offsetY: number): void => {
    if (!this.element) {
      throw new Error("Element is null");
    }

    this.element.classList.add("dragging", "z-index", "no-transition");

    this.element.style.setProperty("--_drag-x", `${offsetX}px`);
    this.element.style.setProperty("--_drag-y", `${offsetY}px`);
  };

  private updatePositionStyles = (pos: IPieceLogic["position"]): void => {
    this.element.style.setProperty("--_index-x", pos.rankIndex);
    this.element.style.setProperty("--_index-y", pos.fileIndex);

    this.element.dataset.position = pos.algebraicNotation;
  };

  private updateDebugText = (pos: IPieceLogic["position"]): void => {
    const debug = this.element?.querySelector<HTMLElement>(
      "[data-element=piece-debug]"
    );
    if (!debug) {
      return;
    }

    debug.textContent = `${pos.fileIndex}-${pos.rankIndex}`;
  };

  private clearDragOffset = (): void => {
    this.element.style.removeProperty("--_drag-x");
    this.element.style.removeProperty("--_drag-y");
  };

  private animateMove = (): void => {
    this.element.classList.add("z-index");
    this.element.classList.remove("dragging");

    const onTransitionEnd = (e: TransitionEvent): void => {
      if (!["top", "left"].includes(e.propertyName)) {
        return;
      }

      this.element.classList.remove("z-index");
      this.element.removeEventListener("transitionend", onTransitionEnd);
    };

    this.element.addEventListener("transitionend", onTransitionEnd);
  };

  private instantMove = (): void => {
    this.element.classList.remove("dragging");
    this.element.classList.add("no-transition", "z-index");

    setTimeout(() => {
      this.element?.classList.remove("no-transition", "z-index");
    }, 0);
  };

  public moveTo = (
    newPos: IPieceLogic["position"],
    noAnimation = false
  ): void => {
    this.clearDragOffset();
    this.updatePositionStyles(newPos);
    this.updateDebugText(newPos);

    if (noAnimation) {
      this.instantMove();
    } else {
      this.animateMove();
    }

    this.updatePositionState(newPos);
  };

  private updatePositionState = (newPos: IPieceLogic["position"]): void => {
    // ? Only mark the piece as having moved if it *actually* left its original square
    const hasActuallyMoved =
      newPos.algebraicNotation !== this.position.algebraicNotation;

    if (!this.hasMoved && hasActuallyMoved) {
      this.hasMoved = true;
    }

    this.position = newPos;
  };

  public promotePawn = (newType: PromotedPiece): void => {
    if (this.type !== "pawn") {
      return;
    }

    this.promotePawnState(newType);
    this.updatePromotionVisuals();
  };

  private promotePawnState = (newType: PromotedPiece): void => {
    this.type = newType;
    this.checkSlidingPiece();
  };

  private updatePromotionVisuals = (): void => {
    this.element.dataset.piece = this.type;

    const use = this.element.querySelector<SVGUseElement>("use");
    use.setAttribute("href", `#${this.color}-${this.type}`);
  };

  public isCastlingMove = (
    from: AlgebraicNotation,
    to: AlgebraicNotation
  ): boolean => {
    const fromFileIndex = Number(
      BoardUtils.getBoardIndicesFromAlgebraicNotation(from).fileIndex
    );
    const toFileIndex = Number(
      BoardUtils.getBoardIndicesFromAlgebraicNotation(to).fileIndex
    );

    const isKing: boolean = this.type === "king";

    const hasMovedTwoSquares: boolean =
      Math.abs(toFileIndex - fromFileIndex) === 2;

    return isKing && hasMovedTwoSquares;
  };

  public isPawnDoubleAdvance = (
    from: AlgebraicNotation,
    to: AlgebraicNotation
  ): boolean => {
    if (this.type !== "pawn") {
      return false;
    }

    const fromPos = BoardUtils.getBoardIndicesFromAlgebraicNotation(from);
    const toPos = BoardUtils.getBoardIndicesFromAlgebraicNotation(to);

    const rankDiff = Math.abs(
      Number(toPos.rankIndex) - Number(fromPos.rankIndex)
    );

    return rankDiff === 2;
  };

  public toFEN = (): string => {
    const map = new Map<string, string>(
      Object.entries({
        pawn: "p",
        rook: "r",
        knight: "n",
        bishop: "b",
        queen: "q",
        king: "k",
      })
    );

    const char: string | undefined = map.get(this.type);

    if (!char) {
      throw new Error(`Unknown piece type: ${this.type}`);
    }

    return this.color === "white" ? char.toUpperCase() : char;
  };

  public removePiece = ({
    animate = false,
  }: { animate?: boolean } = {}): void => {
    if (!this.element) {
      return;
    }

    const callback = (event?: TransitionEvent) => {
      // ? An event was passed in, but it was not an transition on the opacity
      if (Boolean(event) && event.propertyName !== "opacity") {
        return;
      }

      // ? If an event was passed in, remove the listener
      if (event) {
        this.element.removeEventListener("transitionend", callback);
      }

      this.removeElementFromDOM();
    };

    if (!animate) {
      callback();
      return;
    }

    this.element.classList.add("captured");
    this.element.addEventListener("transitionend", callback);
  };

  private removeElementFromDOM = (): void => {
    if (!this.element) {
      return;
    }

    this.element.remove();
    this.element = null;
  };
}

export default Piece;
