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
  logLevel: 'info' | 'error';
  namespace: 'VideoPlayer';
  orgId: string;
  metricName: 'VideoBufferTime' | 'VideoPlayerReady' | 'VideoError';
  payload: AwsBufferPayload | AwsPlayerReadyPayload | AwsErrorPayload;
}

export interface AwsBufferPayload {
  duration: number;
  unit: 'Seconds';
}

export interface AwsPlayerReadyPayload {
  value: number;
  unit: 'Milliseconds';
}

export interface AwsErrorPayload {
  videoId: string;
  videoTitle: string;
  message: string;
  code?: number;
  value: 1;
  unit: 'Count';
}

export interface AwsPlayerStateDetail {
  state: 'play' | 'pause' | 'ended';
  videoId: string;
}
