import {
  getInnerCssVariables,
  selectQuery,
} from "@utils/functions/helper-functions/dom.functions";
import Piece, { PieceColor, IPieceAlgorithm, PieceType } from "./piece.class";
import { clamp } from "@utils/functions/helper-functions/number.functions";

export type ChessFile = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type ChessRank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

export type AlgebraicNotation = `${ChessFile}${ChessRank}`;

class ChessBoard {
  public static fileMap = new Map<number, ChessFile>(
    Array.from<unknown, [number, ChessFile]>({ length: 8 }, (_, index) => [
      index,
      String.fromCharCode(97 + index) as ChessFile,
    ])
  );

  public static reverseFileMap = new Map<ChessFile, number>(
    Array.from<unknown, [ChessFile, number]>({ length: 8 }, (_, index) => [
      String.fromCharCode(97 + index) as ChessFile,
      index,
    ])
  );

  public static rankMap = new Map<number, ChessRank>(
    Array.from<unknown, [number, ChessRank]>({ length: 8 }, (_, index) => [
      index,
      (8 - index).toString() as ChessRank,
    ])
  );

  public static reverseRankMap = new Map<ChessRank, number>(
    Array.from<unknown, [ChessRank, number]>({ length: 8 }, (_, index) => [
      (8 - index).toString() as ChessRank,
      index,
    ])
  );

  public static getBoardIndicesFromAlgebraicNotation = (
    algebraicNotation: AlgebraicNotation
  ): IPieceAlgorithm["position"] => {
    const [file, rank] = algebraicNotation;

    const fileIndex = ChessBoard.reverseFileMap.get(file as ChessFile);
    const rankIndex = ChessBoard.reverseRankMap.get(rank as ChessRank);

    return {
      algebraicNotation,
      file: `${fileIndex}`,
      rank: `${rankIndex}`,
    };
  };

  private container: HTMLElement;
  private readonly initialFen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  private pieces = new Map<string, Piece>();

  public selectedPiece: Piece | null = null;
  public boardPerspective: PieceColor = "white";

  public currentTurn: PieceColor = "white";

  constructor(container: HTMLElement) {
    this.container = container;
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

  // Generates the board layout
  public generateBoard = (): void => {
    this.container.innerHTML = ""; // clear container

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square: HTMLDivElement = document.createElement("div");
        square.classList.add("chess__square");

        square.dataset.file = file.toString();
        square.dataset.rank = rank.toString();
        square.dataset.algebraicNotation =
          ChessBoard.fileMap.get(file) + ChessBoard.rankMap.get(rank);

        const isLight: boolean = (file + rank) % 2 === 0;
        square.classList.add(isLight ? "light-square" : "dark-square");

        // Add file label (letters 'a' to 'h') to the bottom row (rank === 7)
        if (rank === 7) {
          const fileLabel = document.createElement("p");
          fileLabel.classList.add(
            ...[
              "chess__label",
              `chess__label--${isLight ? "dark" : "light"}`,
              "chess__label--file",
            ]
          );
          fileLabel.textContent = ChessBoard.fileMap.get(file); // Get file label from the Map
          square.appendChild(fileLabel);
        }

        // Add rank number (8 to 1) to the first column (file === 0)
        if (file === 0) {
          const rankLabel = document.createElement("p");
          rankLabel.classList.add(
            ...[
              "chess__label",
              `chess__label--${isLight ? "dark" : "light"}`,
              "chess__label--rank",
            ]
          );
          rankLabel.textContent = ChessBoard.rankMap.get(rank); // Get rank number from the Map
          square.appendChild(rankLabel);
        }

        this.container.appendChild(square);
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
      const [file, rank] = position;

      normalizedPosition = {
        file,
        rank,
        algebraicNotation: position,
      };
    } else {
      const { file, rank } = position;
      normalizedPosition = {
        file,
        rank,
        algebraicNotation: `${file}${rank}`,
      };
    }

    // Step 2: Convert algebraic notation to indices and update normalizedPosition

    const fileIndex =
      ChessBoard.reverseFileMap.get(normalizedPosition.file as ChessFile) ?? -1;
    const rankIndex =
      ChessBoard.reverseRankMap.get(normalizedPosition.rank as ChessRank) ?? -1;

    const hasInvalidPosition = [fileIndex, rankIndex].includes(-1);
    if (hasInvalidPosition) {
      throw new Error(`"Invalid position: ${normalizedPosition}`);
    }

    // Step 3: Update normalizedPosition to use indices instead of algebraic notation
    normalizedPosition.file = fileIndex.toString();
    normalizedPosition.rank = rankIndex.toString();

    // Step 4: Create the piece using the updated normalizedPosition
    const piece = new Piece(type, color, normalizedPosition);

    // Step 5: Attach to board
    piece.attachToBoard(this.container);

    // Step 6: Save to internal map
    this.pieces.set(normalizedPosition.algebraicNotation, piece);
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

    this.selectPiece(piece.element);

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
    piece.element.classList.add("selected");

    const { algebraicNotation } = piece.position;
    const pieceSquare = selectQuery(
      `[data-algebraic-notation="${algebraicNotation}"]`,
      this.container
    );
    pieceSquare.classList.add("selected");
  };

  public clearSelectedPiece = (): void => {
    if (!this.selectedPiece) {
      return;
    }

    const pieceSquare = selectQuery(
      ".selected[data-algebraic-notation]",
      this.container
    );

    pieceSquare.classList.remove("selected");

    this.selectedPiece.element.classList.remove("selected");
    this.selectedPiece = null;
  };

  public elementIsPieceSelected = (el: HTMLElement): boolean => {
    const piece: Piece = this.getPieceFromElement(el);

    return Boolean(piece) && piece === this.selectedPiece;
  };

  public switchTurnTo = (color?: PieceColor): void => {
    if (color) {
      this.currentTurn = color;
      return;
    }

    this.currentTurn = this.currentTurn === "white" ? "black" : "white";
  };

  // TODO: not finished yet
  public updatePiecePosition = (
    piece: Piece,
    rankIndex: number,
    fileIndex: number,
    noAnimation: boolean = false
  ) => {
    console.log("updatePiecePosition", piece, rankIndex, fileIndex);
    // TODO: Verify if we're not in check (legal moves)
    // TODO: Verify if the piece we're trying to move ain't pinned (legal moves)
    // TODO: Verify if we're not stalemated (legal moves)

    // if (piece.color !== this.currentTurn) {
    //   console.log("Not your turn!");
    //   return;
    // }

    // if (this.boardPerspective === "black") {
    //   fileIndex = 7 - fileIndex;
    //   rankIndex = 7 - rankIndex;
    // }

    fileIndex = clamp(0, fileIndex, 7);
    rankIndex = clamp(0, rankIndex, 7);

    const file = ChessBoard.fileMap.get(fileIndex)!;
    const rank = ChessBoard.rankMap.get(rankIndex)!;
    const algebraicNotation: AlgebraicNotation = `${file}${rank}`;

    const targetPiece = this.pieces.get(algebraicNotation);

    // * 1. If the piece is not your turn, don't allow the move
    if (piece.color !== this.currentTurn) {
      console.error("Not your turn ! Cannot move piece.");
      piece.moveTo(piece.position, noAnimation);
      return;
    }

    // * 2. If the square is occupied by a friendly piece, don't allow the move
    if (targetPiece && targetPiece.color === piece.color) {
      console.log("Returning back to original position", piece.position);
      piece.moveTo(piece.position, noAnimation);
      return; // Don't proceed with the move
    }

    // TODO: If the move is illegal, don't allow it

    // * 2. If the square is occupied by an enemy piece, capture it
    if (targetPiece && targetPiece.color !== piece.color) {
      // Capture if another piece is on the target square
      this.capturePiece(targetPiece, noAnimation);
    }

    const oldPosition = piece.position.algebraicNotation;
    const hasMoved = oldPosition !== algebraicNotation;

    piece.moveTo(
      {
        file: `${fileIndex}`,
        rank: `${rankIndex}`,
        algebraicNotation,
      },
      noAnimation
    );

    // Update internal pieces map
    if (hasMoved) {
      this.pieces.delete(oldPosition);
      this.pieces.set(algebraicNotation, piece);
      this.switchTurnTo();
    }
  };

  private capturePiece = (targetPiece: Piece, noAnimation: boolean): void => {
    const animate: boolean = !noAnimation;
    targetPiece.delete({ animate }); // Remove from DOM
    this.pieces.delete(targetPiece.position.algebraicNotation); // Remove from internal map
  };

  // Placeholder for FEN and PGN methods
  public loadFen = (fen: string): void => {
    /* TODO: Parse FEN */
  };

  private interpretFen = (fen: string) => {
    const [
      board,
      sideToMoveRaw,
      castlingRightsRaw,
      enPassantRaw,
      halfMoveClock,
      fullMoveNumber,
    ] = fen.split(" ");

    const rows = board.split("/");

    const pieces: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const char: string = rows[i];
      const expandedRow = char.replace(/\d/g, (match) =>
        " ".repeat(Number(match))
      );
      pieces.push(expandedRow);
    }

    const sideToMove: "white" | "black" =
      sideToMoveRaw === "w" ? "white" : "black";

    const castlingRights = {
      white: {
        kingSide: castlingRightsRaw.includes("K"),
        queenSide: castlingRightsRaw.includes("Q"),
      },
      black: {
        kingSide: castlingRightsRaw.includes("k"),
        queenSide: castlingRightsRaw.includes("q"),
      },
    } as const;

    let enPassant = null;

    if (enPassantRaw !== "-") {
      enPassant = {
        square: enPassantRaw,
        file: enPassantRaw[0],
        rank: enPassantRaw[1],
      };
    }

    return {
      pieces,
      sideToMove,
      castlingRights,
      enPassant,
      halfMoveClock: Number(halfMoveClock),
      fullMoveNumber: Number(fullMoveNumber),
    };
  };

  public loadPgn = (pgn: string): void => {
    /* TODO: Parse PGN */
  };
}

export default ChessBoard;
