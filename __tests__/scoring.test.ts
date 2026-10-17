import { calculate, isComplete, type Scores } from '../src/scoring/formula';

const film = (n: number, feel = n): Scores => ({
  plot: n,
  logic: n,
  characters: n,
  pacing: n,
  depth: n,
  acting: n,
  visuals: n,
  music: n,
  feel,
});

describe('score formula', () => {
  it('matches the spreadsheet', () => {
    const r = calculate('film', film(8))!;
    expect(r.story).toBeCloseTo(7.2);
    expect(r.presentationScale).toBeCloseTo(0.7 + 7 * (0.5 / 9));
    expect(r.feelScale).toBeCloseTo(0.8 + 7 * (0.4 / 9));
    expect(r.final).toBeCloseTo(
      7.2 * (0.7 + 7 * (0.5 / 9)) * (0.8 + 7 * (0.4 / 9)),
    );
  });

  it('needs every aspect', () => {
    expect(isComplete('film', { plot: 5 })).toBe(false);
    expect(calculate('film', { ...film(5), feel: 0 })).toBeNull();
  });

  it("uses the kind's presentation aspects", () => {
    const s = { ...film(6), voice: 6, art: 6 };
    expect(calculate('anime', s)).not.toBeNull();
    expect(calculate('novel', { ...film(6), prose: 6 })).not.toBeNull();
  });

  it('is not capped', () => {
    expect(calculate('film', film(10))!.final).toBeCloseTo(12.96);
  });
});
