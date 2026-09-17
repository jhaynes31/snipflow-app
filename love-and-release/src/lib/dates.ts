export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const dayOfYear = (d = new Date()) =>
  Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000)

export const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
