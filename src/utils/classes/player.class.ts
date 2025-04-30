import { PieceColor } from "./piece.class"; // Assuming Piece class is imported

export type CastlingRights = Record<"kingSide" | "queenSide", boolean>;

class Player {
  public color: PieceColor;
  public canCastle: CastlingRights;
  public inCheck: boolean;

  constructor(color: PieceColor) {
    this.color = color;
    this.canCastle = { kingSide: true, queenSide: true };
    this.inCheck = false; // Default value
  }

  // Setter methods for properties
  public setCanCastle = (rights: Partial<CastlingRights>): this => {
    this.canCastle = { ...this.canCastle, ...rights };
    return this;
  };

  public setInCheck = (inCheck: boolean): this => {
    this.inCheck = inCheck;
    return this;
  };
}

export default Player;
