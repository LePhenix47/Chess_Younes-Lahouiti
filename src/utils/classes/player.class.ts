import { PieceColor } from "./piece.class"; // Assuming Piece class is imported

class Player {
  public color: PieceColor;
  public canCastle: boolean;
  public inCheck: boolean;

  constructor(color: PieceColor) {
    this.color = color;
    this.canCastle = true; // Default value
    this.inCheck = false; // Default value
  }

  // Setter methods for properties
  public setCanCastle = (canCastle: boolean): this => {
    this.canCastle = canCastle;
    return this;
  };

  public setInCheck = (inCheck: boolean): this => {
    this.inCheck = inCheck;
    return this;
  };
}

export default Player;
