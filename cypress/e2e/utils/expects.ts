export interface CapturedEvent {
  ts: number;
  channel: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detail: any;
}

export function getAnalyticsEvents(name?: string): Cypress.Chainable<CapturedEvent[]> {
  return cy
    .window()
    .its('__capturedEvents')
    .then((events: CapturedEvent[]) => {
      const analytics = events.filter((e) => e.channel === 'analytics');
      return name ? analytics.filter((e) => e.detail.name === name) : analytics;
    });
}

export function getStateEvents(state?: string): Cypress.Chainable<CapturedEvent[]> {
  return cy
    .window()
    .its('__capturedEvents')
    .then((events: CapturedEvent[]) => {
      const stateEvents = events.filter((e) => e.channel === 'state');
      return state ? stateEvents.filter((e) => e.detail.state === state) : stateEvents;
    });
}

export function getLoggerEvents(metricName?: string): Cypress.Chainable<CapturedEvent[]> {
  return cy
    .window()
    .its('__capturedEvents')
    .then((events: CapturedEvent[]) => {
      const logger = events.filter((e) => e.channel === 'logger');
      return metricName ? logger.filter((e) => e.detail.metricName === metricName) : logger;
    });
}
