// Guarda en memoria el borrador de cada checklist, para no perder lo avanzado
// si el inspector vuelve atrás por error.
const drafts = new Map();

export const getDraft = (id) => drafts.get(id);
export const setDraft = (id, respuestas) => drafts.set(id, respuestas);
export const clearDraft = (id) => drafts.delete(id);
