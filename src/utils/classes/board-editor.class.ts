import ChessBoardController from "@utils/classes/chess-board-controller";
import DragManager from "@utils/classes/drag-manager.class";

class BoardEditor extends ChessBoardController {
  // ? Note: Not extending ChessBoardController because of an issue with Vite
  constructor(container: HTMLElement) {
    super(container);
    this.generateBoard();
  }
}

export default BoardEditor;
