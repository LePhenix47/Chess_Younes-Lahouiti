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

/**
 * Represents the core logical attributes of a chess piece used for move generation and game logic.
 */
export interface IPieceAlgorithm {
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
  moveTo(position: IPieceAlgorithm["position"], noAnimation?: boolean): void;
  promotePawn(newType: Exclude<PieceType, "pawn" | "king">): void;
  toFEN(): string;
}

export interface IPieceDOM {
  attachToBoard(boardElement: HTMLElement): void;
  drag(offsetX: number, offsetY: number): void;
  delete(options?: { animate?: boolean }): void;
}

class Piece implements IPieceAlgorithm, IPieceDOM {
  public type: PieceType;
  public color: PieceColor;
  public position: IPieceAlgorithm["position"];
  public hasMoved: boolean = false;
  public isSlidingPiece: boolean = false;

  public element: HTMLElement | null = null;

  constructor(
    type: PieceType,
    color: PieceColor,
    position: IPieceAlgorithm["position"]
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
      <p class="piece-debug" data-element="piece-debug">${this.position.fileIndex}-${this.position.rankIndex}</p>
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

  private updatePositionStyles = (pos: IPieceAlgorithm["position"]): void => {
    this.element.style.setProperty("--_index-x", pos.rankIndex);
    this.element.style.setProperty("--_index-y", pos.fileIndex);

    this.element.dataset.position = pos.algebraicNotation;
  };

  private updateDebugText = (pos: IPieceAlgorithm["position"]): void => {
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

    setTimeout(() => {
      this.element?.classList.remove("no-transition", "z-index");
    }, 0);
  };

  public moveTo = (
    newPos: IPieceAlgorithm["position"],
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

    this.position = newPos;
    this.hasMoved = true;
  };

  public promotePawn = (newType: Omit<PieceType, "pawn" | "king">): void => {
    if (this.type !== "pawn") {
      return;
    }

    // TODO: Add logic to promote the pawn

    this.checkSlidingPiece();
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

  public delete = ({ animate = false }: { animate?: boolean } = {}): void => {
    if (!this.element) {
      return;
    }

    const callback = (event?: TransitionEvent) => {
      // ? An event was passed in, but it was not a transition event
      if (Boolean(event) && event.propertyName !== "opacity") {
        return;
      }

      // ? If an event was passed in, remove the listener
      if (event) {
        this.element.removeEventListener("transitionend", callback);
      }

      this.element.remove();
      this.element = null;
    };

    if (!animate) {
      callback();
      return;
    }

    this.element.classList.add("captured");
    this.element.addEventListener("transitionend", callback);
  };
}

export default Piece;
