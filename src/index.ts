//Web components
import "./components/web-component.component";

import { logarithm } from "@utils/functions/helper-functions/math.functions";

import "./sass/main.scss";
import { selectQuery } from "@utils/functions/helper-functions/dom.functions";
import ChessBoard, {
  AlgebraicNotation,
  ChessFile,
  ChessRank,
} from "@utils/classes/chess-board.class";
import UserPointer from "@utils/classes/user-pointer.class";
import Piece from "@utils/classes/piece.class";
import BoardUtils from "@utils/classes/board-utils.class";

const chessBoardElement: HTMLElement = selectQuery(
  '[data-element="chess-board"]'
);

const chessBoardInstance: ChessBoard = new ChessBoard(chessBoardElement);

const userPointer = new UserPointer(chessBoardElement);

let lastPointerEvent: "drag" | "click" | null = null;

let clickToggle = true;

userPointer.on("custom:pointer-drag-start", (e) => {
  const isPiece = chessBoardInstance.elementIsChessPiece(
    userPointer.pressedElement
  );
  if (!isPiece) {
    return;
  }

  const piece = userPointer.pressedElement;
  chessBoardInstance.selectPiece(piece);

  console.log("custom:pointer-drag-start");
});

userPointer.on("custom:pointer-drag-click", (e) => {
  lastPointerEvent = "click";
  const { clickedElement } = e.detail;

  clickToggle = !clickToggle;

  clickedElement.classList.remove("dragging");

  console.log("custom:pointer-drag-click");

  // const target = e.target as HTMLElement;
  const isPiece = chessBoardInstance.elementIsChessPiece(
    userPointer.pressedElement
  );

  const selectedPiece = chessBoardInstance.selectedPiece;

  const clickedPiece = isPiece
    ? chessBoardInstance.getPieceFromElement(userPointer.pressedElement)
    : null;

  // 1. No piece is selected yet
  if (!selectedPiece) {
    chessBoardInstance.selectPiece(userPointer.pressedElement);
    return;
  }

  // 2. Already selected a piece

  // a) Clicked the same piece again → unselect
  if (clickedPiece && clickedPiece === selectedPiece && clickToggle) {
    chessBoardInstance.clearSelectedPiece();
    return;
  }

  // b) Clicked another of my own pieces → switch selection
  if (clickedPiece && clickedPiece.color === selectedPiece.color) {
    // debugger;
    chessBoardInstance.selectPiece(userPointer.pressedElement);
    return;
  }

  // c) Clicked an empty square or an enemy piece → move
  console.log(clickedPiece);
  const attributeToCheck = clickedPiece ? "position" : "algebraicNotation";
  const targetPosition = userPointer.pressedElement.dataset[
    attributeToCheck
  ] as AlgebraicNotation;

  const { fileIndex, rankIndex } =
    BoardUtils.getBoardIndicesFromAlgebraicNotation(targetPosition);

  chessBoardInstance.updatePiecePosition(
    selectedPiece,
    Number(rankIndex),
    Number(fileIndex),
    false
  );
  chessBoardInstance.clearSelectedPiece();
});

// TODO: Refactor all of this to make a simple method call
userPointer.on("custom:pointer-drag-move", (e) => {
  lastPointerEvent = "drag";
  const isPiece = chessBoardInstance.elementIsChessPiece(
    userPointer.pressedElement
  );
  if (!isPiece) {
    return;
  }

  const { pageX, pageY } = e.detail;

  const pieceCursorOffsetX: number = pageX - userPointer.initXOffset;
  const pieceCursorOffsetY: number = pageY - userPointer.initYOffset;

  const piece = userPointer.pressedElement;
  // console.log({ piece });

  const draggedPiece = chessBoardInstance.getPieceFromElement(piece);

  chessBoardInstance.dragPiece(
    draggedPiece,
    pieceCursorOffsetX,
    pieceCursorOffsetY
  );

  // console.log("custom:pointer-drag-move");
});

userPointer.on("custom:pointer-drag-end", (e) => {
  const isPiece = chessBoardInstance.elementIsChessPiece(
    userPointer.pressedElement
  );
  if (!isPiece || lastPointerEvent === "click") {
    return;
  }
  const piece = userPointer.pressedElement;

  const { squareSize } = chessBoardInstance;

  // TODO: Add logic to updat the piece's new position
  const { lastRecordedPositions } = userPointer;
  const { containerX, containerY } = lastRecordedPositions;

  const { pageX, pageY } = e.detail;

  const fileIndex: number = Math.floor(containerX / squareSize);

  const rankIndex: number = Math.floor(containerY / squareSize);

  // TODO: Refactor code & create a method below
  const draggedPiece: Piece = chessBoardInstance.getPieceFromElement(piece);
  if (!draggedPiece) {
    return;
  }

  const boardDomRect: DOMRect = chessBoardElement.getBoundingClientRect();
  const isInsideBoard: boolean =
    pageX >= boardDomRect.left &&
    pageX <= boardDomRect.right &&
    pageY >= boardDomRect.top &&
    pageY <= boardDomRect.bottom;

  // console.log(isInsideBoard, pageX, pageY, boardDomRect);

  if (!isInsideBoard) {
    // Not inside → snap back to original square!
    draggedPiece.moveTo(draggedPiece.position, false); // `noAnimation = true`
    chessBoardInstance.clearSelectedPiece();
    return;
  }

  chessBoardInstance.updatePiecePosition(
    draggedPiece,
    rankIndex,
    fileIndex,
    true
  );
  chessBoardInstance.clearSelectedPiece();

  console.log("%ccustom:pointer-drag-end", "background: #222; color: #bada55");
});

chessBoardInstance.generateBoard();

chessBoardInstance.addPiece("queen", "white", "c1");
chessBoardInstance.addPiece("pawn", "white", "h2");
chessBoardInstance.addPiece("pawn", "black", "g7");
chessBoardInstance.addPiece("knight", "black", "c7");
chessBoardInstance.addPiece("rook", "black", "c8");
chessBoardInstance.addPiece("bishop", "black", "d5");
chessBoardInstance.addPiece("king", "black", "c5");
