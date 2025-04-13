class ChessBoard {
  private container: HTMLElement;
  private readonly initialFen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  constructor(container: HTMLElement) {
    this.container = container;
  }

  // Generates the board layout
  public generateBoard = (): void => {
    this.container.innerHTML = ""; // clear container

    // ? Initialize the fileMap using a Map (0-7 to 'a' to 'h')
    const fileMap = new Map<number, string>(
      Array.from({ length: 8 }, (_, index) => [
        index,
        String.fromCharCode(97 + index),
      ])
    );

    // ? Initialize the rankMap using a Map (0-7 to '8' to '1')
    const rankMap = new Map<number, string>(
      Array.from({ length: 8 }, (_, index) => [index, (8 - index).toString()])
    );

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square: HTMLDivElement = document.createElement("div");
        square.classList.add("chess__square");

        square.dataset.file = file.toString();
        square.dataset.rank = rank.toString();

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
          fileLabel.textContent = fileMap.get(file); // Get file label from the Map
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
          rankLabel.textContent = rankMap.get(rank); // Get rank number from the Map
          square.appendChild(rankLabel);
        }

        this.container.appendChild(square);
      }
    }
  };

  // Placeholder for FEN and PGN methods
  public loadFen = (fen: string): void => {
    /* TODO: Parse FEN */
  };
  public loadPgn = (pgn: string): void => {
    /* TODO: Parse PGN */
  };
}

export default ChessBoard;
