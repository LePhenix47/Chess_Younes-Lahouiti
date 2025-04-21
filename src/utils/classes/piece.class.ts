import ChessBoard from "./chess-board.class";

export type Color = "white" | "black";
export type PieceType =
  | "pawn"
  | "rook"
  | "knight"
  | "bishop"
  | "queen"
  | "king";

export interface IPieceAlgorithm {
  type: PieceType;
  color: Color;
  position: { file: string; rank: string; algebraicNotation: string };
}

interface IPieceDOM {
  updatePosition(position: IPieceAlgorithm["position"]): void;
  attachToBoard(boardElement: HTMLElement): void;
}

class Piece implements IPieceAlgorithm, IPieceDOM {
  public type: PieceType;
  public color: Color;
  public position: IPieceAlgorithm["position"];
  public hasMoved: boolean = false;

  public element: HTMLElement | null = null;

  constructor(
    type: PieceType,
    color: Color,
    position: IPieceAlgorithm["position"]
  ) {
    this.type = type;
    this.color = color;
    this.position = position;

    this.element = this.createElement();
  }

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

    span.style.setProperty(
      "--_index-x",
      // @ts-ignore
      ChessBoard.reverseRankMap.get(this.position.rank)
    );
    span.style.setProperty(
      "--_index-y",
      // @ts-ignore
      ChessBoard.reverseFileMap.get(this.position.file)
    );
    span.dataset.position = this.position.algebraicNotation;

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

  public updatePosition = (newPosition: IPieceAlgorithm["position"]): void => {
    if (!this.element) {
      throw new Error("Element is null");
    }

    this.element.style.setProperty("--_index-x", newPosition.rank);
    this.element.style.setProperty("--_index-y", newPosition.file);
    this.element.dataset.position = this.position.algebraicNotation;

    this.position = newPosition;
    this.hasMoved = true;
  };
  public move = (newPosition: IPieceAlgorithm["position"]) => {
    this.position = newPosition;
    this.hasMoved = true;
  };

  public toFenChar = (): string => {
    const pieceChar = this.getPieceChar();
    return this.color === "white" ? pieceChar.toUpperCase() : pieceChar;
  };

  private getPieceChar(): string {
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
  }
}

export default Piece;
