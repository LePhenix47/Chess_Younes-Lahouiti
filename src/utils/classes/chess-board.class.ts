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
  selectPiece(el: HTMLElement): void;
  clearSelectedPiece(): void;
}

interface IBoardUI {
  highlightSelectedSquare(an: AlgebraicNotation): void;
  highlightMoveTargets(moves: AlgebraicNotation[]): void;
  clearSelectedHighlights(): void;
}

class ChessBoard implements IGameLogic, IBoardUI {
  private container: HTMLElement;
  private readonly initialFen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  private readonly pieces = new Map<AlgebraicNotation, Piece>();
  private readonly squareElements = new Map<AlgebraicNotation, HTMLElement>();

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

        this.squareElements.set(
          square.dataset.algebraicNotation as AlgebraicNotation,
          square
        );
      }
    }
  };

  public getPieceFromElement = (el: HTMLElement): Piece | null => {
    const piece: Piece | null = [...this.pieces.values()].find(
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

    // Step 1: Normalize the position
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

    // Step 2: Convert algebraic notation to indices and update normalizedPosition

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

    // Step 3: Update normalizedPosition to use indices instead of algebraic notation
    normalizedPosition.fileIndex = fileIndex.toString();
    normalizedPosition.rankIndex = rankIndex.toString();

    // Step 4: Create the piece using the updated normalizedPosition
    const piece = new Piece(type, color, normalizedPosition);

    // Step 5: Attach to board
    piece.attachToBoard(this.container);

    // Step 6: Save to internal map
    this.pieces.set(
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
    this.highlightSelectedSquare(algebraicNotation);

    this.legalMovesForSelectedPiece = MovesGenerator.generateMoveForPiece(
      this.selectedPiece,
      this.pieces,
      this.currentPlayer
    );

    this.highlightMoveTargets(this.legalMovesForSelectedPiece);
  };

  public clearSelectedPiece = (): void => {
    if (!this.selectedPiece) {
      return;
    }

    this.clearSelectedHighlights();
    this.clearSquareMoves();

    this.selectedPiece = null;
  };

  public elementIsPieceSelected = (el: HTMLElement): boolean => {
    const piece: Piece = this.getPieceFromElement(el);

    return Boolean(piece) && piece === this.selectedPiece;
  };

  public highlightSelectedSquare = (an: AlgebraicNotation): void => {
    const square: HTMLElement = this.squareElements.get(an);

    square?.classList?.add?.("selected");
  };

  public highlightMoveTargets = (moves: AlgebraicNotation[]): void => {
    for (const an of moves) {
      const square: HTMLElement = this.squareElements.get(an);

      square?.classList?.add?.("can-move");
    }
  };

  public clearSelectedHighlights = (): void => {
    const pieceSquare = this.container.querySelector(
      ".selected[data-algebraic-notation]"
    );

    console.log(
      "pieceSquare",
      pieceSquare,
      this.squareElements.get(this.selectedPiece.position.algebraicNotation)
    );

    pieceSquare.classList.remove("selected");
  };

  public clearSquareMoves = (): void => {
    for (const an of this.legalMovesForSelectedPiece) {
      const square: HTMLElement = this.squareElements.get(an);

      square?.classList?.remove?.("can-move");
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

    const targetPiece = this.pieces.get(algebraicNotation);

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

    piece.moveTo(
      {
        fileIndex: `${fileIndex}`,
        rankIndex: `${rankIndex}`,
        algebraicNotation,
      },
      noAnimation
    );

    // Update the pieces map
    this.pieces.delete(oldPosition.algebraicNotation as AlgebraicNotation);
    this.pieces.set(algebraicNotation, piece);

    this.switchTurnTo();

    this.clearSquareMoves();

    this.clearSelectedPiece();
  };

  private capturePiece = (targetPiece: Piece, noAnimation: boolean): void => {
    const animate: boolean = !noAnimation;
    targetPiece.delete({ animate }); // Remove from DOM
    this.pieces.delete(
      targetPiece.position.algebraicNotation as AlgebraicNotation
    ); // Remove from internal map
  };

  // Placeholder for FEN and PGN methods
  public loadFen = (fen: string): void => {};
  // Placeholder for FEN and PGN methods
  public loadPgn = (pgn: string): void => {};
}

export default ChessBoard;
