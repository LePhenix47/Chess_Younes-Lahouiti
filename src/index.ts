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

  const targetIsChessPiece: boolean =
    chessBoardInstance.elementIsChessPiece(target);

  const targetIsSquare: boolean = !targetIsChessPiece;

  const wasPreviouslySelectedPiece: boolean =
    chessBoardInstance.elementIsPieceSelected(target);

  if (chessBoardInstance.selectedPiece) {
    const rankIndex: number = Number(target.dataset.rank);
    const fileIndex: number = Number(target.dataset.file);
    chessBoardInstance.updatePiecePosition(
      chessBoardInstance.selectedPiece,
      rankIndex,
      fileIndex,
      false
    );

    chessBoardInstance.clearSelectedPiece();

    return;
  }

  if (targetIsSquare) {
    return;
  }

  if (
    !wasPreviouslySelectedPiece ||
    !target.isSameNode(chessBoardInstance.selectedPiece)
  ) {
    chessBoardInstance.selectPiece(target);
    return;
  } else if (wasPreviouslySelectedPiece) {
    chessBoardInstance.clearSelectedPiece();
    return;
  }

  // * Clicked on a square thus we must move the piece to that square

  // // TODO: Logic → If no piece was previously selected then select piece
  // // TODO: If it was selected, on click the same piece, then unselect the piece
  // TODO: If it was selected, on click a different piece, then unselect the previous piece and select the new one
  // TODO: If it was selected, on click an empty square, then move the piece to that square

  // ! Must update the logic as well in the DnD behavior to set the selected piece (TODO for the future after implementing the click logic)
});

// TODO: Refactor all of this to make a simple method call
userPointer.on("custom:pointer-drag-move", (e) => {
  lastPointerEvent = "drag";
  if (!userPointer.pressedElement.hasAttribute("data-position")) {
    return;
  }
  const piece = userPointer.pressedElement;

  const { pageX, pageY } = e.detail;

  const pieceCursorOffsetX: number = pageX - userPointer.initXOffset;
  const pieceCursorOffsetY: number = pageY - userPointer.initYOffset;

  chessBoardInstance.dragPiece(piece, pieceCursorOffsetX, pieceCursorOffsetY);

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
  chessBoardInstance.updatePiecePosition(piece, rankIndex, fileIndex, true);
  chessBoardInstance.clearSelectedPiece();
});

console.log(userPointer);

chessBoardInstance.generateBoard();

chessBoardInstance.addPiece("queen", "white", "c5");
chessBoardInstance.addPiece("pawn", "white", "c6");
chessBoardInstance.addPiece("knight", "black", "c7");
chessBoardInstance.addPiece("rook", "black", "c8");
