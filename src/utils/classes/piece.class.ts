import ChessBoard, { AlgebraicNotation } from "./chess-board.class";
import { SlidingPiece } from "./move-utils.class";

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
}

interface IPieceDOM {
  moveTo(position: IPieceAlgorithm["position"]): void;
  attachToBoard(boardElement: HTMLElement): void;
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

  public moveTo = (
    newPosition: IPieceAlgorithm["position"],
    noAnimation = false
  ): void => {
    if (!this.element) {
      throw new Error("Element is null");
    }

    console.log(newPosition);

    // * Remove temporary drag offset
    this.element.style.removeProperty("--_drag-x");
    this.element.style.removeProperty("--_drag-y");

    // * Set new board coordinates
    this.element.style.setProperty("--_index-x", newPosition.rankIndex);
    this.element.style.setProperty("--_index-y", newPosition.fileIndex);

    this.element.dataset.position = newPosition.algebraicNotation;

    const debugParagraph = this.element.querySelector<HTMLParagraphElement>(
      "[data-element=piece-debug]"
    );

    debugParagraph.textContent = `${newPosition.fileIndex}-${newPosition.rankIndex}`;

    console.debug(this.element.classList, noAnimation);
    // ? Minor bug fix where a clicked piece didn't have a transition
    const hasInvalidClassesForAnimationState =
      !noAnimation && this.element.classList.contains("no-transition");
    if (hasInvalidClassesForAnimationState) {
      this.element.classList.remove("no-transition", "z-index");
    }

    if (noAnimation) {
      // * Drag move (no animation)
      // ? Instantly move WITHOUT transition
      this.element.classList.remove("dragging");

      setTimeout(() => {
        this.element.classList.remove("no-transition", "z-index");
      }, 0);
    } else {
      // * Click move (with animation)
      this.element.classList.add("z-index");
      this.element.classList.remove("dragging");

      const onTransitionEnd = (event: TransitionEvent) => {
        if (!["top", "left"].includes(event.propertyName)) {
          return;
        }

        this.element?.classList.remove("z-index");
        this.element?.removeEventListener("transitionend", onTransitionEnd);
      };

      this.element.addEventListener("transitionend", onTransitionEnd);
    }

    this.position = newPosition;
    this.hasMoved = true;
  };

  public toFenChar = (): string => {
    const pieceChar = this.pieceCharacter();
    return this.color === "white" ? pieceChar.toUpperCase() : pieceChar;
  };

  public promotePawn = (newType: Omit<PieceType, "pawn" | "king">): void => {
    if (this.type !== "pawn") {
      return;
    }

    // TODO: Add logic to promote the pawn

    this.checkSlidingPiece();
  };

  private pieceCharacter = (): string => {
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

    return char;
  };

  public delete = ({ animate = false }: { animate?: boolean } = {}): void => {
    if (!this.element) {
      return;
    }

    const callback = (event?: TransitionEvent) => {
      if (Boolean(event) && event.propertyName !== "opacity") {
        return;
      }

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
