/**
 * How the connected agent sets up a third-party connection.
 * The same text lives in web_backend/src/agent-helper/integrations.ts.
 * helper-broker.spec.ts fails if the two copies drift.
 */
export const INTEGRATIONS_GUIDE = `Integrations.

A connection is one row. The list is /plan/integrations. One connection is /plan/integrations/:id. That page shows the steps you wrote, and the html and js page when you have sent them. Ask the user for a secret or a portal action through a step on that page. Do not ask for a secret in the chat. Do not put a secret in an API call.

Call api_access first. Look up the Integrations tag in the OpenAPI document, then call that operation with the authorization header.

POST /integrations with { name } creates the connection.

POST /integrations/:id/proposal writes a draft. Send inputs and steps first, before the program. Each input has key, label, description, required, and secret. description is the sentence that tells the user where to copy the value from. Each step has id, title, instruction, an optional link { label, url } to the third-party page, fields for the keys that step collects, an optional copy, and doneWhen. doneWhen is fields_saved when saving the required fields finishes the step. doneWhen is manual when the user must do something in the other portal, such as pasting a webhook URL. copy.kind webhookUrl or oauthRedirectUrl asks the server to fill the URL. Do not write that URL yourself. copy.kind configKey, with key, copies a non-secret value the user already saved.

Open /plan/integrations/:id and stop. The user fills the fields and marks a manual step done. GET /integrations/:id afterwards. missing lists required keys that are still empty. filled is true when a secret is already saved. The response does not include the secret.

When the answers are saved, POST /integrations/:id/proposal again with source, html, js, and capabilities. html is the page the user sees. js uses integration.api(path, { method, body }), integration.open(url) to open an OAuth window, and integration.setStatus(text). source is the server program. It calls route(method, path, async (ctx, request) => result), schedule(name, { everySeconds }, async (ctx) => result), and subscribe(event, async (ctx, message) => result). ctx.setStatus(text) sets the same status the list shows. ctx.http calls an origin in capabilities.outboundHosts. ctx.config holds the saved answers. ctx.sql is not on this connection yet. capabilities.maxPerMinute limits outbound calls.

POST /integrations/:id/try runs one exported hook from the draft. POST /integrations/:id/call runs a route the draft registered. Neither accepts the draft.

POST /integrations/:id/accept starts the schedules and subscriptions. Required keys must already be saved. POST /integrations/:id/restore with { revisionId } points the connection back at an older accepted revision. A new draft keeps the accepted program running until accept.

GET /integrations/:id/failures lists redacted failures. Propose a fixed draft, try the failing call, then accept. The agent does not call /integrations/hooks. That URL is for the third party. hookBase on the connection is its prefix.

Evidence for an audit checklist. Search this system first. GET /documents, GET /documents/:id/text, GET /standards/implementations, GET /audits/instances/:instanceId/attachments, and GET /audits/findings?auditInstanceId=. Attach a document already here with evidenceType DOCUMENT. On a checklist finding, add a snapshot or a link as the evidence. A link is evidenceType DOCUMENT and documentId. A snapshot is evidenceType AUDIT_EVIDENCE_FILE and the screenshot or file. Open Slack or another connection only when those records do not answer the question. Then create or reuse the connection with that name, propose the steps and the program that can list that system's records, and open /plan/integrations/:id?from= the checklist path and stop. The user finishes the connection on that page. After GET /integrations/:id shows no missing required keys, go back to the from path. Call the route that lists the records. Attach the snapshot to the question with POST /audits/findings, evidenceType AUDIT_EVIDENCE_FILE, or to the whole checklist with POST /audits/instances/:instanceId/attachments.`
