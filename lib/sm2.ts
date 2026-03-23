export interface SM2State {
  ease_factor: number
  interval: number
  repetitions: number
}

// 0=Again, 1=Hard, 2=Good, 3=Easy
export type Rating = 0 | 1 | 2 | 3

const QUALITY_MAP: Record<Rating, number> = {
  0: 1,
  1: 2,
  2: 4,
  3: 5,
}

export function computeNextReview(
  state: SM2State,
  rating: Rating
): SM2State & { due_date: Date } {
  const quality = QUALITY_MAP[rating]
  let { ease_factor, interval, repetitions } = state

  if (quality < 3) {
    repetitions = 0
    interval = 1
  } else {
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * ease_factor)
    }
    repetitions += 1
  }

  ease_factor =
    ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (ease_factor < 1.3) ease_factor = 1.3

  const due_date = new Date()
  due_date.setDate(due_date.getDate() + interval)

  return { ease_factor, interval, repetitions, due_date }
}

export function getIntervalLabel(rating: Rating, state: SM2State): string {
  const next = computeNextReview(state, rating)
  const days = next.interval
  if (days <= 0) return 'now'
  if (days === 1) return '1 day'
  if (days < 7) return `${days} days`
  if (days < 30) return `${Math.round(days / 7)}w`
  return `${Math.round(days / 30)}mo`
}
