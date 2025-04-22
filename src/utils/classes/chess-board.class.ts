import { getInnerCssVariables } from "@utils/functions/helper-functions/dom.functions";
import Piece, { Color, IPieceAlgorithm, PieceType } from "./piece.class";
import { clamp } from "@utils/functions/helper-functions/number.functions";

export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type Rank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

export type AlgebraicNotation = `${File}${Rank}`;

class ChessBoard {
  public static fileMap = new Map<number, File>(
    Array.from<unknown, [number, File]>({ length: 8 }, (_, index) => [
      index,
      String.fromCharCode(97 + index) as File,
    ])
  );

  public static reverseFileMap = new Map<File, number>(
    Array.from<unknown, [File, number]>({ length: 8 }, (_, index) => [
      String.fromCharCode(97 + index) as File,
      index,
    ])
  );

  public static rankMap = new Map<number, Rank>(
    Array.from<unknown, [number, Rank]>({ length: 8 }, (_, index) => [
      index,
      (8 - index).toString() as Rank,
    ])
  );

  public static reverseRankMap = new Map<Rank, number>(
    Array.from<unknown, [Rank, number]>({ length: 8 }, (_, index) => [
      (8 - index).toString() as Rank,
      index,
    ])
  );

  private container: HTMLElement;
  private readonly initialFen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  private pieces = new Map<string, Piece>();

  public selectedPiece: Piece | null = null;
  public squareSize: number = NaN;
  public boardPerspective: Color = "white";

  constructor(container: HTMLElement) {
    this.container = container;

    const parsedSquaredSizeCssVariable = getInnerCssVariables(
      container,
      "--_square-size"
    );

    console.log({ parsedSquaredSizeCssVariable });

    this.squareSize = Number(
      getInnerCssVariables(this.container, "--_square-size").replace(
        /px|%/g,
        ""
      )
    );
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
    color: Color,
    position:
      | Omit<IPieceAlgorithm["position"], "algebraicNotation">
      | AlgebraicNotation
  ): void => {
    let normalizedPosition: IPieceAlgorithm["position"];

    // Step 1: Normalize the position
    // ? If it's an algebraic notation
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

    // Step 2: Create the piece
    const piece = new Piece(type, color, normalizedPosition);

    // Step 3: Attach to board
    piece.attachToBoard(this.container);

    // Step 4: Save to internal map
    this.pieces.set(normalizedPosition.algebraicNotation, piece);
  };

  public dragPiece = (piece: Piece, offsetX: number, offsetY: number) => {
    piece.drag(offsetX, offsetY);
  };

  public selectPiece = (el: HTMLElement) => {
    const piece = this.getPieceFromElement(el);
    if (!piece) {
      return;
    }

    this.clearSelectedPiece();
    this.selectedPiece = piece;
    piece.element.classList.add("selected");
  };

  public elementIsChessPiece = (element: HTMLElement): boolean => {
    if (!element) {
      return false;
    }

    return element.hasAttribute("data-piece");
  };

  public clearSelectedPiece = () => {
    if (!this.selectedPiece) {
      return;
    }

    this.selectedPiece.element.classList.remove("selected");
    this.selectedPiece = null;
  };

  public elementIsPieceSelected = (el: HTMLElement): boolean => {
    const piece: Piece = this.getPieceFromElement(el);

    return Boolean(piece) && piece === this.selectedPiece;
  };

  // TODO: not finished yet
  public updatePiecePosition = (
    piece: Piece,
    rankIndex: number,
    fileIndex: number,
    noAnimation: boolean = false
  ) => {
    if (this.boardPerspective === "black") {
      fileIndex = 7 - fileIndex;
      rankIndex = 7 - rankIndex;
    }

    fileIndex = clamp(0, fileIndex, 7);
    rankIndex = clamp(0, rankIndex, 7);

    const file: File = ChessBoard.fileMap.get(fileIndex);
    const rank: Rank = ChessBoard.rankMap.get(rankIndex);
    const algebraicNotation: AlgebraicNotation = `${file}${rank}`;

    const newPosition: IPieceAlgorithm["position"] = {
      file: `${fileIndex}`,
      rank: `${rankIndex}`,
      algebraicNotation,
    };

    piece.updatePosition(newPosition, noAnimation);

    // TODO: Update internal map
    // TODO for later: Also update FEN & PGN
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
