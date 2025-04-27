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

    // Optional: set initial position as CSS variables
    console.debug(this.position.file, this.position.rank);

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

    // * Remove CSS variables (clears unused properties in the DevTools)
    this.element.style.removeProperty("--_drag-x");
    this.element.style.removeProperty("--_drag-y");

    // * Set new CSS variables for the position
    this.element.style.setProperty("--_index-x", newPosition.rank);
    this.element.style.setProperty("--_index-y", newPosition.file);

    this.element.dataset.position = newPosition.algebraicNotation;

    // TODO: This code's a mess, so after moving a piece either by click or drag we should clean up the CSS
    // TODO: Now on click no problem, but on drag the classes still remain, not that it causes a problem but it's a mess in the piece class
    // ? We need to remove the dragging class
    const classesToRemove = ["dragging", "no-transition"];

    if (noAnimation) {
      classesToRemove.pop();
    } else {
      this.element.classList.add("z-index");
      const callback = (event?: TransitionEvent) => {
        if (!["top", "left"].includes(event.propertyName)) {
          return;
        }

        this.element.classList.remove("z-index");
        this.element.removeEventListener("transitionend", callback);
      };

      this.element.addEventListener("transitionend", callback);
    }

    console.debug(noAnimation, classesToRemove);
    this.element.classList.remove(...classesToRemove);

    this.position = newPosition;
    this.hasMoved = true;
  };

  public toFenChar = (): string => {
    const pieceChar = this.getPieceChar();
    return this.color === "white" ? pieceChar.toUpperCase() : pieceChar;
  };

  public promotePawn = (newType: PieceType): void => {
    if (this.type !== "pawn") {
      return;
    }

    // TODO: Add logic to promote the pawn

    this.checkSlidingPiece();
  };

  private getPieceChar = (): string => {
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
      if (event && event.propertyName !== "opacity") {
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
