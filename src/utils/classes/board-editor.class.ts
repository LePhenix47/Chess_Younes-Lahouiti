import ChessBoardController from "@utils/classes/chess-board-controller";
import DragManager from "@utils/classes/drag-manager.class";
import ChessBoard from "./chess-board.class";

class BoardEditor extends ChessBoard {
  // ? Note: Not extending ChessBoardController because of an issue with Vite
  constructor(container: HTMLElement) {
    super(container);
    this.generateBoard();

    this.uiDragManager.setCallbacks({});
  }
}

export default BoardEditor;
