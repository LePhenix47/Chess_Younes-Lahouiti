import BoardUtils from "./board-utils.class";
import { AlgebraicNotation, ChessFile, ChessRank } from "./chess-board.class";
import Piece, { PieceTypeMap } from "./piece.class";

abstract class NotationUtils {
  public static interpretFen = (fen: string) => {
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
      const [file, rank] = enPassantRaw;
      enPassant = {
        square: enPassantRaw,
        fileIndex: BoardUtils.reverseFileMap.get(file as ChessFile),
        rankIndex: BoardUtils.reverseRankMap.get(rank as ChessRank),
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

  public static generateFenFromPosition = ({
    piecesMap,
    currentTurn,
    castlingRights,
    enPassantSquare,
    halfMoveClock,
    fullMoveNumber,
  }: {
    piecesMap: Map<AlgebraicNotation, Piece>;
    currentTurn: "white" | "black";
    castlingRights: {
      white: { kingSide: boolean; queenSide: boolean };
      black: { kingSide: boolean; queenSide: boolean };
    };
    enPassantSquare: AlgebraicNotation | null;
    halfMoveClock: number;
    fullMoveNumber: number;
  }): string => {
    let fenBoard = "";

    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
      let emptyCount = 0;

      for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
        const square: AlgebraicNotation =
          BoardUtils.getAlgebraicNotationFromBoardIndices(fileIndex, rankIndex);
        const piece: Piece = piecesMap.get(square);

        if (piece) {
          if (emptyCount > 0) {
            fenBoard += emptyCount;
            emptyCount = 0;
          }

          const key = `${piece.color}-${piece.type}` as PieceTypeMap;
          fenBoard += Piece.pieceToFenSymbolMap.get(key) ?? "?";
        } else {
          emptyCount++;
        }
      }

      if (emptyCount > 0) {
        fenBoard += emptyCount;
      }

      if (rankIndex < 7) {
        fenBoard += "/";
      }
    }

    const sideToMove = currentTurn === "white" ? "w" : "b";

    const castlingParts = [];

    if (castlingRights.white.kingSide) castlingParts.push("K");
    if (castlingRights.white.queenSide) castlingParts.push("Q");
    if (castlingRights.black.kingSide) castlingParts.push("k");
    if (castlingRights.black.queenSide) castlingParts.push("q");

    const castling = castlingParts.length > 0 ? castlingParts.join("") : "-";

    const enPassant = enPassantSquare ?? "-";

    return `${fenBoard} ${sideToMove} ${castling} ${enPassant} ${halfMoveClock} ${fullMoveNumber}`;
  };

  static validateFenSyntax = (fen: string): boolean => {
    const fields = fen.trim().split(/\s+/);
    if (fields.length !== 6) return false;

    const [position, turn, castling, enPassant, halfmove, fullmove] = fields;

    // * 1. Validate position
    const ranks = position.split("/");
    if (ranks.length !== 8) return false;
    const validPieces = /^[prnbqkPRNBQK1-8]+$/;
    for (const rank of ranks) {
      if (!validPieces.test(rank)) return false;

      let count = 0;
      for (const char of rank) {
        if (/\d/.test(char)) {
          count += Number(char);
        } else {
          count += 1;
        }
      }
      if (count !== 8) return false;
    }

    // * 2. Turn
    if (!/^[wb]$/.test(turn)) return false;

    // * 3. Castling rights
    if (!/^(-|[KQkq]{1,4})$/.test(castling)) return false;

    // * 4. En passant
    if (!/^(-|[a-h][36])$/.test(enPassant)) return false;

    // * 5. Halfmove clock
    if (!/^\d+$/.test(halfmove)) return false;

    // * 6. Fullmove number
    if (!/^[1-9]\d*$/.test(fullmove)) return false;

    return true;
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

  public static createASCIIBoard = (
    fen: string,
    withEmojis: boolean = false
  ): string => {
    const { pieces } = NotationUtils.interpretFen(fen);
    const files = [...BoardUtils.reverseFileMap.keys()] as const;
    const ranks = [...BoardUtils.reverseRankMap.keys()] as const;

    // Settings based on emoji mode
    const cellWidth = withEmojis ? 7 : 5; // includes vertical bars
    const innerWidth = cellWidth - 2; // inside cell without border bars

    // Create border line: +------+
    const borderSegment = "-".repeat(innerWidth);
    const border = "+" + Array(8).fill(borderSegment).join("+") + "+\n";

    let asciiBoard = border;

    for (let i = 0; i < 8; i++) {
      const rankLine = pieces[i];
      asciiBoard += "|";

      for (let j = 0; j < 8; j++) {
        let char = rankLine[j] || " ";
        if (withEmojis) {
          char = char !== " " ? BoardUtils.pieceToEmojiMap.get(char)! : " ";
        }

        // center text inside the innerWidth space
        const paddingLeft = Math.floor((innerWidth - [...char].length) / 2);
        const paddingRight = innerWidth - paddingLeft - [...char].length;

        asciiBoard +=
          " ".repeat(paddingLeft) + char + " ".repeat(paddingRight) + "|";
      }
      const currentRank = ranks[i];
      asciiBoard += ` ${currentRank}\n`;
      asciiBoard += border;
    }

    // File labels aligned with cells
    asciiBoard += " ";
    for (const file of files) {
      const padLeft = Math.floor((innerWidth - 1) / 2);
      const padRight = innerWidth - padLeft;
      asciiBoard += " ".repeat(padLeft) + file + " ".repeat(padRight);
    }
    asciiBoard += "\n";

    return asciiBoard;
  };
}

export default NotationUtils;
