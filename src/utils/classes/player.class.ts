import { PieceColor } from "./piece.class"; // Assuming Piece class is imported

export type CastlingRights = Record<"kingSide" | "queenSide", boolean>;
export type CastlingRightsMap = Map<"kingSide" | "queenSide", boolean>;

class Player {
  public color: PieceColor;

  private readonly castlingRights = {
    kingSide: false,
    queenSide: false,
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

  // Setter methods for properties
  public setCanCastle = (
    rights: Partial<Record<"kingSide" | "queenSide", boolean>>
  ): this => {
    for (const [key, value] of Object.entries(rights)) {
      this.canCastle.set(key as "kingSide" | "queenSide", value);
    }

    return this;
  };

  public setInCheck = (inCheck: boolean): this => {
    this.inCheck = inCheck;
    return this;
  };
}

export default Player;
