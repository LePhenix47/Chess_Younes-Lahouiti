import { getInnerCssVariables } from "@utils/functions/helper-functions/dom.functions";
import Piece, { Color, IPieceAlgorithm, PieceType } from "./piece.class";

type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
type Rank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

type AlgebraicNotation = `${File}${Rank}`;

class ChessBoard {
  private container: HTMLElement;
  private readonly initialFen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  private pieces = new Map<string, Piece>();

  public squareSize: number = NaN;

  // ? Initialize the fileMap using a Map (0-7 to 'a' to 'h')
  public fileMap = new Map<number, string>(
    Array.from({ length: 8 }, (_, index) => [
      index,
      String.fromCharCode(97 + index),
    ])
  );

  // ? Initialize the rankMap using a Map (0-7 to '8' to '1')
  public rankMap = new Map<number, string>(
    Array.from({ length: 8 }, (_, index) => [index, (8 - index).toString()])
  );

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
          this.fileMap.get(file) + this.rankMap.get(rank);

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
          fileLabel.textContent = this.fileMap.get(file); // Get file label from the Map
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
          rankLabel.textContent = this.rankMap.get(rank); // Get rank number from the Map
          square.appendChild(rankLabel);
        }

        this.container.appendChild(square);
      }
    }
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
    if (typeof position === "string") {
      const file = position[0];
      const rank = position[1];
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
