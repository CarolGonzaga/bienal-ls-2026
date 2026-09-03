import test from "node:test";
import assert from "node:assert/strict";
import { dedupeBookTags } from "../../utils/bookTags.ts";

test("remove da lista a tag que repete o gênero", () => {
  assert.deepEqual(
    dedupeBookTags("Romance Sáfico", ["romance sáfico", "Nacional", "+18"]),
    ["Nacional", "+18"],
  );
});

test("remove tags repetidas ignorando caixa, acentos e pontuação", () => {
  assert.deepEqual(
    dedupeBookTags("Fantasia", ["Slow burn", "slow-burn", "Fórmula 1", "formula 1"]),
    ["Slow burn", "Fórmula 1"],
  );
});

test("descarta tags vazias e aceita dados antigos inválidos", () => {
  assert.deepEqual(dedupeBookTags("Romance", ["", "  ", null, "Nacional"]), ["Nacional"]);
  assert.deepEqual(dedupeBookTags("Romance", null), []);
});
