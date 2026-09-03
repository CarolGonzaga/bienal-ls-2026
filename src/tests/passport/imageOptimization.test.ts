import assert from "node:assert/strict";
import test from "node:test";
import { detectPassportPhotoMime } from "../../utils/optimizeImage.ts";

test("aceita as variações comuns de MIME para arquivos JPG", () => {
  assert.equal(detectPassportPhotoMime("image/jpeg", "foto.jpg"), "image/jpeg");
  assert.equal(detectPassportPhotoMime("image/jpg", "foto.jpg"), "image/jpeg");
  assert.equal(detectPassportPhotoMime("image/pjpeg", "foto.jpg"), "image/jpeg");
  assert.equal(detectPassportPhotoMime("", "FOTO.JPEG"), "image/jpeg");
  assert.equal(detectPassportPhotoMime("application/octet-stream", "foto.jpg"), "image/jpeg");
});

test("aceita PNG e WebP e rejeita formatos não suportados", () => {
  assert.equal(detectPassportPhotoMime("image/png", "foto.png"), "image/png");
  assert.equal(detectPassportPhotoMime("", "foto.webp"), "image/webp");
  assert.equal(detectPassportPhotoMime("image/heic", "foto.heic"), "");
});
