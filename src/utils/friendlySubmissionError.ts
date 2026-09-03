export const friendlySubmissionError = (
  error: unknown,
  fallback = 'Não conseguimos enviar agora. Confira os campos e tente novamente.',
) => {
  const message = error instanceof Error
    ? error.message
    : String((error as { message?: string } | null)?.message || '')
  const normalized = message.toLowerCase()

  if (!message) return fallback
  if (normalized.includes('duplicate key') || normalized.includes('unique constraint'))
    return 'Esta informação já foi enviada ou cadastrada.'
  if (normalized.includes('row-level security') || normalized.includes('jwt'))
    return 'Sua sessão expirou ou não tem permissão para esta ação. Entre novamente e tente de novo.'
  if (
    normalized.includes('violates check constraint') ||
    normalized.includes('not-null constraint') ||
    normalized.includes('null value in column') ||
    normalized.includes('invalid input syntax')
  ) return 'Alguma informação obrigatória está faltando ou não está no formato esperado. Revise os campos marcados com *.'

  // As validações do projeto já retornam instruções em português e podem ser
  // mostradas diretamente. Mensagens técnicas inesperadas recebem o fallback.
  if (/[áàâãéêíóôõúç]/i.test(message) || /\b(informe|preencha|selecione|envie|conta|livro|data|horário|estande)\b/i.test(message))
    return message
  return fallback
}

