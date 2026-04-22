export type UiEventName = 'SeekBackward' | 'SeekForward' | 'TranscriptToggle' | 'QualityChange';

export interface AwsAnalyticsConfig {
  videoId?: string;
  videoTitle?: string;
  orgId?: string;
  watchThresholdSeconds?: number;
  completeThresholdPercent?: number;
}

export interface AwsAnalyticsEventDetail {
  type: 'awsTvVideo';
  name: string;
  videoId: string;
  videoTitle: string;
  timestamp?: string;
  watchTime?: string;
  duration?: string;
}

export interface AwsLoggerEventDetail {
  logLevel: 'info';
  namespace: 'VideoPlayer';
  orgId: string;
  metricName: 'VideoBufferTime';
  payload: {
    duration: number;
    unit: 'Seconds';
  };
}

export interface AwsPlayerStateDetail {
  state: 'play' | 'pause' | 'ended';
  videoId: string;
}
