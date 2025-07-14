//Web components
import "./components/web-component.component";

import "./sass/main.scss";
import { selectQuery } from "@utils/functions/helper-functions/dom.functions";
import ChessBoard from "@utils/classes/chess-board.class";

const noLocalHostReloadPrevention: boolean = true;
window.addEventListener("beforeunload", (e) => {
  const currentUrl = new URL(window.location.href);
  if (currentUrl.hostname === "localhost" && noLocalHostReloadPrevention) {
    return;
  }

  e.preventDefault();

  e.returnValue = ""; // ? Legacy method for Chrome and Firefox
});

const analysisTabForm = selectQuery(
  '[data-element="analysis-tab"]'
) as HTMLFormElement;

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

const fen = "8/8/8/8/8/k2q4/8/K7 b - - 0 1";
// chessBoardInstance.loadFen(fen);

const blackPerspectiveToggle = document.querySelector<HTMLInputElement>(
  "[data-element=perspective-toggle]"
);

blackPerspectiveToggle?.addEventListener("change", () => {
  const perspective = blackPerspectiveToggle.checked ? "black" : "white";
  chessBoardInstance.setPerspective(perspective);
});

chessBoardInstance.loadFen(fen);
