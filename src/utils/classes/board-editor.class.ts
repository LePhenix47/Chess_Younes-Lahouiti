import ChessBoardController from "@utils/classes/chess-board-controller";
import DragManager from "@utils/classes/drag-manager.class";

class BoardEditor extends ChessBoardController {
  private readonly uiDragManager: DragManager;

  constructor(container: HTMLElement) {
    super(container);
    this.generateBoard();

    this.uiDragManager = new DragManager(container);

    this.uiDragManager.setCallbacks({
      onDragStart: () => {},
      onDragMove: () => {},
      onDrop: () => {},
      onPieceClick: () => {},
      onEmptySquareClick: () => {},
    });
  }
}

export default BoardEditor;
