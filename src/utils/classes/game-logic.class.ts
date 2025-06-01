import ChessBoardController from "./chess-board-controller";
import MovesGenerator from "./move-generator.class";
import Piece, { PieceColor } from "./piece.class";
import Player, { CastlingRights } from "./player.class";

import AttacksGenerator from "./attacks-generator.class";
import RulesEngine from "./rules-engine.class";
import ChessBoard, { AlgebraicNotation } from "./chess-board.class";

class GameLogic {
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
}

export default GameLogic;
