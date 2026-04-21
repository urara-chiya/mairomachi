import { logger } from '../service/logger'

type Diff<T> = {
  [K in keyof T]?: {
    from: T[K]
    to: T[K]
  }
}

export default function objectsDiff<T extends object>(
  a: T | null | undefined,
  b: T | null | undefined
): Partial<Diff<T>> {
  logger.debug('Diff', 'Comparing object differences')
  if (!a || !b) {
    logger.debug('Diff', 'One of the objects is null/undefined, returning empty diff')
    return {}
  }
  const result: Partial<Diff<T>> = {}

  ;(Object.keys(a) as Array<keyof T>).forEach((key) => {
    if (!Object.is(a[key], b[key])) {
      result[key] = { from: a[key], to: b[key] }
    }
  })

  const diffKeys = Object.keys(result)
  if (diffKeys.length > 0) {
    logger.debug('Diff', `Found differences: ${diffKeys.join(', ')}`)
  } else {
    logger.debug('Diff', 'No differences')
  }

  return result
}
