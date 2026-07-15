// ID 생성 — crypto.randomUUID는 구형 브라우저·비보안 컨텍스트에 없을 수 있어 폴백을 둔다.
export function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
