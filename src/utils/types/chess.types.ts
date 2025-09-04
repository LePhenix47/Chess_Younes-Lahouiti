import Piece, { PieceType } from "../classes/piece.class";

export type ChessFile = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type ChessRank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

export type AlgebraicNotation = `${ChessFile}${ChessRank}`;

export type Move = {
  from: AlgebraicNotation;
  to: AlgebraicNotation;
  piece: Piece;
  capturedPiece?: Piece;
  promotion?: PieceType;
};

export type WinLossResult = "checkmate" | "resign" | "timeout";
export type DrawResult =
  | "draw-agreement"
  | "threefold-repetition"
  | "50-move-rule"
  | "stalemate"
  | "insufficient-checkmating-material"
  | "timeout-vs-insufficient-material";

export type PlayerMaterialCount = {
  kings: number;
  pawns: number;
  bishops: number;
  knights: number;
  rooks: number;
  queens: number;
  bishopColors: Set<"light" | "dark">;
};