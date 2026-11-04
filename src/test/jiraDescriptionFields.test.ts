import { describe, it, expect } from 'vitest';
import { discoverDetailFields, selectDescription } from '../../supabase/functions/jira-issue-details/fields';

describe('Campo Descrição do Problema do Jira', () => {
  it('solicita o campo personalizado visto na tela do Jira', () => {
    expect(discoverDetailFields([{ id: 'customfield_10042', name: 'Descrição do Problema' }, { id: 'customfield_10043', name: 'Módulo' }, { id: 'customfield_10044', name: 'E-mail Cliente' }])).toEqual({ descriptionIds: ['customfield_10042'], moduleIds: ['customfield_10043'] });
  });
  it('prioriza a descrição do problema e preserva o ADF completo', () => {
    const description = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Breve explicação:' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Cliente não consegue entrar no logar na conta do orçabim pois relata " erro ao tentar logar"' }] }] };
    expect(selectDescription({ customfield_10042: description, description: 'Outro texto' }, ['customfield_10042'])).toBe(description);
  });
  it('usa a descrição padrão para cards sem descrição personalizada', () => {
    expect(selectDescription({ customfield_10042: { type: 'doc', content: [{ type: 'paragraph' }] }, description: 'Descrição padrão' }, ['customfield_10042'])).toBe('Descrição padrão');
  });
  it('mantém vazio apenas quando nenhuma descrição foi informada', () => {
    expect(selectDescription({ description: null, customfield_10042: ' ' }, ['customfield_10042'])).toBeNull();
  });
});