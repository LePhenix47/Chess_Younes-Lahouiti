import BoardUtils from "./board-utils.class";
import { LegalMoves } from "./chess-board-controller";
import {
  AlgebraicNotation,
  ChessFile,
  ChessRank,
  Move,
} from "./chess-board.class";
import Piece, {
  PgnPieceType,
  PgnPromotionPieceType,
  PieceType,
  PieceTypeMap,
} from "./piece.class";

// pgn.types.ts

export type CastleNotation = "O-O" | "O-O-O";

export type CaptureIndicator = `${ChessFile | ""}x` | "";

export type PromotionNotation = "" | `=${PgnPromotionPieceType}`;

export type CheckSuffix = "+" | "#" | "";

export type Disambiguation = string; // "e", "4", "e4", or ""

export type PgnMoveText =
  | CastleNotation
  | `${PgnPieceType}${Disambiguation}${CaptureIndicator}${AlgebraicNotation}${
      | PromotionNotation
      | ""}${CheckSuffix}`;

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

  public static createASCIIBoard = (fen: string): string => {
    const { pieces } = NotationUtils.interpretFen(fen);
    const files = [...BoardUtils.reverseFileMap.keys()] as const;
    const ranks = [...BoardUtils.reverseRankMap.keys()] as const;

    // Settings based on emoji mode
    const cellWidth = 5; // includes vertical bars
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

  public static formatPgnMoves = (moves: PgnMoveText[]): string => {
    const lines: string[] = [];

    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber: number = Math.floor(i / 2) + 1;

      const whiteMove: PgnMoveText = moves[i];
      const blackMove: PgnMoveText | "" = moves[i + 1] || "";

      const formattedPgnMove =
        `${moveNumber}. ${whiteMove} ${blackMove}`.trim();

      lines.push(formattedPgnMove);
    }

    return lines.join(" ");
  };

  public static recordPgnMove = ({
    move,
    isCheck,
    isCheckmate,
    castle,
    legalMoves,
  }: {
    move: Move;
    isCheck: boolean;
    isCheckmate: boolean;
    castle: "kingSide" | "queenSide" | null;
    legalMoves: LegalMoves;
  }): string => {
    if (castle) {
      return NotationUtils.formatCastling(castle);
    }

    const { from, to, piece, capturedPiece, promotion } = move;
    const isPawn = Piece.isType(piece.type, "pawn");

    const pieceChar = NotationUtils.getPieceChar({ piece, promotion });

    const disambiguation = NotationUtils.getDisambiguation({
      move,
      legalMoves,
    });
    const capture = NotationUtils.getCaptureIndicator({
      isPawnMove: isPawn || Boolean(promotion),
      from,
      capturedPiece,
    });

    const promotionText = NotationUtils.getPromotionText(promotion);
    const endSymbol = NotationUtils.getCheckOrCheckMateSuffix({
      isCheck,
      isCheckmate,
    });

    return `${pieceChar}${disambiguation}${capture}${to}${promotionText}${endSymbol}`;
  };

  private static formatCastling = (
    castle: "kingSide" | "queenSide"
  ): CastleNotation => {
    return castle === "kingSide" ? "O-O" : "O-O-O";
  };

  private static getPieceChar = ({
    piece,
    promotion,
  }: {
    piece: Piece;
    promotion?: PieceType;
  }): string => {
    // If it's a pawn (including promotion), no piece letter
    if (Piece.isType(piece.type, "pawn") || promotion) {
      return "";
    }

    return piece.pgnSymbol;
  };

  private static getDisambiguation = ({
    move,
    legalMoves,
  }: {
    move: Move;
    legalMoves: LegalMoves;
  }): Disambiguation => {
    const { from, to, piece } = move;
    if (Piece.isType(piece.type, "pawn")) {
      return "";
    }
    const [fromFile, fromRank] = from;

    const isSamePieceType = (p: Piece) =>
      p.type === piece.type &&
      p.color === piece.color &&
      p.position.algebraicNotation !== from;

    // ♟️ Find ambiguous pieces of same type that could have moved to `to`
    const ambiguousPieces = legalMoves
      .filter(({ piece: p, moves }) => isSamePieceType(p) && moves.includes(to))
      .map(({ piece: p }) => p);

    if (!ambiguousPieces.length) {
      return "";
    }

    const conflictsOnFile = ambiguousPieces.some(
      (p) => p.position.algebraicNotation[0] === fromFile
    );

    const conflictsOnRank = ambiguousPieces.some(
      (p) => p.position.algebraicNotation[1] === fromRank
    );

    if (!conflictsOnFile) {
      return fromFile;
    }
    if (!conflictsOnRank) {
      return fromRank;
    }

    return fromFile + fromRank;
  };

  private static getCaptureIndicator = ({
    isPawnMove,
    from,
    capturedPiece,
  }: {
    isPawnMove: boolean;
    from: AlgebraicNotation;
    capturedPiece?: Piece;
  }): CaptureIndicator => {
    if (!capturedPiece) {
      return "";
    }

    const [file] = from;

    // 🧤 For pawns, capture must include the file
    return isPawnMove ? `${file as ChessFile}x` : "x";
  };

  private static getPromotionText = (
    promotion?: PieceType
  ): PromotionNotation => {
    if (!promotion) {
      return "";
    }

    const symbol = Piece.getPgnSymbol<PgnPromotionPieceType>(promotion);

    return `=${symbol}`;
  };

  private static getCheckOrCheckMateSuffix = ({
    isCheck,
    isCheckmate,
  }: {
    isCheck: boolean;
    isCheckmate: boolean;
  }): CheckSuffix => {
    if (isCheckmate) {
      return "#";
    } else if (isCheck) {
      return "+";
    } else {
      return "";
    }
  };
}

export default NotationUtils;
