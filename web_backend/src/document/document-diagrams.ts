const DIAGRAM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NODE_KINDS = new Set(["person", "step", "decision", "terminator"]);

export function sanitizeDiagramMap(
  value: unknown,
): Record<string, unknown> | null {
  if (value == null || value === "") return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const map: Record<string, unknown> = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
    if (!DIAGRAM_ID.test(id)) continue;
    const diagram = sanitizeDiagram(raw);
    if (diagram) map[id] = diagram;
  }
  return Object.keys(map).length > 0 ? map : null;
}

function sanitizeDiagram(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as { kind?: unknown; nodes?: unknown; edges?: unknown };
  if (raw.kind !== "org" && raw.kind !== "process") return null;
  if (!Array.isArray(raw.nodes) || raw.nodes.length === 0 || raw.nodes.length > 80) return null;
  if (!Array.isArray(raw.edges) || raw.edges.length > 120) return null;

  const nodes = raw.nodes.map(sanitizeNode);
  const edges = raw.edges.map(sanitizeEdge);
  if (nodes.some((node) => node == null) || edges.some((edge) => edge == null)) return null;
  return { kind: raw.kind, nodes, edges };
}

function sanitizeNode(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.kind !== "string" || !NODE_KINDS.has(raw.kind)) return null;
  if (!isShortText(raw.id, 40) || !isShortText(raw.label, 200) || !isShortText(raw.subtitle, 200)) {
    return null;
  }
  if (!isCoordinate(raw.x) || !isCoordinate(raw.y)) return null;
  return {
    id: raw.id,
    kind: raw.kind,
    label: raw.label,
    subtitle: raw.subtitle,
    x: raw.x,
    y: raw.y,
  };
}

function sanitizeEdge(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (!isShortText(raw.id, 40) || !isShortText(raw.from, 40) || !isShortText(raw.to, 40)) return null;
  if (!isShortText(raw.label, 80)) return null;
  return { id: raw.id, from: raw.from, to: raw.to, label: raw.label };
}

function isShortText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

function isCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -10000 && value <= 100000;
}
