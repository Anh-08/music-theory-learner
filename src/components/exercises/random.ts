export function pick<T>(items: readonly T[], random: () => number = Math.random): T {
  if (items.length === 0) throw new Error('Không có gì để chọn')
  return items[Math.floor(random() * items.length)]
}

export function randomInt(min: number, max: number, random: () => number = Math.random): number {
  return min + Math.floor(random() * (max - min + 1))
}
