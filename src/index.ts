//Web components
import "./components/web-component.component";

import { logarithm } from "@utils/functions/helper-functions/math.functions";

import "./sass/main.scss";
import { selectQuery } from "@utils/functions/helper-functions/dom.functions";
import ChessBoard from "@utils/classes/chess-board.class";
import UserPointer from "@utils/classes/user-pointer.class";

console.log(logarithm(1));

const chessBoardElement: HTMLElement = selectQuery(".chess__board");

const chessBoardInstance: ChessBoard = new ChessBoard(chessBoardElement);

const userPointer = new UserPointer(chessBoardElement);

userPointer.on("custom:pointer-drag-move", (e) => {
  const { pageX, pageY, adjustedX, adjustedY } = e.detail;

  const pieceCursorOffsetX = adjustedX - userPointer.initXOffset;
  const pieceCursorOffsetY = adjustedY - userPointer.initYOffset;

  // TODO: Add the logic to grab a piece
  console.log({ pieceCursorOffsetX, pieceCursorOffsetY });
});

userPointer.on("custom:pointer-drag-end", (e) => {
  const { lastRecordedPositions } = userPointer;
  const { squareSize } = chessBoardInstance;
  const fileIndex: number = Math.floor(
    lastRecordedPositions.adjustedX / squareSize
  );
  const rankIndex: number = Math.floor(
    lastRecordedPositions.adjustedY / squareSize
  );

  const closestFile: string = chessBoardInstance.fileMap.get(fileIndex);
  const closestRank: string = chessBoardInstance.rankMap.get(rankIndex);

  console.log(
    lastRecordedPositions.adjustedX,
    lastRecordedPositions.adjustedY,
    { closestFile, closestRank }
  );

  // TODO: Add the logic to release a piece
});

console.log(userPointer);

chessBoardInstance.generateBoard();

chessBoardInstance.addPiece("queen", "white", "a2");
