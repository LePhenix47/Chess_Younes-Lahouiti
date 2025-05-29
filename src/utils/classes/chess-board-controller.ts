import BoardUtils from "./board-utils.class";
import MovesGenerator, { KingPiece } from "./move-generator.class";

import Piece, {
  PieceColor,
  PieceType,
  IPieceLogic,
  PromotedPiece,
} from "./piece.class";
import Player, { CastlingRights } from "./player.class";

import type { Move, AlgebraicNotation } from "./chess-board.class"; //
import AttacksGenerator from "./attacks-generator.class";
import RulesEngine from "./rules-engine.class";
import ChessBoard from "./chess-board.class";
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

export type LegalMoves = {
  piece: Piece;
  moves: AlgebraicNotation[];
}[];

abstract class ChessBoardController implements IGameLogic, IBoardUI {
  public container: HTMLElement;

  public readonly initialFen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  public readonly piecesMap = new Map<AlgebraicNotation, Piece>();

  protected readonly squareElementsMap = new Map<
    AlgebraicNotation,
    HTMLElement
  >();

  public boardPerspective: PieceColor = "white";

  // ? Using Zobrist hashing
  protected readonly positionRepetitionMap = new Map<bigint, number>();

  private promotionDialogContainer: HTMLElement | null = null;

  protected allLegalMovesForCurrentPlayer: LegalMoves = [];

  public selectedPiece: Piece | null = null;
  public selectedPieceLegalMoves: AlgebraicNotation[] | null = null;
  public legalMovesForSelectedPiece: AlgebraicNotation[] | null = null;

  public currentTurn: PieceColor = "black";
  public whitePlayer: Player;
  public blackPlayer: Player;

  public enPassantSquare: AlgebraicNotation | null = null;

  public halfMoveClock: number = 0;
  public fullMoveNumber: number = 1;

  public isGameOver = false;

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

    const algebraicNotation = BoardUtils.getAlgebraicNotationFromBoardIndices(
      file,
      visualRank
    );

    const isDark = BoardUtils.isSquareOfType(algebraicNotation, "dark");

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

  public get rivalPlayer(): Player {
    return this.currentTurn === "white" ? this.blackPlayer : this.whitePlayer;
  }

  public get squareSize(): number {
    const square =
      this.container.querySelector<HTMLDivElement>("[data-square]");

    const squareSize = square.offsetWidth;

    return squareSize;
  }

  public updateAllLegalMovesForCurrentPlayer = (): void => {
    // Get all the legal moves for the current player
    const allLegalMoves = MovesGenerator.generateLegalMoves({
      piecesMap: this.piecesMap,
      player: this.currentPlayer,
      enPassantSquare: this.enPassantSquare,
    });
    // Store it in the new property
    this.allLegalMovesForCurrentPlayer = allLegalMoves;
  };

  protected showPromotionDialog = (
    square: AlgebraicNotation,
    color: "white" | "black"
  ): Promise<PromotedPiece> => {
    this.clearPromotionDialog();

    const { left, top } = this.getDialogCoordinates(square);
    const html = this.renderPromotionDialogHTML(left, top, color);

    return new Promise((resolve) => {
      this.injectPromotionDialog(html, resolve);
    });
  };

  protected clearPromotionDialog = () => {
    if (!this.promotionDialogContainer) {
      return;
    }

    this.promotionDialogContainer.removeEventListener(
      "click",
      this.handlePromotionDialogEventsByDelegation
    );

    this.promotionDialogContainer.remove();
    this.promotionDialogContainer = null;
  };

  private getDialogCoordinates = (
    square: AlgebraicNotation
  ): { left: number; top: number } => {
    const { fileIndex, rankIndex } =
      BoardUtils.getBoardIndicesFromAlgebraicNotation(square);

    const boardRect: DOMRect = this.container.getBoundingClientRect();
    const squareSize: number = this.squareSize;

    const left: number = Number(fileIndex) * squareSize + boardRect.left;
    const top: number = Number(rankIndex) * squareSize + boardRect.top;

    return { left, top };
  };

  private renderPromotionDialogHTML = (
    left: number,
    top: number,
    color: PieceColor
  ): string => {
    const promotionPiecesArray = ["queen", "rook", "bishop", "knight"] as const;

    const dialogHTML = /* html */ `
      <div class="chess__promotion-popup-backdrop" data-element="promotion-dialog-backdrop"></div>
      <dialog
      aria-modal="true"
      aria-label="Promote your pawn to another piece"
      class="chess__promotion-popup ${
        this.boardPerspective === color
          ? ""
          : "chess__promotion-popup--opponent-view"
      }" style="--_left: ${left}px; --_top: ${top}px;" data-element="promotion-dialog">
        <ul class="chess__promotion-list">
          ${promotionPiecesArray
            .map(
              (piece: (typeof promotionPiecesArray)[number]) => /* html */ `
              <li class="chess__promotion-item" data-promotion-piece="${piece}">
                <button type="button" class="chess__promotion-piece" aria-label="${piece} piece">
                  <svg>
                    <use href="#${color}-${piece}"></use>
                  </svg>

                  <span class="chess__promotion-piece-name">${piece}</span>
                </button>
              </li>`
            )
            .join("")}
            <li class="chess__promotion-item chess__promotion-item--cancel" aria-label="Cancel promotion">
              <button type="button" class="chess__promotion-cancel-button" data-element="promotion-cancel">×</button>
            </li>
        </ul>
      </dialog>
    `;

    return dialogHTML;
  };

  private injectPromotionDialog = (
    html: string,
    onChoice: (piece: PromotedPiece | null) => void
  ) => {
    const container = document.createElement("div");
    container.classList.add("chess__promotion-container");
    container.innerHTML = html;

    const main = document.querySelector<HTMLElement>("[data-element=index]");
    main.appendChild(container);

    this.promotionDialogContainer = container;

    const dialog = container.querySelector<HTMLDialogElement>("dialog");
    dialog?.show();

    // Wrap event handler to forward user choice
    const handler = (event: PointerEvent) => {
      const target = event.target as HTMLElement;

      // Piece selected
      const pieceButton = target.closest<HTMLButtonElement>(
        ".chess__promotion-piece"
      );
      if (pieceButton) {
        const piece = pieceButton
          .closest("[data-promotion-piece]")
          ?.getAttribute("data-promotion-piece") as PromotedPiece | null;
        if (piece) {
          cleanup();
          onChoice(piece);
        }
        return;
      }

      // Cancel pressed
      const cancelButton = target.closest("[data-element=promotion-cancel]");
      if (cancelButton) {
        cleanup();
        onChoice(null);
        return;
      }

      // Click outside on backdrop
      const isBackdrop = target.closest(
        "[data-element=promotion-dialog-backdrop]"
      );
      if (isBackdrop) {
        cleanup();
        onChoice(null);
      }
    };

    const cleanup = () => {
      container.removeEventListener("click", handler);
      this.clearPromotionDialog();
    };

    container.addEventListener("click", handler);
  };

  private handlePromotionDialogEventsByDelegation = (event: PointerEvent) => {
    const target = event.target as HTMLElement;

    if (!this.promotionDialogContainer) {
      return;
    }

    // Handle piece selection
    const pieceButton = target.closest<HTMLButtonElement>(
      ".chess__promotion-piece"
    );
    if (pieceButton) {
      const piece = pieceButton
        .closest("[data-promotion-piece]")
        ?.getAttribute("data-promotion-piece");

      if (piece) {
        console.log({ piece });

        this.clearPromotionDialog();
      }

      return;
    }

    // Handle cancel
    const cancelButton = target.closest("[data-element=promotion-cancel]");
    if (cancelButton) {
      this.clearPromotionDialog();
      return;
    }

    // Optional: close dialog when clicking on backdrop
    const isBackdrop = target.closest(
      "[data-element=promotion-dialog-backdrop]"
    );
    if (isBackdrop) {
      this.clearPromotionDialog();
    }
  };

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

    this.legalMovesForSelectedPiece = this.getLegalMovesForSelectedPiece(piece);

    // TODO: Remove this when done testing
    this.test();

    this.highlightLegalMoves(this.legalMovesForSelectedPiece, "add");
  };

  private getLegalMovesForSelectedPiece = (
    piece: Piece
  ): AlgebraicNotation[] => {
    const selectedMoves = this.allLegalMovesForCurrentPlayer.find(
      ({ piece: p }) => Piece.arePiecesTheSame(p, piece)
    );
    return selectedMoves?.moves || [];
  };

  test = () => {
    // TODO: Test that the new methods work correctly
    const king = ChessBoard.getPieceFromArray(
      this.piecesMap,
      "king",
      this.currentTurn
    ) as KingPiece;

    // const pinned = RulesEngine.getPinnedPieces(king, this.piecesMap);
    // const testSquares = pinned.map((p) => p.pinned.position.algebraicNotation);
    // this.updateSquareHighlight({
    //   targetSquares: testSquares,
    //   className: "blinking",
    //   mode: "add",
    // });
    // console.log("Pinned Pieces:", pinned);

    const a = RulesEngine.getAttackingPiecesAndPathToKing(
      king,
      this.currentPlayer,
      this.piecesMap
    ).flatMap((p) => p.pathToKing);
    this.updateSquareHighlight({
      targetSquares: a,
      className: "test",
      mode: "add",
    });

    // const attacked = AttacksGenerator.getAttackedSquaresByOpponent(
    //   this.currentPlayer,
    //   this.piecesMap
    // );

    // console.log("Opponent attacked squares:", attacked);
  };
  clearTest = () => {
    const king = ChessBoard.getPieceFromArray(
      this.piecesMap,
      "king",
      this.currentTurn
    ) as KingPiece;

    // const pinned = RulesEngine.getPinnedPieces(king, this.piecesMap);
    // const testSquares = pinned.map((p) => p.pinned.position.algebraicNotation);
    // this.updateSquareHighlight({
    //   targetSquares: testSquares,
    //   className: "blinking",
    //   mode: "remove",
    // });

    // const attacked = AttacksGenerator.getAttackedSquaresByOpponent(
    //   this.currentPlayer,
    //   this.piecesMap
    // );

    const a = RulesEngine.getAttackingPiecesAndPathToKing(
      king,
      this.currentPlayer,
      this.piecesMap
    ).flatMap((p) => p.pathToKing);

    this.updateSquareHighlight({
      targetSquares: a,
      className: "test",
      mode: "remove",
    });
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
    } else {
      this.currentTurn = this.currentTurn === "white" ? "black" : "white";
    }
  };

  // All helper methods for highlighting, setting square state, etc., go here
  /*
   * Abstraction methods for updating the squares
   */

  private setSquareHighlightByAttribute = (
    square: HTMLElement,
    attrName: string,
    value: string,
    mode: "add" | "remove" | "toggle"
  ) => {
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
        console.warn(`Unknown mode "${mode}" passed to updateSquareHighlight`);
    }
  };

  private setSquareHighlightByClassname = (
    square: HTMLElement,
    className: string,
    mode: "add" | "remove" | "toggle"
  ) => {
    switch (mode) {
      case "add": {
        square.classList.add(className);
        break;
      }

      case "remove": {
        square.classList.remove(className);
        break;
      }

      case "toggle": {
        square.classList.toggle(className);
        break;
      }

      default:
        console.warn(`Unknown mode "${mode}" passed to updateSquareHighlight`);
    }
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
    type?: "selected" | "can-move" | "occupied" | "checked";
    mode?: "add" | "remove" | "toggle";
    value?: string;
    className?: string;
  }): void => {
    value = mode === "add" ? value : "";

    const squares: AlgebraicNotation[] =
      typeof targetSquares === "string" ? [targetSquares] : targetSquares;

    const attrMap = new Map<string, string>(
      Object.entries({
        selected: "data-selected-square",
        "can-move": "data-available-move",
        occupied: "data-occupied-by",
        checked: "data-checked",
      })
    );

    const attrName = attrMap.get(type);
    if (!attrName && !className) {
      console.warn(`Unknown highlight type "${type}"`);
      return;
    }

    // console.debug(
    //   `Updating squares "${squares.join(
    //     ", "
    //   )}" with attribute "${attrName}", value "${value}", mode "${mode}"`
    // );

    for (const an of squares) {
      const square = this.squareElementsMap.get(an);
      if (!square) continue;

      if (attrName) {
        this.setSquareHighlightByAttribute(square, attrName, value, mode);
      } else {
        this.setSquareHighlightByClassname(square, className, mode);
      }
    }
  };

  protected readonly highlightCheck = (square: AlgebraicNotation) => {
    this.updateSquareHighlight({
      targetSquares: square,
      mode: "add",
      type: "checked",
    });
  };

  protected readonly clearCheckHighlightSquare = () => {
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

  public clearBoard = (): void => {
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

    // 3. Reset game state
    this.selectedPiece = null;
    this.legalMovesForSelectedPiece = null;
    this.selectedPieceLegalMoves = null;
    this.allLegalMovesForCurrentPlayer = [];

    this.enPassantSquare = null;
    this.positionRepetitionMap.clear();

    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;

    this.currentTurn = "white"; // or "black" depending on your default

    // 4. Reset players states
    this.whitePlayer = new Player("white");
    this.blackPlayer = new Player("black");

    // 5. Clear promotion dialog if open
    this.clearPromotionDialog();
  };
}
export default ChessBoardController;
