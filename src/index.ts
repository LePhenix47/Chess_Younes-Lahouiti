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
import Piece from "@utils/classes/piece.class";

console.log(logarithm(1));

const chessBoardElement: HTMLElement = selectQuery(
  '[data-element="chess-board"]'
);

const chessBoardInstance: ChessBoard = new ChessBoard(chessBoardElement);

const userPointer = new UserPointer(chessBoardElement);

let lastPointerEvent: "drag" | "click" | null = null;

// TODO: refactor code because it's a fucking mess, I should be able to just call a method
chessBoardElement.addEventListener("click", (e: MouseEvent) => {
  if (lastPointerEvent === "drag") {
    lastPointerEvent = "click";
    return;
  }

  const target = e.target as HTMLElement;
  const isPiece: boolean = chessBoardInstance.elementIsChessPiece(target);
  const isSquare: boolean = !isPiece;
  const selectedPiece: Piece = chessBoardInstance.selectedPiece;

  // * CASE 1: A piece is already selected → Try to move it
  if (selectedPiece) {
    const rankIndex = Number(target.dataset.rank);
    const fileIndex = Number(target.dataset.file);

    // Only move if clicked target has valid rank & file (i.e. it's a square)
    if (!isNaN(rankIndex) && !isNaN(fileIndex)) {
      chessBoardInstance.updatePiecePosition(
        selectedPiece,
        rankIndex,
        fileIndex,
        false
      );
    }

    chessBoardInstance.clearSelectedPiece();
    return;
  }

  // * CASE 2: Clicked on empty square, but no piece was selected → Do nothing
  if (isSquare) {
    return;
  }

  // * CASE 3: Clicked on a piece (no piece selected yet)
  const clickedSameAsSelected =
    selectedPiece &&
    target.isSameNode(chessBoardInstance.selectedPiece.element);

  if (!selectedPiece || !clickedSameAsSelected) {
    chessBoardInstance.selectPiece(target);
    return;
  }

  // * CASE 4: Clicked again on the already selected piece → Unselect it
  if (clickedSameAsSelected) {
    chessBoardInstance.clearSelectedPiece();
    return;
  }
});

// TODO: Refactor all of this to make a simple method call
userPointer.on("custom:pointer-drag-move", (e) => {
  lastPointerEvent = "drag";
  if (!userPointer.pressedElement.hasAttribute("data-position")) {
    return;
  }

  const { pageX, pageY } = e.detail;

  const pieceCursorOffsetX: number = pageX - userPointer.initXOffset;
  const pieceCursorOffsetY: number = pageY - userPointer.initYOffset;

  const piece = userPointer.pressedElement;
  const draggedPiece = chessBoardInstance.getPieceFromElement(piece);
  chessBoardInstance.dragPiece(
    draggedPiece,
    pieceCursorOffsetX,
    pieceCursorOffsetY
  );

  console.log("custom:pointer-drag-move");
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

  const fileIndex: number = Math.floor(containerX / squareSize);

  const rankIndex: number = Math.floor(containerY / squareSize);

  // TODO: Refactor code & create a method below
  const draggedPiece = chessBoardInstance.getPieceFromElement(piece);
  if (!draggedPiece) {
    return;
  }
  chessBoardInstance.updatePiecePosition(
    draggedPiece,
    rankIndex,
    fileIndex,
    true
  );
  chessBoardInstance.clearSelectedPiece();
});

console.log(userPointer);

chessBoardInstance.generateBoard();

chessBoardInstance.addPiece("queen", "white", "c5");
chessBoardInstance.addPiece("pawn", "white", "c6");
chessBoardInstance.addPiece("knight", "black", "c7");
chessBoardInstance.addPiece("rook", "black", "c8");
