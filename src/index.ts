//Web components
import "./components/web-component.component";

import { logarithm } from "@utils/functions/helper-functions/math.functions";

import "./sass/main.scss";
import { selectQuery } from "@utils/functions/helper-functions/dom.functions";
import ChessBoard from "@utils/classes/chess-board.class";

console.log(logarithm(69));

const chessBoardElement: HTMLElement = selectQuery(".chess__board");

const chessBoardInstance: ChessBoard = new ChessBoard(chessBoardElement);

chessBoardInstance.generateBoard();
