import { AlgebraicNotation, ChessFile, ChessRank } from "./chess-board.class";
import { IPieceLogic } from "./piece.class";

abstract class BoardUtils {
  public static fileMap = new Map<number, ChessFile>(
    Array.from<unknown, [number, ChessFile]>({ length: 8 }, (_, index) => [
      index,
      String.fromCharCode(97 + index) as ChessFile,
    ])
  );

  public static reverseFileMap = new Map<ChessFile, number>(
    Array.from<unknown, [ChessFile, number]>({ length: 8 }, (_, index) => [
      String.fromCharCode(97 + index) as ChessFile,
      index,
    ])
  );

  public static rankMap = new Map<number, ChessRank>(
    Array.from<unknown, [number, ChessRank]>({ length: 8 }, (_, index) => [
      index,
      (8 - index).toString() as ChessRank,
    ])
  );

  public static reverseRankMap = new Map<ChessRank, number>(
    Array.from<unknown, [ChessRank, number]>({ length: 8 }, (_, index) => [
      (8 - index).toString() as ChessRank,
      index,
    ])
  );

  public static pieceToEmojiMap = new Map<string, string>(
    Object.entries({
      P: "♙",
      N: "♘",
      B: "♗",
      R: "♖",
      Q: "♕",
      K: "♔",
      p: "♟",
      n: "♞",
      b: "♝",
      r: "♜",
      q: "♛",
      k: "♚",
    })
  );

  public static emojiToPieceMap = new Map<string, string>(
    Object.entries({
      "♙": "P",
      "♘": "N",
      "♗": "B",
      "♖": "R",
      "♕": "Q",
      "♔": "K",
      "♟": "p",
      "♞": "n",
      "♝": "b",
      "♜": "r",
      "♛": "q",
      "♚": "k",
    })
  );

  public static normalizePosition = (
    position:
      | Omit<IPieceLogic["position"], "algebraicNotation">
      | AlgebraicNotation
  ): IPieceLogic["position"] => {
    // * Step 1: Normalize the position
    let normalizedPosition: IPieceLogic["position"];
    if (typeof position === "string") {
      const [fileIndex, rankIndex] = position;

      normalizedPosition = {
        fileIndex,
        rankIndex,
        algebraicNotation: position,
      };
    } else {
      const { fileIndex, rankIndex } = position;
      normalizedPosition = {
        fileIndex,
        rankIndex,
        algebraicNotation: `${fileIndex}${rankIndex}` as AlgebraicNotation,
      };
    }

    // * Step 2: Convert algebraic notation to indices and update normalizedPosition
    const fileIndex =
      BoardUtils.reverseFileMap.get(
        normalizedPosition.fileIndex as ChessFile
      ) ?? -1;
    const rankIndex =
      BoardUtils.reverseRankMap.get(
        normalizedPosition.rankIndex as ChessRank
      ) ?? -1;

    const hasInvalidPosition = [fileIndex, rankIndex].includes(-1);
    if (hasInvalidPosition) {
      throw new Error(`"Invalid position: ${normalizedPosition}`);
    }

    // * Step 3: Update normalizedPosition to use indices instead of algebraic notation
    normalizedPosition.fileIndex = fileIndex.toString();
    normalizedPosition.rankIndex = rankIndex.toString();

    return normalizedPosition;
  };

  public static getBoardIndicesFromAlgebraicNotation = (
    algebraicNotation: AlgebraicNotation
  ): IPieceLogic["position"] => {
    const [file, rank] = algebraicNotation;

    const fileIndex = BoardUtils.reverseFileMap.get(file as ChessFile);
    const rankIndex = BoardUtils.reverseRankMap.get(rank as ChessRank);

    return {
      algebraicNotation,
      fileIndex: `${fileIndex}`,
      rankIndex: `${rankIndex}`,
    };
  };

  public static getAlgebraicNotationFromBoardIndices = (
    fileIndex: number,
    rankIndex: number
  ): AlgebraicNotation => {
    const file = BoardUtils.fileMap.get(fileIndex);
    const rank = BoardUtils.rankMap.get(rankIndex);
    // console.log({ fileIndex, rankIndex });

    if (!file || !rank) {
      console.error(
        `Invalid board indices: fileIndex = ${fileIndex}, rankIndex = ${rankIndex}`
      );

      return "" as AlgebraicNotation;
    }

    return `${file}${rank}` as AlgebraicNotation;
  };
}

export default BoardUtils;
