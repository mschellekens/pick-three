import { describe, expect, it } from 'vitest';
import { attentionObservations, attentionThreshold, computeAttention } from './attention';
import { workout } from './testkit';
import { liftingDays } from './history';

const full = (date: string, opts = {}) =>
  workout(date, [
    { ex: 'back-squat', sets: [[60, 8]] },
    { ex: 'bb-bench', sets: [[50, 8]] },
    { ex: 'lat-pulldown', sets: [[40, 10]] },
  ], opts);

const byRegion = (list: ReturnType<typeof computeAttention>) => Object.fromEntries(list.map((a) => [a.region, a]));

describe('attention threshold', () => {
  it('is max(4, 2*ceil(7/f)) with frequency clamped to 1–5', () => {
    expect(attentionThreshold(1)).toBe(14);
    expect(attentionThreshold(2)).toBe(8);
    expect(attentionThreshold(3)).toBe(6);
    expect(attentionThreshold(4)).toBe(4);
    expect(attentionThreshold(5)).toBe(4);
    expect(attentionThreshold(9)).toBe(4);
    expect(attentionThreshold(0)).toBe(14);
  });
});

describe('computeAttention', () => {
  it('empty profile has no data anywhere', () => {
    const a = computeAttention([], '2026-03-10', 3);
    expect(a.every((x) => x.state === 'noData')).toBe(true);
    expect(attentionObservations(a)).toEqual([]);
  });

  it('state boundaries at 2 days and the threshold', () => {
    const ws = [full('2026-03-01')];
    const at = (today: string) => byRegion(computeAttention(ws, today, 3)).quads.state;
    expect(at('2026-03-01')).toBe('recent');
    expect(at('2026-03-03')).toBe('recent');
    expect(at('2026-03-04')).toBe('rotation');
    expect(at('2026-03-06')).toBe('rotation');
    expect(at('2026-03-07')).toBe('attention');
  });

  it('counts primary regions once per day regardless of volume, two workouts on one date count once', () => {
    const ws = [full('2026-03-09', { hour: 7 }), full('2026-03-09', { hour: 18 }), full('2026-03-05')];
    const q = byRegion(computeAttention(ws, '2026-03-10', 3)).quads;
    expect(q.daysInWeek).toBe(2);
    expect(liftingDays(ws)).toEqual(['2026-03-05', '2026-03-09']);
  });

  it('secondary work is context only and does not reset the primary clock', () => {
    const ws = [workout('2026-03-01', [{ ex: 'hip-thrust', sets: [[60, 8]] }]), workout('2026-03-09', [{ ex: 'back-squat', sets: [[60, 8]] }])];
    const g = byRegion(computeAttention(ws, '2026-03-10', 3)).glutes;
    expect(g.lastPrimary).toBe('2026-03-01');
    expect(g.lastSecondary).toBe('2026-03-09');
    expect(g.state).toBe('attention');
  });

  it('surfaces untrained major regions only after two logged training days', () => {
    const one = [full('2026-03-01')];
    expect(byRegion(computeAttention(one, '2026-03-02', 3)).hamstrings.state).toBe('noData');
    const two = [full('2026-03-01'), full('2026-03-03')];
    const r = byRegion(computeAttention(two, '2026-03-04', 3));
    expect(r.hamstrings.state).toBe('noDirect');
    expect(r.rearShoulders.state).toBe('noData'); // minor region stays neutral
  });

  it('observations order never and least recently logged first, capped at three', () => {
    const ws = [
      workout('2026-03-01', [{ ex: 'bb-bench', sets: [[50, 8]] }]),
      workout('2026-03-06', [{ ex: 'lat-pulldown', sets: [[40, 8]] }]),
      workout('2026-03-09', [{ ex: 'back-squat', sets: [[60, 8]] }]),
    ];
    const obs = attentionObservations(computeAttention(ws, '2026-03-10', 3));
    expect(obs).toHaveLength(3);
    expect(obs[0].text).toBe('Glutes · No direct work logged');
    expect(obs[1].text).toBe('Hamstrings · No direct work logged');
    expect(obs[2].text).toBe('Shoulders · No direct work logged');
    const ws2 = [...ws, workout('2026-03-09', [{ ex: 'seated-db-shoulder-press', sets: [[14, 8]] }]), workout('2026-03-08', [{ ex: 'bb-rdl', sets: [[60, 8]] }])];
    const obs2 = attentionObservations(computeAttention(ws2, '2026-03-10', 3));
    expect(obs2.map((o) => o.text)).toEqual([
      'Chest · Last direct work 9 days ago · 0 days in the past week',
      'Back · Last direct work 4 days ago · 1 day in the past week',
      'Glutes · Last direct work 2 days ago',
    ]);
  });

  it('a deleted workout no longer affects state', () => {
    const ws = [full('2026-03-01'), full('2026-03-09')];
    expect(byRegion(computeAttention(ws, '2026-03-10', 3)).chest.state).toBe('recent');
    expect(byRegion(computeAttention(ws.slice(0, 1), '2026-03-10', 3)).chest.state).toBe('attention');
  });

  it('uses the stored local date, so a session past midnight counts on its start date', () => {
    // Started 23:30 local on 1 Mar, stored as 2026-03-01, finished after midnight.
    const w = full('2026-03-01');
    w.startedAt = '2026-03-02T04:30:00.000Z';
    w.finishedAt = '2026-03-02T05:40:00.000Z';
    expect(byRegion(computeAttention([w], '2026-03-03', 3)).quads.daysSince).toBe(2);
    expect(liftingDays([w])).toEqual(['2026-03-01']);
  });

  it('frequency changes the threshold', () => {
    const ws = [full('2026-03-01')];
    expect(byRegion(computeAttention(ws, '2026-03-06', 5)).quads.state).toBe('attention');
    expect(byRegion(computeAttention(ws, '2026-03-06', 1)).quads.state).toBe('rotation');
  });
});
