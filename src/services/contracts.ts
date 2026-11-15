export const STRUCTURED_OUTPUT_SCHEMA_VERSION = "1.0";

export function withSchemaVersion<T extends Record<string, unknown>>(payload: T): T & { schema_version: string } {
  return {
    schema_version: STRUCTURED_OUTPUT_SCHEMA_VERSION,
    ...payload,
  };
}
