export const getRouteName = (event: Events) => {
  return `R_${process.env.ENVIRONMENT || 'production'}-${event}`;
};
export const getQueueName = (event: Events  ) => {
  return `Q_${process.env.ENVIRONMENT || 'production'}-${event}`;
};

export enum Events {
  EMAIL_SENDING = 'email_sending',
  NOTIFICATION = 'notification',
  ADD_PERMISSION = 'add_permission',
  SEND_SURVEY_EMAILS = 'send_survey_emails',
  SEND_SURVEY = 'send_survey',
  HISTORY_RECORD = 'history_record',
  USER_LOGIN = 'user_login',
  OBJECTIVE_PI_STATUS_SYNC = 'objective_pi_status_sync',
  DOCUMENT_AI_INDEX = 'document_ai_index',
  CLIENT_LLM_USAGE = 'client_llm_usage',
}

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getListening = (event: Events) => {
  return {
    exchange: 'exchange1',
    routingKey: getRouteName(event),
    queue: getQueueName(event),
  };
};
