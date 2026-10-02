import { getAllMarks, getMarksForTitle } from './marksRepo';
import { groupByTitle, titleRating, type Mark } from '../../marks/derive';

// A title's rating is read from its marks: the latest rated title-level one.

export interface TitleRating {
  titleId: string;
  rating: number;
  reviewText: string | null;
  /** When it was rated. */
  updatedAt: number;
}

function toRating(titleId: string, marks: Mark[]): TitleRating | undefined {
  const m = titleRating(marks);
  return m
    ? {
        titleId,
        rating: m.rating!,
        reviewText: m.review || null,
        updatedAt: m.markedAt,
      }
    : undefined;
}

export async function getUserRatingForTitle(titleId: string) {
  return toRating(titleId, await getMarksForTitle(titleId));
}

export async function getAllUserRatings(): Promise<TitleRating[]> {
  return [...groupByTitle(await getAllMarks())].flatMap(
    ([titleId, marks]) => toRating(titleId, marks) ?? [],
  );
}
