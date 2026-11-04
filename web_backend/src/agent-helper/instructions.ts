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

export function helperInstructions(): string {
    return [
        'These tools control the dashboard tab that has the agent helper turned on.',
        HELPER_TOOL_ORDER,
        'Paths that contain :name need a real id from the open page.',
        'To call the API, call api_access. It tells you the OpenAPI document for this app and gives you the authorization token from this browser localStorage. Look up the operation in that document, then call the API with that token.',
        'To choose a dropdown, call select_option with the field label and the option text.',
        'The tools change the window the user is looking at.',
        STAY_ON_PAGE_RULE,
        LEAVE_CONFIRMATION_TO_THE_USER
    ].join(' ')
}
