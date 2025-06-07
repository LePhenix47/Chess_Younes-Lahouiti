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

const analysisTabForm = selectQuery(
  '[data-element="analysis-tab"]'
) as HTMLFormElement;

const fenInputElement = selectQuery(
  '[data-element="fen-input"]'
) as HTMLInputElement;

const pgnInputElement = selectQuery(
  '[data-element="pgn-input"]'
) as HTMLTextAreaElement;

analysisTabForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const currentForm = event.currentTarget as HTMLFormElement;

  const formData = new FormData(currentForm);

  const formHashmap = new Map<string, string>(formData.entries());

  const fen = formHashmap.get("fen") as string;
  if (fen) {
    chessBoardInstance.loadFen(fen);
  }

  const pgn = formHashmap.get("pgn") as string;
  if (pgn) {
    chessBoardInstance.loadPgn(pgn);
  }

  // console.log({ fen, pgn });
});

const chessBoardElement: HTMLElement = selectQuery(
  '[data-element="chess-board"]'
);

const chessBoardInstance = new ChessBoard(chessBoardElement);

const userPointer = new UserPointer(chessBoardElement);

userPointer.on("custom:pointer-drag-start", (e) => {
  if (chessBoardInstance.isGameOver) {
    return;
  }

  const isPiece = chessBoardInstance.elementIsChessPiece(
    userPointer.pressedElement
  );
  if (!isPiece) {
    return;
  }

  const piece = userPointer.pressedElement;
  chessBoardInstance.selectPiece(piece);

  // console.log(
  //   "%ccustom:pointer-drag-start",
  //   "background: darkblue; padding: 1rem"
  // );
});

userPointer.on("custom:pointer-drag-click", (e) => {
  if (chessBoardInstance.isGameOver) {
    return;
  }

  const { clickedElement } = e.detail;

  // TODO: BODGE FIX
  clickedElement.classList.remove("dragging");

  // console.log("custom:pointer-drag-click");

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
  if (clickedPiece && clickedPiece === selectedPiece) {
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
  // console.log(clickedPiece);
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
  if (chessBoardInstance.isGameOver) {
    return;
  }

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
  if (chessBoardInstance.isGameOver) {
    return;
  }

  const isPiece = chessBoardInstance.elementIsChessPiece(
    userPointer.pressedElement
  );
  if (!isPiece) {
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
    return;
  }

  chessBoardInstance.updatePiecePosition(
    draggedPiece,
    rankIndex,
    fileIndex,
    true
  );
  chessBoardInstance.clearSelectedPiece();

  // console.log("%ccustom:pointer-drag-end", "background: #222; color: #bada55");
});

chessBoardInstance.generateBoard();
// chessBoardInstance.loadFen(chessBoardInstance.initialFen);
const fen = "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w Qq - 0 1";
chessBoardInstance.loadFen(fen);
