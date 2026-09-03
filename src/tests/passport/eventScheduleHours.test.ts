import test from "node:test";
import assert from "node:assert/strict";
import { eventTimeWindow, validateEventTime } from "../../utils/eventScheduleHours.js";

test("aplica 09h às 22h nos dias úteis", () => {
  assert.deepEqual(eventTimeWindow("2026-09-04"), { min: "09:00", max: "22:00", label: "09h às 22h" });
  assert.equal(validateEventTime("2026-09-07", "08:59", "10:00"), "Neste dia, o horário inicial deve ficar entre 09h às 22h.");
  assert.equal(validateEventTime("2026-09-07", "09:00", "22:00"), "");
});

test("aplica 10h às 22h nos finais de semana", () => {
  assert.deepEqual(eventTimeWindow("2026-09-05"), { min: "10:00", max: "22:00", label: "10h às 22h" });
  assert.equal(validateEventTime("2026-09-06", "09:59", "12:00"), "Neste dia, o horário inicial deve ficar entre 10h às 22h.");
});

test("encerra às 21h no domingo final", () => {
  assert.deepEqual(eventTimeWindow("2026-09-13"), { min: "10:00", max: "21:00", label: "10h às 21h" });
  assert.equal(validateEventTime("2026-09-13", "10:00", "21:01"), "Neste dia, o horário final deve ficar entre 10h às 21h.");
  assert.equal(validateEventTime("2026-09-13", "10:00", "21:00"), "");
});

test("impede horário final anterior ao inicial", () => {
  assert.equal(validateEventTime("2026-09-08", "14:00", "13:00"), "O horário final não pode ser anterior ao horário inicial.");
});

test("aplica a janela correta em todos os dez dias da Bienal", () => {
  const expected = [
    ["2026-09-04", "09:00", "22:00"],
    ["2026-09-05", "10:00", "22:00"],
    ["2026-09-06", "10:00", "22:00"],
    ["2026-09-07", "09:00", "22:00"],
    ["2026-09-08", "09:00", "22:00"],
    ["2026-09-09", "09:00", "22:00"],
    ["2026-09-10", "09:00", "22:00"],
    ["2026-09-11", "09:00", "22:00"],
    ["2026-09-12", "10:00", "22:00"],
    ["2026-09-13", "10:00", "21:00"],
  ];
  for (const [date, min, max] of expected) {
    assert.equal(eventTimeWindow(date).min, min, `abertura incorreta em ${date}`);
    assert.equal(eventTimeWindow(date).max, max, `encerramento incorreto em ${date}`);
    assert.equal(validateEventTime(date, min, max), "", `limites deveriam ser aceitos em ${date}`);
  }
});

test("rejeita minutos imediatamente fora das janelas", () => {
  assert.match(validateEventTime("2026-09-04", "08:59", "10:00"), /09h às 22h/);
  assert.match(validateEventTime("2026-09-05", "09:59", "12:00"), /10h às 22h/);
  assert.match(validateEventTime("2026-09-13", "10:00", "21:01"), /10h às 21h/);
});
