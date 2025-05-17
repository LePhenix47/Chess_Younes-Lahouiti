import AttacksGenerator, {
  OpponentAttackDetail,
} from "./attacks-generator.class";
import BaseMovesGenerator from "./base-moves-generator.class";
import BoardUtils from "./board-utils.class";
import ChessBoard, { AlgebraicNotation, ChessFile } from "./chess-board.class";
import {
  DirectionKey,
  KingPiece,
  Offset,
  SlidingPiece,
  SlidingPieceType,
} from "./move-generator.class";
import Piece, { PieceColor } from "./piece.class";
import Player from "./player.class";

export type CastleSquares = `${"c" | "d" | "e" | "f" | "g"}${"1" | "8"}`;

export type PinnedPieceInfo = {
  pinned: Piece;
  by: Piece;
  direction: Offset;
  pathToPin: AlgebraicNotation[];
};

abstract class RulesEngine {
  public static isMoveLegal = (
    board: ChessBoard,
    piece: Piece,
    to: AlgebraicNotation
  ): boolean => {
    if (piece.color !== board.currentTurn) {
      console.error("Not your turn! Cannot move piece.");
      return false;
    }

    const target: Piece = board.piecesMap.get(to);
    const isFriendlyFire: boolean = target?.color === piece.color;
    if (isFriendlyFire) {
      console.warn("Square occupied by friendly piece.");
      return false;
    }

    const isPseudoIllegalMove: boolean =
      !board.legalMovesForSelectedPiece?.includes(to);
    if (isPseudoIllegalMove) {
      console.warn("Illegal pseudo-move!");
      return false;
    }

    return true;
  };

  public static isKingInCheck = (
    pieces: Map<AlgebraicNotation, Piece>,
    player: Player,
    opponentAttacksDetailed?: OpponentAttackDetail[]
  ): boolean => {
    const king = ChessBoard.getPieceFromArray(
      pieces,
      "king",
      player.color
    ) as KingPiece;

    const opponentAttackingSquaresDetailed: OpponentAttackDetail[] =
      opponentAttacksDetailed ??
      AttacksGenerator.getAttackedSquaresByOpponentDetailed(player, pieces);

    const opponentAttackingSquares = opponentAttackingSquaresDetailed.flatMap(
      (x) => x.directions.flatMap((dir) => dir.attacks)
    );

    const isInCheck = opponentAttackingSquares.includes(
      king.position.algebraicNotation
    );

    return isInCheck;
  };

  public static filterIllegalKingMoves = (
    possibleKingMoves: AlgebraicNotation[],
    enemyAttackingSquares: AlgebraicNotation[]
  ): AlgebraicNotation[] => {
    const kingLegalMoves: AlgebraicNotation[] = possibleKingMoves.filter(
      (move) => !enemyAttackingSquares.includes(move)
    );

    return kingLegalMoves;
  };

  public static getAttackingPiecesAndPathToKing = (
    king: KingPiece,
    player: Player,
    pieces: Map<AlgebraicNotation, Piece>,
    opponentAttacksDetailed?: OpponentAttackDetail[]
  ): { attackingPiece: Piece; pathToKing: AlgebraicNotation[] }[] => {
    if (king.color !== player.color) {
      throw new Error("King must be of the player's color");
    }

    const kingSquare = king.position.algebraicNotation;
    const detailedAttacks =
      opponentAttacksDetailed ??
      AttacksGenerator.getAttackedSquaresByOpponentDetailed(player, pieces);

    const results: {
      attackingPiece: Piece;
      pathToKing: AlgebraicNotation[];
    }[] = [];

    for (const attackDetail of detailedAttacks) {
      for (const direction of attackDetail.directions) {
        const index: number = direction.attacks.indexOf(kingSquare);

        if (index === -1) {
          continue;
        }

        /*
        ? We found a direction that reaches the king
        ? Get path from attacker up to (but not including) the king
        */
        const directionOnTheAttacker = direction.attacks.slice(0, index);
        const path: AlgebraicNotation[] = [
          attackDetail.from,
          ...directionOnTheAttacker,
        ];

        results.push({
          attackingPiece: attackDetail.piece,
          pathToKing: path,
        });
      }
    }

    return results;
  };

  private static getCastleFileRank = (
    side: "kingSide" | "queenSide",
    color: PieceColor,
    includeCurrentSquare: boolean = false
  ) => {
    const rank = color === "white" ? "1" : "8";

    const files: ChessFile[] =
      side === "kingSide"
        ? ["f", "g"] // ? Squares the king touches: between, and destination
        : ["c", "d"];

    if (includeCurrentSquare) {
      files.push("e");
      files.sort();
    }

    return {
      rank,
      files,
    };
  };

  private static getCastleDangerSquares = (
    side: "kingSide" | "queenSide",
    color: PieceColor,
    includeCurrentSquare: boolean = false
  ): CastleSquares[] => {
    const { files, rank } = RulesEngine.getCastleFileRank(
      side,
      color,
      includeCurrentSquare
    );

    const squares = files.map((file) => `${file}${rank}` as CastleSquares);

    return squares;
  };

  public static canCastle = (
    side: "kingSide" | "queenSide",
    player: Player,
    pieces: Map<AlgebraicNotation, Piece>
  ): [
    { piece: KingPiece; position: AlgebraicNotation },
    { piece: SlidingPiece; position: AlgebraicNotation }
  ] => {
    if (!player.canCastle.get(side) || player.inCheck) {
      return null;
    }

    const { color } = player;
    const rank = color === "white" ? "1" : "8"; // Rank is based on color
    const kingStart = `e${rank}` as AlgebraicNotation;
    const rookStart: AlgebraicNotation =
      side === "queenSide" ? `a${rank}` : `h${rank}`;

    const king = pieces.get(kingStart) as KingPiece;
    const rook = pieces.get(rookStart) as SlidingPiece;

    if (
      !Boolean(king) ||
      !Boolean(rook) ||
      king.type !== "king" ||
      rook.type !== "rook"
    ) {
      return null;
    }

    if (king.hasMoved || rook.hasMoved) {
      return null;
    }

    const pathSquaresArray = RulesEngine.getCastleDangerSquares(
      side,
      player.color
    );

    const attackedSquares = AttacksGenerator.getAttackedSquaresByOpponent(
      player,
      pieces
    );

    // 1. Check for attacking danger
    for (const pathSquare of pathSquaresArray) {
      if (attackedSquares.includes(pathSquare) || pieces.has(pathSquare)) {
        return null;
      }
    }

    return [
      { piece: king, position: kingStart },
      { piece: rook, position: rookStart },
    ];
  };

  public static getPinnedPieces = (
    king: KingPiece,
    pieces: Map<AlgebraicNotation, Piece>
  ): PinnedPieceInfo[] => {
    const pinnedPieces: PinnedPieceInfo[] = [];

    const kingFile = Number(king.position.fileIndex);
    const kingRank = Number(king.position.rankIndex);

    for (const [dirKey, [dx, dy]] of BaseMovesGenerator.directionOffsetsMap) {
      let file = kingFile + dx;
      let rank = kingRank + dy;

      let potentialPinned: Piece | null = null;
      const legalMovesIfPinned: AlgebraicNotation[] = [];

      while (RulesEngine.isWithinBounds(file, rank)) {
        const square = BoardUtils.getAlgebraicNotationFromBoardIndices(
          file,
          rank
        );
        const target = pieces.get(square);

        if (!target) {
          if (potentialPinned) {
            legalMovesIfPinned.push(square);
          }
          file += dx;
          rank += dy;
          continue;
        }

        const isAlly = target.color === king.color;

        if (isAlly) {
          if (potentialPinned) {
            // Second ally = not pinned
            break;
          }

          potentialPinned = target;
          file += dx;
          rank += dy;
          continue;
        }

        // Now target is enemy
        const isSliding = Piece.isType(target.type, [
          "rook",
          "bishop",
          "queen",
        ]);
        const validDirs = BaseMovesGenerator.slidingDirectionsMap.get(
          target.type as SlidingPieceType
        );

        const attacksAlongRay =
          isSliding && validDirs?.includes(dirKey as DirectionKey);

        if (potentialPinned && attacksAlongRay) {
          pinnedPieces.push({
            pinned: potentialPinned,
            by: target,
            direction: [dx, dy],
            pathToPin: legalMovesIfPinned,
          });
        }

        break; // Any enemy piece ends the ray
      }
    }

    return pinnedPieces;
  };

  // Inside RulesEngine class
  public static isWithinBounds(file: number, rank: number): boolean {
    const fileIsWithinBounds: boolean = file >= 0 && file < 8;
    const rankIsWithinBounds: boolean = rank >= 0 && rank < 8;

    return fileIsWithinBounds && rankIsWithinBounds;
  }
}

export default RulesEngine;
