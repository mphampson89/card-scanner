export function computeConfidence(fields) {
  const nameEmpty = !fields.firstName && !fields.lastName
  const noContact = !fields.workPhone && !fields.mobilePhone && !fields.email
  return nameEmpty || noContact ? 'check' : 'high'
}
