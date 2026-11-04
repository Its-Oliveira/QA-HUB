export interface JiraFieldMetadata { id: string; name?: string }

const normalizedName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

export function discoverDetailFields(fields: JiraFieldMetadata[]) {
  const custom = fields.filter(field => field.id.startsWith('customfield_'));
  return {
    moduleIds: custom.filter(field => /^(modulo|module)(\s.*)?$/.test(normalizedName(field.name || ''))).map(field => field.id),
    descriptionIds: custom.filter(field => ['descricao do problema', 'descricao do bug', 'problem description'].includes(normalizedName(field.name || ''))).map(field => field.id),
  };
}

export function hasDescription(value: unknown): boolean {
  if (typeof value === 'string') return !!value.trim();
  if (!value || typeof value !== 'object') return false;
  const node = value as { text?: unknown; type?: string; content?: unknown[] };
  return (typeof node.text === 'string' && !!node.text.trim()) || ['media', 'mention', 'inlineCard', 'blockCard', 'emoji'].includes(node.type || '') || (Array.isArray(node.content) && node.content.some(hasDescription));
}

export function selectDescription(fields: Record<string, unknown>, descriptionIds: string[]): unknown {
  // The company's "Descrição do Problema" is the authoritative bug description.
  for (const id of descriptionIds) if (hasDescription(fields[id])) return fields[id];
  return hasDescription(fields.description) ? fields.description : null;
}