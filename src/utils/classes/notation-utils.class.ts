class NotationUtils {
  private static interpretFen = (fen: string) => {
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
    /*
    Abbreviations:
    K - King
    Q - Queen
    R - Rook
    B - Bishop
    N - Knight
    [No name] - Pawn
    0-0 = castling with rook h1 or rook h8 (kingside castling)
    0-0-0 = castling with rook a1 or rook a8 (queenside castling)
    x = captures
    + = check
    # = checkmate
    e.p. = captures "en passant"

    Promotion:
    - = 
    ex: e8=Q
    if it promotion causes check → e8=Q+
    if it promotion causes checkmate → e8=Q#
    if the promotion involves a capture → exf8=Q

    (not 100% accurate)

    NOTE: how tf do pawn captures work in movetext ?? ex: exf6
    where was the pawn before ? why not e5xf6 ???

    */
  };

  createASCIIBoard = (fen) => {
    const { pieces } = NotationUtils.interpretFen(fen);
    // TODO: Code needs refactor
    // TODO: Use BoardUtils class methods
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

    let asciiBoard: string = "";
    const border: string = "+-------------------------------+\n";
    const separator: string = "|";

    // Add the top border
    asciiBoard += border;

    // Add the ranks and pieces
    // TODO: improve code intelligibility
    for (let i = 0; i < 8; i++) {
      asciiBoard += separator;
      for (let j = 0; j < 8; j++) {
        const piece: string = pieces.get(ranks[i] + files[j]);
        asciiBoard += ` ${piece} ` + separator;
      }
      const rank = ranks[i];
      asciiBoard += ` ${rank}\n`;
      asciiBoard += border;
    }

    // Add the file labels at the bottom
    asciiBoard += "  ";
    for (let file of files) {
      asciiBoard += ` ${file}  `;
    }
    asciiBoard += "\n";

    return asciiBoard;
  };
}

export default NotationUtils;
