import { PieceColor } from "./piece.class"; // Assuming Piece class is imported

export type CastlingRights = Record<"kingSide" | "queenSide", boolean>;
export type CastlingRightsMap = Map<"kingSide" | "queenSide", boolean>;

class Player {
  public color: PieceColor;

  private readonly castlingRights = {
    kingSide: true,
    queenSide: true,
  } as const;

  public canCastle: CastlingRightsMap = new Map<
    "kingSide" | "queenSide",
    boolean
  >(
    Object.entries(this.castlingRights) as [
      keyof typeof this.castlingRights,
      boolean
    ][]
  );

  public inCheck: boolean = false;

  constructor(color: PieceColor) {
    this.color = color;
  }

  public toggleOneSideCastling = (
    side: "kingSide" | "queenSide",
    value: boolean
  ): this => {
    this.canCastle.set(side, value);

    return this;
  };

  public toggleAllCastling = (value: boolean): this => {
    this.canCastle.set("kingSide", value);
    this.canCastle.set("queenSide", value);

    return this;
  };

  public setInCheck = (inCheck: boolean): this => {
    this.inCheck = inCheck;
    return this;
  };
}

export default Player;
