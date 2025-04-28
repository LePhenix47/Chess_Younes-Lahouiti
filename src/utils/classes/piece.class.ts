import ChessBoard from "./chess-board.class";

export type PieceColor = "white" | "black";
export type PieceType =
  | "pawn"
  | "rook"
  | "knight"
  | "bishop"
  | "queen"
  | "king";

export interface IPieceAlgorithm {
  type: PieceType;
  color: PieceColor;
  position: { file: string; rank: string; algebraicNotation: string };
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
    const slidingPieces: PieceType[] = ["rook", "bishop", "queen"];
    if (!slidingPieces.includes(this.type)) {
      return;
    }

    this.isSlidingPiece = true;
  };

  private createElement = (): HTMLElement => {
    const span = document.createElement("span");
    span.classList.add("chess__piece");
    span.innerHTML = /* html */ `
      <svg>
        <use href="#${this.color}-${this.type}"></use>
      </svg>
    `;
    span.style.setProperty("--_index-x", this.position.rank);
    span.style.setProperty("--_index-y", this.position.file);

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
    this.element.style.setProperty("--_index-x", newPosition.rank);
    this.element.style.setProperty("--_index-y", newPosition.file);
    this.element.dataset.position = newPosition.algebraicNotation;

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

  public promotePawn = (newType: PieceType): void => {
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
