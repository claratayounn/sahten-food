export function validateMenuFields(body: Record<string, unknown>) {
  if (typeof body.name_en !== 'string' || !body.name_en.trim() || typeof body.name_ar !== 'string' || !body.name_ar.trim() || typeof body.category !== 'string' || !body.category.trim()) return 'Name and category are required.'
  if (!Number.isFinite(Number(body.price)) || Number(body.price) <= 0) return 'Price must be greater than zero.'
  if (!Number.isInteger(Number(body.prep_hours)) || Number(body.prep_hours) <= 0) return 'Prep hours must be a positive integer.'
  return null
}

export function validateMenuPatch(body: Record<string, unknown>) {
  if (body.price !== undefined && (!Number.isFinite(Number(body.price)) || Number(body.price) <= 0)) return 'Price must be greater than zero.'
  if (body.prep_hours !== undefined && (!Number.isInteger(Number(body.prep_hours)) || Number(body.prep_hours) <= 0)) return 'Prep hours must be a positive integer.'
  for (const key of ['name_en', 'name_ar', 'category']) if (body[key] !== undefined && (typeof body[key] !== 'string' || !body[key].trim())) return `${key} must be a non-empty string.`
  return null
}
