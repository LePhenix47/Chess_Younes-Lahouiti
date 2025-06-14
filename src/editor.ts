import BoardEditor from "@utils/classes/board-editor.class";
import "./sass/main.scss";

console.log("Editor script loaded successfully!");

import ChessBoardController from "@utils/classes/chess-board-controller";

const chessBoardElement = document.querySelector<HTMLElement>(
  '[data-element="chess-board"]'
);

const boardEditor = new BoardEditor(chessBoardElement);
