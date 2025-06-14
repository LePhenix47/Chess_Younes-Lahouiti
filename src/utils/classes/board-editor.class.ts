import ChessBoardController from "@utils/classes/chess-board-controller";
import DragManager from "@utils/classes/drag-manager.class";
import ChessBoard from "./chess-board.class";

class BoardEditor extends ChessBoard {
  constructor(container: HTMLElement) {
    super(container);
    this.generateBoard();
  }
}

export default BoardEditor;
