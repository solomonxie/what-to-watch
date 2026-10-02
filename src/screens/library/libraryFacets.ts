import { getTitlesByIds } from '../../db/repositories/titlesRepo';
import { languageName, unifiedGenres } from '../../config/taxonomy';
import type { GridItem } from '../../ui/components';
import { joinMeta, mediaLabel, year } from '../../ui/format';
import { getAllMarks } from '../../db/repositories/marksRepo';
import { groupByTitle, lastChange } from '../../marks/derive';

export interface LibraryFacet {
  kind: 'genre' | 'language';
  value: string;
}

export interface FacetCount {
  value: string;
  label: string;
  count: number;
}

type LibraryTitle = Awaited<ReturnType<typeof getTitlesByIds>>[number];

/**
 * When each title last changed by the user's hand: its newest mark. Library
 * lists sort by it, newest first; viewing never moves it.
 */
export async function lastChanges(): Promise<Map<string, number>> {
  return new Map(
    [...groupByTitle(await getAllMarks())].map(([id, marks]) => [
      id,
      lastChange(marks),
    ]),
  );
}

/** Everything watched, rated or marked, most recent change first. */
async function libraryTitles(): Promise<LibraryTitle[]> {
  const latest = await lastChanges();
  const ids = [...latest.keys()].sort(
    (a, b) => latest.get(b)! - latest.get(a)!,
  );
  const titles = new Map((await getTitlesByIds(ids)).map(t => [t.id, t]));
  return ids.flatMap(id => titles.get(id) ?? []);
}

// Animation is a type, not a genre.
const genresOf = (t: LibraryTitle) =>
  Array.from(
    new Set(t.genres.flatMap(unifiedGenres).filter(g => g !== 'Animation')),
  );

const valuesOf = (t: LibraryTitle, kind: LibraryFacet['kind']) =>
  kind === 'genre'
    ? genresOf(t)
    : t.originalLanguage
    ? [t.originalLanguage]
    : [];

function counts(
  titles: LibraryTitle[],
  kind: LibraryFacet['kind'],
): FacetCount[] {
  const n = new Map<string, number>();
  for (const t of titles)
    for (const v of valuesOf(t, kind)) n.set(v, (n.get(v) ?? 0) + 1);
  return [...n]
    .map(([value, count]) => ({
      value,
      count,
      label: kind === 'language' ? languageName(value) : value,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export async function loadLibraryFacets() {
  const titles = await libraryTitles();
  return {
    genres: counts(titles, 'genre'),
    languages: counts(titles, 'language'),
  };
}

export async function loadFacetItems(facet: LibraryFacet): Promise<GridItem[]> {
  return (await libraryTitles())
    .filter(t => valuesOf(t, facet.kind).includes(facet.value))
    .map(t => ({
      id: t.id,
      title: t.title,
      posterPath: t.posterPath,
      meta: joinMeta([year(t.releaseDate), mediaLabel(t.mediaType)]),
    }));
}
