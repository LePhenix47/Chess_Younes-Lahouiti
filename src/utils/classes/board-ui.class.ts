import BoardUtils from "./board-utils.class";
import ChessBoardController from "./chess-board-controller";
import { AlgebraicNotation } from "./chess-board.class";
import Piece, {
  PieceType,
  PieceColor,
  IPieceLogic,
  PromotedPiece,
} from "./piece.class";

class BoardUI {
  constructor(private chessBoardController: ChessBoardController) {}

  public generateBoard = (): void => {
    this.chessBoardController.container.innerHTML = "";
    for (let visualRank = 0; visualRank < 8; visualRank++) {
      const rank = 7 - visualRank;
      for (let file = 0; file < 8; file++) {
        const square = this.createSquareElement(rank, file, visualRank);
        this.chessBoardController.container.appendChild(square);

        const algebraic = square.dataset.algebraicNotation as AlgebraicNotation;
        this.chessBoardController.squareElementsMap.set(algebraic, square);
      }
    }
  };

  public readonly createSquareElement = (
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

  // TODO: Think about this method, Issue is it mixes both UI and logic
  // public addPiece = (
  //   type: PieceType,
  //   color: PieceColor,
  //   position:
  //     | Omit<IPieceLogic["position"], "algebraicNotation">
  //     | AlgebraicNotation
  // ): void => {
  //   const normalizedPosition: IPieceLogic["position"] =
  //     BoardUtils.normalizePosition(position);

  //   let piece: Piece;

  //   const { piecesMap, container } = this.chessBoardController;

  //   if (piecesMap.has(normalizedPosition.algebraicNotation)) {
  //     piece = piecesMap.get(normalizedPosition.algebraicNotation) as Piece;

  //     piece.moveTo(normalizedPosition, false);

  //     piecesMap.delete(normalizedPosition.algebraicNotation);
  //   } else {
  //     // * Create the piece using the updated normalizedPosition
  //     piece = new Piece(type, color, normalizedPosition);

  //     // * Attach to board
  //     piece.attachToBoard(container);
  //   }

  //   // * Update square occupation

  //   this.chessBoardController.setOccupiedSquare(
  //     normalizedPosition.algebraicNotation as AlgebraicNotation,
  //     piece
  //   );

  //   // * Step 7: Save to internal map
  //   piecesMap.set(
  //     normalizedPosition.algebraicNotation as AlgebraicNotation,
  //     piece
  //   );
  // };

  public dragPiece = (piece: Piece, offsetX: number, offsetY: number) => {
    const { currentTurn } = this.chessBoardController;
    // Turn check: Ensure it's the current player's turn before dragging
    if (piece.color !== currentTurn) {
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
    const { piecesMap } = this.chessBoardController;

    const piece: Piece | null = [...piecesMap.values()].find(
      (piece) => piece.element === el
    );

    return piece || null;
  };

  public elementIsPieceSelected = (el: HTMLElement): boolean => {
    const piece: Piece = this.getPieceFromElement(el);

    return Boolean(piece) && piece === this.chessBoardController.selectedPiece;
  };

  public setSquareHighlightByAttribute = (
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

  public setSquareHighlightByClassname = (
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
  public readonly updateSquareHighlight = ({
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
      const square = this.chessBoardController.squareElementsMap.get(an);
      if (!square) {
        continue;
      }

      if (attrName) {
        this.setSquareHighlightByAttribute(square, attrName, value, mode);
      } else {
        this.setSquareHighlightByClassname(square, className, mode);
      }
    }
  };

  public renderPromotionDialogHTML = (
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
        this.chessBoardController.boardPerspective === color
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

  public getDialogCoordinates = (
    square: AlgebraicNotation
  ): { left: number; top: number } => {
    const { container, squareSize } = this.chessBoardController;

    const { fileIndex, rankIndex } =
      BoardUtils.getBoardIndicesFromAlgebraicNotation(square);

    const boardRect: DOMRect = container.getBoundingClientRect();

    const left: number = Number(fileIndex) * squareSize + boardRect.left;
    const top: number = Number(rankIndex) * squareSize + boardRect.top;

    return { left, top };
  };

  /* */

  public showPromotionDialog = (
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

  public clearPromotionDialog = () => {
    if (!this.chessBoardController.promotionDialogContainer) {
      return;
    }

    this.chessBoardController.promotionDialogContainer.removeEventListener(
      "click",
      this.handlePromotionDialogEventsByDelegation
    );

    this.chessBoardController.promotionDialogContainer.remove();
    this.chessBoardController.promotionDialogContainer = null;
  };

  public injectPromotionDialog = (
    html: string,
    onChoice: (piece: PromotedPiece | null) => void
  ) => {
    const container = document.createElement("div");
    container.classList.add("chess__promotion-container");
    container.innerHTML = html;

    const main = document.querySelector<HTMLElement>("[data-element=index]");
    main.appendChild(container);

    this.chessBoardController.promotionDialogContainer = container;

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

  public handlePromotionDialogEventsByDelegation = (event: PointerEvent) => {
    const target = event.target as HTMLElement;

    if (!this.chessBoardController.promotionDialogContainer) {
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
}

export default BoardUI;
