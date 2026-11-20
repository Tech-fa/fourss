export function responseBody(buffer: Buffer, contentType: string): unknown {
  if (!buffer.length) return null;
  const type = contentType.toLowerCase();
  if (type.includes("json")) {
    const text = buffer.toString("utf8").trim();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return buffer.toString("utf8");
    }
  }
  if (type.startsWith("text/") || type.includes("csv") || type.includes("xml") || type.includes("javascript")) {
    return buffer.toString("utf8");
  }
  const utf8 = buffer.toString("utf8").trim();
  if (utf8.startsWith("{") || utf8.startsWith("[")) {
    try {
      return JSON.parse(buffer.toString("utf8"));
    } catch {
      // A file that is not JSON is returned as one character per byte.
    }
  }
  return buffer.toString("latin1");
}
