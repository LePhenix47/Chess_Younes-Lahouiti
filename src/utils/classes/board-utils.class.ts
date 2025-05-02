import { AlgebraicNotation, ChessFile, ChessRank } from "./chess-board.class";
import { IPieceAlgorithm } from "./piece.class";

class BoardUtils {
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

  public static getBoardIndicesFromAlgebraicNotation = (
    algebraicNotation: AlgebraicNotation
  ): IPieceAlgorithm["position"] => {
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
