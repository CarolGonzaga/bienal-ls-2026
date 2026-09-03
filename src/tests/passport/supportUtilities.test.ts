import test from "node:test";
import assert from "node:assert/strict";
import { friendlySubmissionError } from "../../utils/friendlySubmissionError.ts";

test("traduz erros técnicos frequentes para mensagens amigáveis", () => {
  assert.equal(
    friendlySubmissionError({ message: "duplicate key value violates unique constraint" }),
    "Esta informação já foi enviada ou cadastrada.",
  );
  assert.match(friendlySubmissionError({ message: "new row violates row-level security policy" }), /sessão expirou/i);
  assert.match(friendlySubmissionError({ message: "null value in column title violates not-null constraint" }), /obrigatória/i);
});

test("preserva validações úteis em português e esconde erros internos inesperados", () => {
  assert.equal(friendlySubmissionError(new Error("Informe o horário inicial.")), "Informe o horário inicial.");
  assert.equal(
    friendlySubmissionError(new Error("TypeError: cannot read property x"), "Tente novamente."),
    "Tente novamente.",
  );
});

test("usa a mensagem alternativa quando o erro não possui texto", () => {
  assert.equal(friendlySubmissionError(null, "Falha temporária."), "Falha temporária.");
});
