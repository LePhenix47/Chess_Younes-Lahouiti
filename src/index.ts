//Web components
import "./components/web-component.component";

import "./sass/main.scss";
import { selectQuery } from "@utils/functions/helper-functions/dom.functions";
import ChessBoard from "@utils/classes/chess-board.class";

const analysisTabForm = selectQuery(
  '[data-element="analysis-tab"]'
) as HTMLFormElement;

const fenInputElement = selectQuery(
  '[data-element="fen-input"]'
) as HTMLInputElement;

const pgnInputElement = selectQuery(
  '[data-element="pgn-input"]'
) as HTMLTextAreaElement;

analysisTabForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const currentForm = event.currentTarget as HTMLFormElement;

  const formData = new FormData(currentForm);

  const formHashmap = new Map<string, string>(formData.entries());

  const fen = formHashmap.get("fen") as string;
  if (fen) {
    chessBoardInstance.loadFen(fen);
  }

  const pgn = formHashmap.get("pgn") as string;
  if (pgn) {
    chessBoardInstance.loadPgn(pgn);
  }

  // console.log({ fen, pgn });
});

const chessBoardElement: HTMLElement = selectQuery(
  '[data-element="chess-board"]'
);

const chessBoardInstance = new ChessBoard(chessBoardElement);

chessBoardInstance.generateBoard();
// chessBoardInstance.loadFen(chessBoardInstance.initialFen);
const fen = "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w Qq - 0 1";
chessBoardInstance.loadFen(fen);
