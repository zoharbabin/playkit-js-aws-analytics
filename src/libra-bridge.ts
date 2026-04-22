import { AwsAnalyticsEventDetail, AwsLoggerEventDetail, AwsPlayerStateDetail } from './types';

const ANALYTICS_CHANNEL = 'custom_aws_eb-analytics_notify-listener';
const LOGGER_CHANNEL = 'custom_aws_eb-logger_notify-listener';
const STATE_CHANNEL = 'custom_awstv_video-player-state';

export class LibraBridge {
  public sendAnalyticsEvent(detail: AwsAnalyticsEventDetail): void {
    document.dispatchEvent(new CustomEvent(ANALYTICS_CHANNEL, { detail }));
  }

  public sendLoggerEvent(detail: AwsLoggerEventDetail): void {
    document.dispatchEvent(new CustomEvent(LOGGER_CHANNEL, { detail }));
  }

  public sendStateEvent(detail: AwsPlayerStateDetail): void {
    document.body.dispatchEvent(new CustomEvent(STATE_CHANNEL, { detail }));
  }
}
