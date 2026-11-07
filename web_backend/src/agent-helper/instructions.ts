/**
 * Same confirmation sentences as the dashboard handoff and the desktop shell.
 * helper-broker.spec.ts fails if this copy drifts.
 */

export const LEAVE_CONFIRMATION_TO_THE_USER =
    'After you change the page, stop. Do not call submit_form, and do not click a confirmation button. The user approves the change by clicking that button.'

export const STAY_ON_PAGE_RULE =
    'Call describe_page before you change the page. Stay on that page unless the user asks you to open another one.'

export const SUBMIT_FORM_REFUSAL =
    'Do not call this. The user approves the change by clicking the confirmation button.'

export const HELPER_OFF_MESSAGE =
    'Turn on the agent helper in the dashboard and leave that tab open.'

export const HELPER_TOOL_ORDER =
    'Call list_pages, then navigate, then describe_page, then set_fields.'

export const API_ACCESS_DESCRIPTION =
    'Tell the agent which API this app uses and give it the login token from this browser. Returns the OpenAPI document URL, the Swagger URL, and the authorization value stored in localStorage under auth. Look up the operation in the OpenAPI document, then call that API with the authorization header. The value already includes Bearer when the page stored it. This does not submit the page.'

export const APPLY_PLAYGROUND_DESCRIPTION =
    'Build the playground the user asked for. Open the Playground page first. html is the page they see. js is how that page behaves. The page can call playground.sql and playground.fetch. It calls this playground\'s own routes with playground.api(path, { method, body, file }). backend is those routes, and only when a request needs work on the server. Define each route as route(method, path, async (playground, request) => result). The first matching route runs. request has body, query, params, and file when a file was attached. The handler can use playground.sql, playground.fetch, and playground.save(request.file, name). Return playground.open(name) to send a stored file back. A link to an existing record stores the record id, the record name, and an endpoint path on this app. name opens an existing playground or creates a draft when none is open. The user sees the running app, not the files. Do not mention the files. This stores the app and shows it. It does not publish. The user clicks Publish.'

export function helperInstructions(): string {
    return [
        'These tools control the dashboard tab that has the agent helper turned on.',
        HELPER_TOOL_ORDER,
        'Paths that contain :name need a real id from the open page.',
        'To call the API, call api_access. It tells you the OpenAPI document for this app and gives you the authorization token from this browser localStorage. Look up the operation in that document, then call the API with that token.',
        'A playground keeps its own tables. The page uses playground.sql. A link to an existing record is the record id, the record name, and an endpoint path on this app. The page or a server function fetches that path. Do not add columns to the playground entity resolver.',
        'To choose a dropdown, call select_option with the field label and the option text.',
        'Build what the user asked for by calling apply_playground. html is the page they see. js is how that page behaves. backend defines this playground\'s own routes with route(method, path, async (playground, request) => result) only when a request needs work on the server. The page calls a route with playground.api(path, { method, body, file }). The user sees the running app, not those files. Do not mention the files. This stores the app and shows it. It does not publish. The user clicks Publish.',
        'The tools change the window the user is looking at.',
        STAY_ON_PAGE_RULE,
        LEAVE_CONFIRMATION_TO_THE_USER
    ].join(' ')
}
