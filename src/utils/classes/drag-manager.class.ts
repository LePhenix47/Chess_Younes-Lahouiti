import BoardUI from "./board-ui.class";
import BoardUtils from "./board-utils.class";
import { AlgebraicNotation } from "./chess-board.class";
import UserPointer, { PointerDragEventMap } from "./user-pointer.class";

type DragManagerCallbacks = Partial<{
  onEmptySquareClick: (square: AlgebraicNotation) => void;
  onPieceClick: (pieceElement: HTMLElement, square: AlgebraicNotation) => void;
  onDragStart: (
    pieceElement: HTMLElement,
    startSquare: AlgebraicNotation
  ) => void;
  onDragMove: (pieceElement: HTMLElement, pageX: number, pageY: number) => void;
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

  public setCallback = <TCallbackKey extends keyof DragManagerCallbacks>(
    callbackName: TCallbackKey,
    callback: DragManagerCallbacks[TCallbackKey]
  ) => {
    this.callbacks[callbackName] = callback;
  };

  public get squareSize(): number {
    return BoardUI.getSquareSizeFromContainer(this.chessBoardElement);
  }

  private attachEvents = () => {
    this.userPointer.on("custom:pointer-drag-start", this.handleDragStart);

    this.userPointer.on("custom:pointer-drag-click", this.handleClick);
    this.userPointer.on("custom:pointer-drag-move", this.handleDragMove);
    this.userPointer.on("custom:pointer-drag-end", this.handleDragEnd);
  };

  private handleDragStart = (e: DragStartEvent) => {
    const pieceElement = this.userPointer.pressedElement;
    if (!this.isChessPiece(pieceElement)) return;

    this.draggedPiece = pieceElement;
    this.startSquare = this.getSquareFromElement(this.draggedPiece);

    this.callbacks.onDragStart?.(this.draggedPiece, this.startSquare);
  };

  private handleClick = (e: DragClickEvent) => {
    const { clickedElement } = e.detail;

    const square: AlgebraicNotation = this.getSquareFromElement(clickedElement);

    if (this.isChessPiece(clickedElement)) {
      this.callbacks.onPieceClick?.(clickedElement, square);
    } else {
      this.callbacks.onEmptySquareClick?.(square);
    }
  };

  private handleDragMove = (e: DragMoveEvent) => {
    if (!this.draggedPiece) return;

    const { pageX, pageY } = e.detail;
    this.callbacks.onDragMove?.(this.draggedPiece, pageX, pageY);
  };

  private handleDragEnd = (e: DragEndEvent) => {
    if (!this.draggedPiece || !this.startSquare) return;

    const { pageX, pageY } = e.detail;
    const isInsideBoard: boolean = this.coordsAreWithinBounds(pageX, pageY);

    const { containerX, containerY } = this.userPointer.lastRecordedPositions;
    // Calculate target square from pointer position
    const fileIndex = Math.floor(containerX / this.squareSize);
    const rankIndex = Math.floor(containerY / this.squareSize);

    const toSquare: AlgebraicNotation =
      BoardUtils.getAlgebraicNotationFromBoardIndices(rankIndex, fileIndex);

    this.callbacks.onDrop?.(
      this.draggedPiece,
      this.startSquare,
      toSquare,
      isInsideBoard
    );

    this.draggedPiece = null;
    this.startSquare = null;
  };

  private isChessPiece = (element: HTMLElement | null): boolean => {
    return Boolean(element?.classList.contains("chess-piece"));
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
