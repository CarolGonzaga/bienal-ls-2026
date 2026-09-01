export const passportAsset = (name: string) =>
  `${(import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL || "/"}${name.replace(/^\/+/, "")}`;
