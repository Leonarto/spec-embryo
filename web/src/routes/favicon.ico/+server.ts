/** No icon is configured. Avoid rendering the project layout for browser icon requests. */
export function GET(): Response {
  return new Response(null, { status: 204 });
}
