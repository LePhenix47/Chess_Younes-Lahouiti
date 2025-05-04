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
  private readonly initialFen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  private readonly piecesMap = new Map<AlgebraicNotation, Piece>();
  private readonly squareElementsMap = new Map<
    AlgebraicNotation,
    HTMLElement
  >();

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

  // Generates the board layout
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

  public addPiece = (
    type: PieceType,
    color: PieceColor,
    position:
      | Omit<IPieceAlgorithm["position"], "algebraicNotation">
      | AlgebraicNotation
  ): void => {
    let normalizedPosition: IPieceAlgorithm["position"];

    // * Step 1: Normalize the position
    // If it's algebraic notation (e.g., "c5")
    if (typeof position === "string") {
      const [fileIndex, rankIndex] = position;

      normalizedPosition = {
        fileIndex,
        rankIndex,
        algebraicNotation: position,
      };
    } else {
      const { fileIndex, rankIndex } = position;
      normalizedPosition = {
        fileIndex,
        rankIndex,
        algebraicNotation: `${fileIndex}${rankIndex}` as AlgebraicNotation,
      };
    }

    // console.log({ position, normalizedPosition });

    // * Step 2: Convert algebraic notation to indices and update normalizedPosition

    const fileIndex =
      BoardUtils.reverseFileMap.get(
        normalizedPosition.fileIndex as ChessFile
      ) ?? -1;
    const rankIndex =
      BoardUtils.reverseRankMap.get(
        normalizedPosition.rankIndex as ChessRank
      ) ?? -1;

    const hasInvalidPosition = [fileIndex, rankIndex].includes(-1);
    if (hasInvalidPosition) {
      throw new Error(`"Invalid position: ${normalizedPosition}`);
    }

    // * Step 3: Update normalizedPosition to use indices instead of algebraic notation
    normalizedPosition.fileIndex = fileIndex.toString();
    normalizedPosition.rankIndex = rankIndex.toString();

    // * Step 4: Create the piece using the updated normalizedPosition
    const piece = new Piece(type, color, normalizedPosition);

    // * Step 5: Attach to board
    piece.attachToBoard(this.container);

    // * Step 6: Update square occupation

    // this.updateSquareOccupation(
    //   normalizedPosition.algebraicNotation as AlgebraicNotation,
    //   piece
    // );

    this.updateSquareHighlight({
      targetSquares: normalizedPosition.algebraicNotation as AlgebraicNotation,
      type: "occupied",
      value: `${piece.type}-${piece.color}`,
      mode: "add",
    });

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

    this.updateSquareHighlight({
      targetSquares: algebraicNotation,
      type: "selected",
      mode: "add",
    });

    this.legalMovesForSelectedPiece = MovesGenerator.generateMoveForPiece(
      this.selectedPiece,
      this.piecesMap,
      this.currentPlayer
    );

    this.updateSquareHighlight({
      targetSquares: this.legalMovesForSelectedPiece,
      type: "can-move",
      mode: "add",
    });
  };

  public clearSelectedPiece = (oldPosition?: AlgebraicNotation): void => {
    if (!this.selectedPiece) {
      return;
    }

    this.updateSquareHighlight({
      targetSquares:
        oldPosition || this.selectedPiece.position.algebraicNotation,
      type: "selected",
      mode: "remove",
    });

    this.updateSquareHighlight({
      targetSquares: this.legalMovesForSelectedPiece,
      type: "can-move",
      mode: "remove",
    });

    this.selectedPiece = null;
  };

  public elementIsPieceSelected = (el: HTMLElement): boolean => {
    const piece: Piece = this.getPieceFromElement(el);

    return Boolean(piece) && piece === this.selectedPiece;
  };

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

  // TODO: not finished yet
  public updatePiecePosition = (
    piece: Piece,
    rankIndex: number,
    fileIndex: number,
    noAnimation: boolean = false
  ) => {
    // TODOs for much later:
    // TODO: Verify if we're not in check (legal moves)
    // TODO: Verify if the piece we're trying to move ain't pinned (legal moves)
    // TODO: Verify if we're not stalemated (legal moves)

    // if (this.boardPerspective === "black") {
    //   fileIndex = 7 - fileIndex;
    //   rankIndex = 7 - rankIndex;
    // }

    const oldPosition = piece.position;

    console.log("piece", piece);

    fileIndex = clamp(0, fileIndex, 7);
    rankIndex = clamp(0, rankIndex, 7);

    const file: ChessFile = BoardUtils.fileMap.get(fileIndex)!;
    const rank: ChessRank = BoardUtils.rankMap.get(rankIndex)!;

    const algebraicNotation: AlgebraicNotation = `${file}${rank}`;

    const targetPiece = this.piecesMap.get(algebraicNotation);

    // * 1. If the piece is not your turn, don't allow the move
    if (piece.color !== this.currentTurn) {
      console.error("Not your turn ! Cannot move piece.");
      piece.moveTo(oldPosition, noAnimation);
      return;
    }

    // * 2. If the square is occupied by a friendly piece, don't allow the move
    const squareIsOccupiedByFriendlyPiece =
      targetPiece && targetPiece.color === piece.color;

    if (squareIsOccupiedByFriendlyPiece) {
      console.warn(
        "%cSquare is occupied by a friendly piece, returning back to original position",
        "color: white; font-weight: bold; padding: 2px 4px; border-radius: 4px;",
        oldPosition
      );

      piece.moveTo(oldPosition, noAnimation);
      return; // Don't proceed with the move
    }

    // TODO: Actually check for REAL legal moves
    const isPseudoIllegalMove =
      !this.legalMovesForSelectedPiece.includes(algebraicNotation);

    if (isPseudoIllegalMove) {
      console.warn(
        "%cIllegal pseudo-move !!!! Returning back to original position",
        "background: darkyellow; color: white; font-weight: bold; padding: 2px 4px; border-radius: 4px;",
        oldPosition
      );

      piece.moveTo(oldPosition, noAnimation);
      // TODO for much later: play error sound
      return; // Don't proceed with the move
    }

    // * 2. If the square is occupied by an enemy piece, capture it
    if (targetPiece && targetPiece.color !== piece.color) {
      // Capture if another piece is on the target square
      this.capturePiece(targetPiece, noAnimation);
    }

    // TODO: If the move is illegal, don't allow it

    // TODO: This is temporary, later on we'll record the move history

    const newPosition: IPieceAlgorithm["position"] = {
      fileIndex: `${fileIndex}`,
      rankIndex: `${rankIndex}`,
      algebraicNotation,
    };
    piece.moveTo(
      {
        fileIndex: `${fileIndex}`,
        rankIndex: `${rankIndex}`,
        algebraicNotation,
      },
      noAnimation
    );

    // Update the pieces map
    this.piecesMap.delete(oldPosition.algebraicNotation as AlgebraicNotation);
    this.piecesMap.set(algebraicNotation, piece);

    // TODO: Update this method
    this.updateSquareHighlight({
      targetSquares: oldPosition.algebraicNotation,
      type: "occupied",
      mode: "remove",
    });

    this.updateSquareHighlight({
      targetSquares: newPosition.algebraicNotation,
      type: "occupied",
      value: `${piece.color}-${piece.type}`,
      mode: "add",
    });

    this.switchTurnTo();

    this.updateSquareHighlight({
      targetSquares: this.legalMovesForSelectedPiece,
      type: "can-move",
      mode: "remove",
    });

    this.clearSelectedPiece(oldPosition.algebraicNotation);
  };

  private capturePiece = (targetPiece: Piece, noAnimation: boolean): void => {
    const animate: boolean = !noAnimation;
    targetPiece.delete({ animate }); // Remove from DOM
    this.piecesMap.delete(
      targetPiece.position.algebraicNotation as AlgebraicNotation
    ); // Remove from internal map
  };

  // Placeholder for FEN and PGN methods
  public loadFen = (fen: string): void => {};
  // Placeholder for FEN and PGN methods
  public loadPgn = (pgn: string): void => {};
}

export default ChessBoard;
