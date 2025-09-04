import ChessBoardController from "./chess-board-controller";
import MovesGenerator from "./move-generator.class";
import Piece, { PieceColor } from "./piece.class";
import Player, { CastlingRights } from "./player.class";

import RulesEngine from "./rules-engine.class";
import type { AlgebraicNotation, ChessFile, Move } from "../types/chess.types";
import ZobristHasher from "./zobrist-hasher.class";
import BoardUtils from "./board-utils.class";

export interface IGameLogic {
  switchTurnTo(color?: PieceColor): void;
  updatePlayerState(
    player: Player,
    inCheck: boolean,
    canCastle: CastlingRights
  ): void;
}

class GameLogic implements IGameLogic {
  constructor(private chessBoardController: ChessBoardController) {}

  public updatePlayerState = (
    player: Player,
    inCheck: boolean,
    canCastle?: CastlingRights
  ) => {
    player.setInCheck(inCheck);

    if (!canCastle) {
      return;
    }

    player.toggleOneSideCastling("kingSide", canCastle.kingSide);
    player.toggleOneSideCastling("queenSide", canCastle.queenSide);
  };

  public switchTurnTo = (color?: PieceColor): void => {
    const { currentTurn } = this.chessBoardController;
    if (color) {
      this.chessBoardController.currentTurn = color;
    } else {
      this.chessBoardController.currentTurn =
        currentTurn === "white" ? "black" : "white";
    }
  };

  public updateAllLegalMovesForCurrentPlayer = (): void => {
    const { piecesMap, currentPlayer, enPassantSquare } =
      this.chessBoardController;

    // Get all the legal moves for the current player
    const allLegalMoves = MovesGenerator.generateLegalMoves({
      piecesMap: piecesMap,
      player: currentPlayer,
      enPassantSquare: enPassantSquare,
    });
    // Store it in the new property
    this.chessBoardController.allLegalMovesForCurrentPlayer = allLegalMoves;
  };

  public getLegalMovesForSelectedPiece = (
    piece: Piece
  ): AlgebraicNotation[] => {
    const selectedMoves =
      this.chessBoardController.allLegalMovesForCurrentPlayer.find(
        ({ piece: p }) => Piece.arePiecesTheSame(p, piece)
      );
    return selectedMoves?.moves || [];
  };

  public resetBoardState = () => {
    // 3. Reset game state
    this.chessBoardController.selectedPiece = null;
    this.chessBoardController.legalMovesForSelectedPiece = null;
    this.chessBoardController.selectedPieceLegalMoves = null;
    this.chessBoardController.allLegalMovesForCurrentPlayer = [];

    this.chessBoardController.enPassantSquare = null;
    this.chessBoardController.positionRepetitionMap.clear();

    this.chessBoardController.halfMoveClock = 0;
    this.chessBoardController.fullMoveNumber = 1;

    this.chessBoardController.currentTurn = "white";
    this.chessBoardController.isGameOver = null;

    this.chessBoardController.pgnMoveText = [];

    // 4. Reset players states
    this.chessBoardController.whitePlayer.reset();
    this.chessBoardController.blackPlayer.reset();
  };

  public recordMoveAsHash = (): void => {
    const { piecesMap, currentPlayer, enPassantSquare, positionRepetitionMap } =
      this.chessBoardController;

    const hash: bigint = ZobristHasher.computeHash(
      piecesMap,
      currentPlayer,
      enPassantSquare ?? null
    );

    const currentCount: number = positionRepetitionMap.get(hash) ?? 0;
    positionRepetitionMap.set(hash, currentCount + 1);
  };

  // TODO: Relocate to GameLogic
  public removeCastlingRights = (
    player: Player,
    movedPiece?: Piece,
    previousPosition?: AlgebraicNotation
  ): void => {
    if (movedPiece.type === "king") {
      player.toggleAllCastling(false);
      return;
    }

    const { fileIndex } =
      BoardUtils.getBoardIndicesFromAlgebraicNotation(previousPosition);
    const file: ChessFile = BoardUtils.fileMap.get(Number(fileIndex));

    const side = file === "h" ? "kingSide" : "queenSide";

    if (movedPiece.hasMoved) {
      return;
    }

    player.toggleOneSideCastling(side, false);
    console.log("removeCastlingRights", movedPiece, previousPosition);
  };

  // TODO: Relocate to GameLogic
  public handleCastling = (move: Move, noAnimation: boolean): void => {
    const { piecesMap } = this.chessBoardController;
    const { piece, from, to } = move;

    const { fileIndex: fromFileStr, rankIndex: fromRankStr } =
      BoardUtils.getBoardIndicesFromAlgebraicNotation(from);
    const { fileIndex: toFileStr } =
      BoardUtils.getBoardIndicesFromAlgebraicNotation(to);

    const fromFile = Number(fromFileStr);
    const toFile = Number(toFileStr);

    const fileDiff: number = toFile - fromFile;

    const [file, rank] = from;
    const isKingSide: boolean = fileDiff > 0;

    const rookFrom: AlgebraicNotation = (
      isKingSide ? `h${rank}` : `a${rank}`
    ) as AlgebraicNotation;
    const rookTo: AlgebraicNotation = (
      isKingSide ? `f${rank}` : `d${rank}`
    ) as AlgebraicNotation;

    const rook = piecesMap.get(rookFrom);
    if (!rook) {
      console.warn(`Rook not found at expected castling position: ${rookFrom}`);
      return;
    }

    this.chessBoardController.movePiece(rook, rookTo, noAnimation);
    this.chessBoardController.updateGameState(rookFrom, rookTo, rook);
  };

  public getEnPassantMarking = (to: AlgebraicNotation): AlgebraicNotation => {
    const { currentPlayer } = this.chessBoardController;

    const pos = BoardUtils.getBoardIndicesFromAlgebraicNotation(to);
    const file = Number(pos.fileIndex);
    const rank = Number(pos.rankIndex);

    // ? Only check adjacent pawns on the pawn's current rank
    const hasNotLandedAdjacentToEnemyPawn: boolean =
      !this.hasAdjacentOpponentPawn(file, rank, currentPlayer.color);
    if (hasNotLandedAdjacentToEnemyPawn) {
      return null;
    }

    // ? + 1 ↓, - 1 ↑
    const enPassantRank = currentPlayer.color === "white" ? rank + 1 : rank - 1;

    const enPassantSquare = BoardUtils.getAlgebraicNotationFromBoardIndices(
      file,
      enPassantRank
    );

    return enPassantSquare;
  };

  private hasAdjacentOpponentPawn = (
    file: number,
    rank: number,
    playerColor: "white" | "black"
  ): boolean => {
    const { piecesMap } = this.chessBoardController;
    const adjacentFiles = [file - 1, file + 1];

    for (const adjFile of adjacentFiles) {
      if (!RulesEngine.isWithinBounds(adjFile, rank)) {
        // * skip out-of-board files
        continue;
      }

      const adjSquare = BoardUtils.getAlgebraicNotationFromBoardIndices(
        adjFile,
        rank
      );
      const piece = piecesMap.get(adjSquare);

      if (piece?.type === "pawn" && piece.color !== playerColor) {
        return true;
      }
    }

    return false;
  };

  public getEnPassantCapturedSquare = (
    to: AlgebraicNotation,
    color: "white" | "black"
  ): AlgebraicNotation => {
    const toPos = BoardUtils.getBoardIndicesFromAlgebraicNotation(to);
    const fileIndex = Number(toPos.fileIndex);
    const rankIndex = Number(toPos.rankIndex);

    const captureRank = color === "white" ? rankIndex + 1 : rankIndex - 1;

    return BoardUtils.getAlgebraicNotationFromBoardIndices(
      fileIndex,
      captureRank
    );
  };

  // TODO: Relocate to GameLogic
  public readonly isEnPassantCapture = (
    piece: Piece,
    from: AlgebraicNotation,
    to: AlgebraicNotation
  ): boolean => {
    const { enPassantSquare, piecesMap } = this.chessBoardController;

    const [fromFile, fromRank] = from;
    const [toFile, toRank] = to;

    const isPawn: boolean = piece.type === "pawn";
    const isDiagonalMove: boolean = fromFile !== toFile;
    const isTheToPositionSquareEmpty: boolean = !piecesMap.has(to);
    const isEnPassantSquare: boolean = enPassantSquare === to;

    return (
      isPawn &&
      isDiagonalMove &&
      isTheToPositionSquareEmpty &&
      isEnPassantSquare
    );
  };

  public clearEnPassantMarking = (): null => {
    return null;
  };
}

export default GameLogic;
