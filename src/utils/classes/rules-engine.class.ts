import AttacksGenerator, {
  OpponentAttackDetail,
} from "./attacks-generator.class";
import BaseMovesGenerator, {
  BlackCastlingStart,
  WhiteCastlingStart,
} from "./base-moves-generator.class";
import BoardUtils from "./board-utils.class";
import { LegalMoves } from "./chess-board-controller";
import ChessBoard, {
  AlgebraicNotation,
  ChessFile,
  ChessRank,
  Move,
  PlayerMaterialCount,
} from "./chess-board.class";
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

export enum PawnPromotionRank {
  Black = 7,
  White = 0,
}

export type InsufficientMaterialType =
  | "king-only"
  | "king-and-one-knight"
  | "king-and-same-color-bishops"
  | null;

abstract class RulesEngine {
  public static isCheckmate = ({
    legalMoves,
    currentPlayer,
  }: {
    legalMoves: LegalMoves;
    currentPlayer: Player;
  }): boolean => {
    // ? No other moves are available AND king is in check → Checkmate
    return currentPlayer.inCheck && legalMoves.length === 0;
  };

  public static isStalemate = ({
    legalMoves,
    currentPlayer,
  }: {
    legalMoves: LegalMoves;
    currentPlayer: Player;
  }): boolean => {
    // ? No other moves are available BUT king is NOT in check → Stalemate
    return !currentPlayer.inCheck && legalMoves.length === 0;
  };

  public static isInsufficientMaterialDraw = (
    piecesMap: Map<AlgebraicNotation, Piece>
  ): boolean => {
    const whiteMaterial = ChessBoard.getPlayerMaterial(piecesMap, "white");
    const blackMaterial = ChessBoard.getPlayerMaterial(piecesMap, "black");

    const whiteInsufficient =
      RulesEngine.hasInsufficientMaterialForPlayer(whiteMaterial);
    const blackInsufficient =
      RulesEngine.hasInsufficientMaterialForPlayer(blackMaterial);

    if (!whiteInsufficient || !blackInsufficient) {
      return false; // One side can mate
    }

    const insufficiencyTypes = [whiteInsufficient, blackInsufficient];

    // * King vs King
    if (insufficiencyTypes.every((t) => t === "king-only")) {
      return true;
    }

    // * King + 1 or n Bishops vs King + 1 or n Bishops
    // * AND both opposing bishops are the same square type
    if (insufficiencyTypes.every((t) => t === "king-and-same-color-bishops")) {
      const whiteBishopColor = Array.from(whiteMaterial.bishopColors)[0];
      const blackBishopColor = Array.from(blackMaterial.bishopColors)[0];

      const allBishopsAreTheSameColor: boolean =
        whiteBishopColor === blackBishopColor;

      return allBishopsAreTheSameColor;
    }

    // * King vs King + 1 Bishop
    if (
      insufficiencyTypes.includes("king-only") &&
      insufficiencyTypes.includes("king-and-same-color-bishops")
    ) {
      return true;
    }

    // * King vs King + 1 Knight
    if (
      insufficiencyTypes.includes("king-only") &&
      insufficiencyTypes.includes("king-and-one-knight")
    ) {
      return true;
    }

    return false;
  };

  public static hasInsufficientMaterialForPlayer = (
    material: PlayerMaterialCount
  ): InsufficientMaterialType => {
    // ? These pieces are enough for checkmate: pawns, rooks, queens
    const hasHeavyPieces: boolean = [
      material.pawns,
      material.rooks,
      material.queens,
    ].some((heavyPieceCount) => heavyPieceCount > 0);
    if (hasHeavyPieces) {
      return null;
    }

    // ? 🐴 Juan count over 1
    const hasMoreThanOneHorsey: boolean = material.knights > 1;
    if (hasMoreThanOneHorsey) {
      return null;
    }

    // ? King only → cannot checkmate
    const isKingOnly: boolean =
      material.kings === 1 && material.bishops === 0 && material.knights === 0;
    if (isKingOnly) {
      return "king-only";
    }

    // ? King + 1 Knight
    const isKingWithOneKnight: boolean =
      material.kings === 1 && material.knights === 1 && material.bishops === 0;
    if (isKingWithOneKnight) {
      return "king-and-one-knight";
    }

    // ? King + 1 or n Bishop(s), ALL on same color
    const isKingWithSameColorBishops: boolean =
      material.kings === 1 &&
      material.knights === 0 &&
      material.bishops > 0 &&
      material.bishopColors.size === 1;
    if (isKingWithSameColorBishops) {
      return "king-and-same-color-bishops";
    }

    return null;
  };

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

  public static canPromotePawn = (
    piece: Piece,
    to: AlgebraicNotation
  ): boolean => {
    if (piece.type !== "pawn") {
      return false;
    }

    const [file, rank] = to;

    const rankIndex = BoardUtils.reverseRankMap.get(rank as ChessRank);

    console.log({ rankIndex });

    const whiteCanPromote: boolean =
      piece.color === "white" && rankIndex === PawnPromotionRank.White;

    const blackCanPromote: boolean =
      piece.color === "black" && rankIndex === PawnPromotionRank.Black;

    return whiteCanPromote || blackCanPromote;
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
    pieces: Map<AlgebraicNotation, Piece>,
    opponentAttacksDetailed?: OpponentAttackDetail[]
  ): [
    { piece: KingPiece; position: AlgebraicNotation },
    { piece: SlidingPiece; position: AlgebraicNotation }
  ] => {
    if (!player.canCastle.get(side) || player.inCheck) {
      return null;
    }

    const { color } = player;
    let kingStart: WhiteCastlingStart.King | BlackCastlingStart.King;
    let rookStart:
      | WhiteCastlingStart.QueenSideRook
      | WhiteCastlingStart.KingSideRook
      | BlackCastlingStart.QueenSideRook
      | BlackCastlingStart.KingSideRook;

    if (color === "white") {
      kingStart = WhiteCastlingStart.King;

      rookStart =
        side === "queenSide"
          ? WhiteCastlingStart.QueenSideRook
          : WhiteCastlingStart.KingSideRook;
    } else {
      kingStart = BlackCastlingStart.King;

      rookStart =
        side === "queenSide"
          ? BlackCastlingStart.QueenSideRook
          : BlackCastlingStart.KingSideRook;
    }

    const king = pieces.get(kingStart) as KingPiece;
    const rook = pieces.get(rookStart) as SlidingPiece;

    if (
      // ? If any of the pieces are missing or are the wrong type
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
      pieces,
      opponentAttacksDetailed
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

  public static isIllegalEnPassantDiscoveredCheck = (
    king: Piece,
    enPassantSquare: AlgebraicNotation | undefined,
    piecesMap: Map<AlgebraicNotation, Piece>
  ): boolean => {
    if (!enPassantSquare) {
      return false;
    }

    // Infer captured pawn square based on enPassantSquare and playerColor
    const epPos =
      BoardUtils.getBoardIndicesFromAlgebraicNotation(enPassantSquare);
    const capturedPawnRank =
      king.color === "white"
        ? Number(epPos.rankIndex) + 1
        : Number(epPos.rankIndex) - 1;

    console.log(epPos);

    const capturedPawnFile = Number(epPos.fileIndex);

    const capturedPawnSquare = BoardUtils.getAlgebraicNotationFromBoardIndices(
      capturedPawnFile,
      capturedPawnRank
    );

    const kingPos = BoardUtils.getBoardIndicesFromAlgebraicNotation(
      king.position.algebraicNotation
    );

    const kingRank = Number(kingPos.rankIndex);

    if (kingRank !== capturedPawnRank) {
      return false;
    }

    const rank = capturedPawnRank;
    const kingFile = Number(kingPos.fileIndex);
    const capturedFile = capturedPawnFile;
    const direction = capturedFile > kingFile ? 1 : -1;

    let file = kingFile + direction;
    let ownPawnsCount = 0;
    let rookOrQueenFound = false;

    while (RulesEngine.isWithinBounds(file, rank)) {
      const square = BoardUtils.getAlgebraicNotationFromBoardIndices(
        file,
        rank
      );
      const piece = piecesMap.get(square);

      if (square === capturedPawnSquare || !piece) {
        // Skip captured pawn and empty squares
        file += direction;
        continue;
      }

      switch (piece.type) {
        case "pawn":
          ownPawnsCount++;
          break;
        case "rook":
        case "queen":
          rookOrQueenFound = true;
          break;
        default:
          break;
      }

      file += direction;
    }

    return ownPawnsCount === 1 && rookOrQueenFound;
  };

  // Inside RulesEngine class
  public static isWithinBounds(file: number, rank: number): boolean {
    const fileIsWithinBounds: boolean = file >= 0 && file < 8;
    const rankIsWithinBounds: boolean = rank >= 0 && rank < 8;

    return fileIsWithinBounds && rankIsWithinBounds;
  }
}

export default RulesEngine;
