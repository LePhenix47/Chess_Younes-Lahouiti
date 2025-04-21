//Web components
import "./components/web-component.component";

import { logarithm } from "@utils/functions/helper-functions/math.functions";

import "./sass/main.scss";
import { selectQuery } from "@utils/functions/helper-functions/dom.functions";
import ChessBoard, {
  AlgebraicNotation,
  File,
  Rank,
} from "@utils/classes/chess-board.class";
import UserPointer from "@utils/classes/user-pointer.class";

console.log(logarithm(1));

const chessBoardElement: HTMLElement = selectQuery(".chess__board");

const chessBoardInstance: ChessBoard = new ChessBoard(chessBoardElement);

const userPointer = new UserPointer(chessBoardElement);

// TODO: Add an on click event
// TODO: Must not forget to remove the "no-transition" class

// TODO: Refactor all of this to make a simple method call
userPointer.on("custom:pointer-drag-move", (e) => {
  if (!userPointer.pressedElement.hasAttribute("data-position")) {
    return;
  }
  const piece = userPointer.pressedElement;

  const { pageX, pageY } = e.detail;

  const pieceCursorOffsetX: number = pageX - userPointer.initXOffset;
  const pieceCursorOffsetY: number = pageY - userPointer.initYOffset;

  chessBoardInstance.dragPiece(piece, pieceCursorOffsetX, pieceCursorOffsetY);

  console.log({ pieceCursorOffsetX, pieceCursorOffsetY }, e);
});

userPointer.on("custom:pointer-drag-end", (e) => {
  if (!userPointer.pressedElement.hasAttribute("data-position")) {
    return;
  }
  const piece = userPointer.pressedElement;

  const { squareSize } = chessBoardInstance;

  // TODO: Add logic to updat the piece's new position
  const { lastRecordedPositions } = userPointer;
  const { containerX, containerY } = lastRecordedPositions;

  let fileIndex: number = Math.floor(containerX / squareSize);

  let rankIndex: number = Math.floor(containerY / squareSize);

  // TODO: Refactor code & create a method below
  chessBoardInstance.updatePiecePosition(piece, rankIndex, fileIndex, true);
});

console.log(userPointer);

chessBoardInstance.generateBoard();

chessBoardInstance.addPiece("queen", "white", "c5");
chessBoardInstance.addPiece("pawn", "white", "c6");
chessBoardInstance.addPiece("knight", "black", "c7");
chessBoardInstance.addPiece("rook", "black", "c8");
