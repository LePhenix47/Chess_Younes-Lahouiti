import BoardUI from "./board-ui.class";
import BoardUtils from "./board-utils.class";
import type { AlgebraicNotation } from "../types/chess.types";
import UserPointer, { PointerDragEventMap } from "./user-pointer.class";

type DragManagerCallbacks = Partial<{
  onEmptySquareClick: (square: AlgebraicNotation) => void;
  onPieceClick: (pieceElement: HTMLElement, square: AlgebraicNotation) => void;
  onDragStart: (
    pieceElement: HTMLElement,
    startSquare: AlgebraicNotation
  ) => void;
  onDragMove: (
    pieceElement: HTMLElement,
    pieceDragX: number,
    pieceDragY: number,
    hoveringSquare: AlgebraicNotation | null
  ) => void;
  onDrop: (
    pieceElement: HTMLElement,
    fromSquare: AlgebraicNotation,
    toSquare: AlgebraicNotation,
    isInsideBoard: boolean
  ) => void;
}>;

type EventTypes = keyof PointerDragEventMap;

type EventHandler<E extends EventTypes> = CustomEvent<PointerDragEventMap[E]>;

// Export individual aliases
export type DragStartEvent = EventHandler<"custom:pointer-drag-start">;
export type DragClickEvent = EventHandler<"custom:pointer-drag-click">;
export type DragMoveEvent = EventHandler<"custom:pointer-drag-move">;
export type DragEndEvent = EventHandler<"custom:pointer-drag-end">;

class DragManager {
  private readonly userPointer: UserPointer;
  private callbacks: DragManagerCallbacks = {};
  private readonly chessBoardElement: HTMLElement;

  private draggedPiece: HTMLElement | null = null;
  private startSquare: AlgebraicNotation | null = null;

  constructor(chessBoardElement: HTMLElement, userPointer?: UserPointer) {
    this.chessBoardElement = chessBoardElement;
    this.userPointer = userPointer || new UserPointer(chessBoardElement);

    this.attachEvents();
  }

  public setAngle = (angleInDegrees: number): void => {
    this.userPointer.setRotationAngle(angleInDegrees);
  };

  public setCallbacks = (callbacks: DragManagerCallbacks) => {
    this.callbacks = { ...this.callbacks, ...callbacks };
  };

  public get squareSize(): number {
    return BoardUI.getSquareSizeFromContainer(this.chessBoardElement);
  }

  private attachEvents = () => {
    this.userPointer.on("custom:pointer-drag-click", this.handleClick);

    this.userPointer.on("custom:pointer-drag-start", this.handleDragStart);
    this.userPointer.on("custom:pointer-drag-move", this.handleDragMove);
    this.userPointer.on("custom:pointer-drag-end", this.handleDragEnd);
  };

  private handleClick = (e: DragClickEvent) => {
    const { clickedElement } = e.detail;

    const square: AlgebraicNotation = this.getSquareFromElement(clickedElement);
    this.startSquare = square;

    if (this.isChessPiece(clickedElement)) {
      this.callbacks.onPieceClick?.(clickedElement, square);
    } else {
      this.callbacks.onEmptySquareClick?.(square);
    }
  };

  private handleDragStart = (e: DragStartEvent) => {
    const pieceElement = this.userPointer.pressedElement;
    if (!this.isChessPiece(pieceElement)) return;

    const { adjustedX, adjustedY } = e.detail;

    this.draggedPiece = pieceElement;
    this.startSquare = this.getSquareFromElement(this.draggedPiece);

    this.callbacks.onDragStart?.(this.draggedPiece, this.startSquare);
  };

  private handleDragMove = (e: DragMoveEvent) => {
    if (!this.draggedPiece) return;

    const { pageX, pageY, adjustedX, adjustedY } = e.detail;

    let hoveringSquare: AlgebraicNotation | null = null;

    if (this.coordsAreWithinBounds(pageX, pageY)) {
      hoveringSquare = this.getSquareFromCoords(adjustedX, adjustedY);
    }

    const pieceDragX: number = adjustedX - this.userPointer.initXOffset;
    const pieceDragY: number = adjustedY - this.userPointer.initYOffset;

    this.callbacks.onDragMove?.(
      this.draggedPiece,
      pieceDragX,
      pieceDragY,
      hoveringSquare
    );
  };

  private handleDragEnd = (e: DragEndEvent) => {
    if (!this.draggedPiece) return;

    const { pageX, pageY } = e.detail;
    const isInsideBoard: boolean = this.coordsAreWithinBounds(pageX, pageY);

    const { containerX, containerY } = this.userPointer.lastRecordedPositions;

    const toSquare: AlgebraicNotation = this.getSquareFromCoords(
      containerX,
      containerY
    );

    this.callbacks.onDrop?.(
      this.draggedPiece,
      this.startSquare,
      toSquare,
      isInsideBoard
    );

    this.draggedPiece = null;
    this.startSquare = null;
  };

  private getIndicesFromCoords = (x: number, y: number): [number, number] => {
    const fileIndex: number = Math.floor(x / this.squareSize);
    const rankIndex: number = Math.floor(y / this.squareSize);

    return [fileIndex, rankIndex];
  };

  public getSquareFromCoords = (x: number, y: number): AlgebraicNotation => {
    const [fileIndex, rankIndex] = this.getIndicesFromCoords(x, y);

    return BoardUtils.getAlgebraicNotationFromBoardIndices(
      fileIndex,
      rankIndex
    );
  };

  private isChessPiece = (element: HTMLElement | null): boolean => {
    if (!element) {
      return false;
    }

    return element.hasAttribute("data-piece");
  };

  private coordsAreWithinBounds = (x: number, y: number): boolean => {
    const boardRect = this.chessBoardElement.getBoundingClientRect();
    return (
      x >= boardRect.left &&
      x <= boardRect.right &&
      y >= boardRect.top &&
      y <= boardRect.bottom
    );
  };

  private getSquareFromElement = (
    element: HTMLElement | null
  ): AlgebraicNotation => {
    return element?.dataset?.algebraicNotation as AlgebraicNotation;
  };
}

export default DragManager;
