import { getInnerCssVariables } from "@utils/functions/helper-functions/dom.functions";
import { clamp } from "@utils/functions/helper-functions/number.functions";
import BoardUtils from "./board-utils.class";
import MovesGenerator from "./move-generator.class";

import Piece, { PieceColor, PieceType, IPieceLogic } from "./piece.class";
import Player, { CastlingRights } from "./player.class";

import type { Move, AlgebraicNotation } from "./chess-board.class"; //
//
export interface IGameLogic {
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
}

export interface IBoardUI {
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
      | Omit<IPieceLogic["position"], "algebraicNotation">
  ): void;
  dragPiece(piece: Piece, offsetX: number, offsetY: number): void;
}
// Or re-define if needed

abstract class BoardController implements IGameLogic, IBoardUI {
  public container: HTMLElement;

  public readonly initialFen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  protected readonly piecesMap = new Map<AlgebraicNotation, Piece>();

  protected readonly squareElementsMap = new Map<
    AlgebraicNotation,
    HTMLElement
  >();

  protected readonly playedMoves: Move[] = [];

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

  protected readonly createSquareElement = (
    rank: number,
    file: number,
    visualRank: number
  ): HTMLDivElement => {
    const square = document.createElement("div");
    square.classList.add("chess__square");

    const algebraicNotation = `${BoardUtils.fileMap.get(
      file
    )}${BoardUtils.rankMap.get(visualRank)}`;
    const isDark = (file + rank) % 2 === 0;

    square.dataset.file = file.toString();
    square.dataset.rank = rank.toString();
    square.dataset.algebraicNotation = algebraicNotation;
    square.dataset.square = "";
    square.classList.add(isDark ? "dark-square" : "light-square");

    this.addBoardLabels(square, file, visualRank, isDark);
    return square;
  };

  protected readonly addBoardLabels = (
    square: HTMLDivElement,
    file: number,
    visualRank: number,
    isDark: boolean
  ): void => {
    const getLabelClasses = (type: "rank" | "file"): string[] => [
      "chess__label",
      `chess__label--${isDark ? "light" : "dark"}`,
      `chess__label--${type}`,
    ];

    if (visualRank === 7) {
      const fileLabel = document.createElement("p");
      fileLabel.classList.add(...getLabelClasses("file"));
      fileLabel.textContent = BoardUtils.fileMap.get(file);
      square.appendChild(fileLabel);
    }

    if (file === 0) {
      const rankLabel = document.createElement("p");
      rankLabel.classList.add(...getLabelClasses("rank"));
      rankLabel.textContent = BoardUtils.rankMap.get(visualRank);
      square.appendChild(rankLabel);
    }
  };

  public generateBoard = (): void => {
    this.container.innerHTML = "";
    for (let visualRank = 0; visualRank < 8; visualRank++) {
      const rank = 7 - visualRank;
      for (let file = 0; file < 8; file++) {
        const square = this.createSquareElement(rank, file, visualRank);
        this.container.appendChild(square);

        const algebraic = square.dataset.algebraicNotation as AlgebraicNotation;
        this.squareElementsMap.set(algebraic, square);
      }
    }
  };

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
    const square =
      this.container.querySelector<HTMLDivElement>("[data-square]");

    const squareSize = square.offsetWidth;

    console.log(squareSize);

    return squareSize;
  }

  public addPiece = (
    type: PieceType,
    color: PieceColor,
    position:
      | Omit<IPieceLogic["position"], "algebraicNotation">
      | AlgebraicNotation
  ): void => {
    const normalizedPosition: IPieceLogic["position"] =
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
  public dragPiece = (piece: Piece, offsetX: number, offsetY: number) => {
    // Turn check: Ensure it's the current player's turn before dragging
    if (piece.color !== this.currentTurn) {
      piece.moveTo(piece.position, true);
      console.error("It's not your turn! Cannot drag piece.");
      return;
    }

    piece.drag(offsetX, offsetY);
  };
  public elementIsChessPiece = (element: HTMLElement): boolean => {
    if (!element) {
      return false;
    }

    return element.hasAttribute("data-piece");
  };

  public getPieceFromElement = (el: HTMLElement): Piece | null => {
    const piece: Piece | null = [...this.piecesMap.values()].find(
      (piece) => piece.element === el
    );

    return piece || null;
  };

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

  public clearSelectedPiece = (oldPosition?: AlgebraicNotation): void => {
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

  public elementIsPieceSelected = (el: HTMLElement): boolean => {
    const piece: Piece = this.getPieceFromElement(el);

    return Boolean(piece) && piece === this.selectedPiece;
  };

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

  // All helper methods for highlighting, setting square state, etc., go here
  /*
   * Abstraction methods for updating the squares
   */

  protected readonly updateSquareHighlight = ({
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

  protected readonly highlightSelectedSquare = (
    square: AlgebraicNotation,
    mode: "add" | "remove" | "toggle" = "add"
  ) => {
    this.updateSquareHighlight({
      targetSquares: square,
      type: "selected",
      mode,
    });
  };

  protected readonly highlightLegalMoves = (
    squares: AlgebraicNotation[],
    mode: "add" | "remove" | "toggle" = "add"
  ) => {
    this.updateSquareHighlight({
      targetSquares: squares,
      type: "can-move",
      mode,
    });
  };

  protected readonly setOccupiedSquare = (
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
}
export default BoardController;
