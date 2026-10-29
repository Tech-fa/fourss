export type CatalogHttpErrorMap = Readonly<Record<string, { readonly message: string }>>;

export type CatalogHttpErrorBody<K extends string = string> = {
  key: K;
  message: string;
  params?: Record<string, string>;
};

export function catalogHttpError<M extends CatalogHttpErrorMap>(
  map: M,
  code: keyof M & string,
  options?: { cause?: unknown; message?: string; params?: Record<string, string> },
): CatalogHttpErrorBody<keyof M & string> {
  const def = map[code];
  let message: string = def.message;
  if (options?.message !== undefined && options.message !== '') {
    message = options.message;
  } else if (options?.cause !== undefined) {
    const cause = options.cause;
    if (cause && typeof cause === 'object' && 'message' in cause) {
      const m = (cause as { message?: unknown }).message;
      if (typeof m === 'string' && m.length > 0) {
        message = m;
      }
    }
  }
  const body: CatalogHttpErrorBody<keyof M & string> = { key: code, message };
  if (options?.params) {
    body.params = options.params;
  }
  return body;
}
