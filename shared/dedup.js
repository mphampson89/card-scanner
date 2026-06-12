export function normalizeEmail(e) {
  return (e || '').trim().toLowerCase()
}

function norm(s) {
  return (s || '').trim().toLowerCase()
}

export function matchedOn(candidate, existing) {
  const ce = normalizeEmail(candidate.email)
  const ee = normalizeEmail(existing.email)
  if (ce && ee && ce === ee) return 'email'
  const sameName = norm(candidate.firstName) === norm(existing.firstName)
    && norm(candidate.lastName) === norm(existing.lastName)
  const sameCompany = norm(candidate.company) === norm(existing.company)
  const hasName = norm(candidate.firstName) || norm(candidate.lastName)
  if (hasName && sameName && norm(candidate.company) && sameCompany) return 'name+company'
  return null
}
