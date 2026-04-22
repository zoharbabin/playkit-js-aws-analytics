import { BasePlugin } from '@playkit-js/kaltura-player-js';
import { LibraBridge } from './libra-bridge';
import { AwsAnalyticsConfig, UiEventName } from './types';

export const pluginName = 'awsAnalytics';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KalturaPlayer = any;

export class AwsAnalytics extends BasePlugin {
  public static defaultConfig: AwsAnalyticsConfig = {
    videoId: '',
    videoTitle: '',
    orgId: 'awsm_tv',
    watchThresholdSeconds: 30,
    completeThresholdPercent: 0.95
  };

  public static isValid(): boolean {
    return true;
  }

  private _firedEvents: Set<string> = new Set();
  private _isEnded = false;
  private _isSeeking = false;
  private _lastKnownPosition = 0;
  private _bufferStartTime = 0;
  private _playerReadyTime = 0;
  private _watchTimeSentThisCycle = false;
  private _bridge: LibraBridge = new LibraBridge();
  private _pendingPauseTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(name: string, player: KalturaPlayer, config: AwsAnalyticsConfig) {
    super(name, player, config);
    this._playerReadyTime = Date.now();
    this._bindPlayerEvents();
    this._bindUnload();
  }

  public loadMedia(): void {
    this._firedEvents.clear();
    this._isEnded = false;
    this._isSeeking = false;
    this._lastKnownPosition = 0;
    this._bufferStartTime = 0;
    this._watchTimeSentThisCycle = false;
    this._clearPendingPause();
  }

  public reset(): void {
    this.loadMedia();
  }

  public destroy(): void {
    this._clearPendingPause();
    this._unbindUnload();
    this.eventManager.destroy();
  }

  public sendUiEvent(eventName: UiEventName): void {
    this._sendEvent(eventName);
  }

  private get _videoId(): string {
    return this.config.videoId || this.player.sources?.id || '';
  }

  private get _videoTitle(): string {
    return this.config.videoTitle || this.player.sources?.metadata?.name || '';
  }

  // --- Event bindings ---

  private _bindPlayerEvents(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Event = (this.player as any).Event;

    this.eventManager.listen(this.player, Event.FIRST_PLAYING, () => this._onFirstPlay());
    this.eventManager.listen(this.player, Event.PLAYING, () => this._onPlaying());
    this.eventManager.listen(this.player, Event.PAUSE, () => this._onPause());
    this.eventManager.listen(this.player, Event.ENDED, () => this._onEnded());
    this.eventManager.listen(this.player, Event.VOLUME_CHANGE, () => this._onVolumeChange());
    this.eventManager.listen(this.player, Event.ENTER_FULLSCREEN, () => this._onFullScreenChange());
    this.eventManager.listen(this.player, Event.EXIT_FULLSCREEN, () => this._onFullScreenChange());
    this.eventManager.listen(this.player, Event.TIME_UPDATE, () => this._onTimeUpdate());
    this.eventManager.listen(this.player, Event.SEEKING, () => this._onSeeking());
    this.eventManager.listen(this.player, Event.SEEKED, () => this._onSeeked());
    this.eventManager.listen(this.player, Event.PLAYER_STATE_CHANGED, (e: { payload: { oldState: { type: string }; newState: { type: string } } }) =>
      this._onStateChanged(e)
    );
    this.eventManager.listen(this.player, Event.ERROR, (e: { payload: { severity: number; code: number; data: string } }) =>
      this._onError(e)
    );

    if (Event.VIDEO_TRACK_CHANGED) {
      this.eventManager.listen(this.player, Event.VIDEO_TRACK_CHANGED, () => this._sendEvent('QualityChange'));
    }
    if (Event.TEXT_TRACK_CHANGED) {
      this.eventManager.listen(this.player, Event.TEXT_TRACK_CHANGED, () => this._sendEvent('TranscriptToggle'));
    }
    if (Event.CAN_PLAY) {
      this.eventManager.listen(this.player, Event.CAN_PLAY, () => this._onPlayerReady());
    }
  }

  // --- Player event handlers ---

  private _onFirstPlay(): void {
    this._sendEvent('Play');
    this._bridge.sendStateEvent({ state: 'play', videoId: this._videoId });
  }

  private _onPlaying(): void {
    if (this._isEnded) {
      this._isEnded = false;
      this._sendEvent('Replay');
    }
    this._bridge.sendStateEvent({ state: 'play', videoId: this._videoId });
  }

  private _onPause(): void {
    if (!this._isSeeking && !this._isEnded) {
      this._bridge.sendStateEvent({ state: 'pause', videoId: this._videoId });
    }
    this._clearPendingPause();
    this._pendingPauseTimer = setTimeout(() => {
      this._pendingPauseTimer = null;
      if (this._isSeeking || this._isEnded) return;
      this._sendEvent('Pause');
    }, 0);
  }

  private _onEnded(): void {
    this._isEnded = true;
    this._bridge.sendStateEvent({ state: 'pause', videoId: this._videoId });
    this._bridge.sendStateEvent({ state: 'ended', videoId: this._videoId });
  }

  private _onVolumeChange(): void {
    this._sendEvent('VolumeChange');
  }

  private _onFullScreenChange(): void {
    this._sendEvent('FullScreenChange');
  }

  private _onSeeking(): void {
    this._isSeeking = true;
  }

  private _onSeeked(): void {
    const seekEnd = this.player.currentTime ?? 0;
    const delta = seekEnd - this._lastKnownPosition;
    if (delta > 1) {
      this._sendEvent('SeekForward');
    } else if (delta < -1) {
      this._sendEvent('SeekBackward');
    }
    this._isSeeking = false;
  }

  private _onTimeUpdate(): void {
    if (!this._isSeeking) {
      this._lastKnownPosition = this.player.currentTime ?? 0;
    }
    const watched = this._getWatchedDuration();
    const duration = this.player.duration ?? 0;

    if (watched >= this.config.watchThresholdSeconds && !this._firedEvents.has('Watch')) {
      this._sendEvent('Watch');
    }

    if (duration > 0 && watched / duration >= this.config.completeThresholdPercent && !this._firedEvents.has('Complete')) {
      this._sendEvent('Complete', { duration: String(Math.round(duration)) });
    }
  }

  private _onStateChanged(event: { payload: { oldState: { type: string }; newState: { type: string } } }): void {
    const { oldState, newState } = event.payload;
    const BUFFERING = this.player.State?.BUFFERING ?? 'buffering';

    if (newState.type === BUFFERING) {
      this._bufferStartTime = Date.now();
    }

    if (oldState.type === BUFFERING && this._bufferStartTime > 0) {
      const duration = (Date.now() - this._bufferStartTime) / 1000;
      this._bufferStartTime = 0;
      this._bridge.sendLoggerEvent({
        logLevel: 'info',
        namespace: 'VideoPlayer',
        orgId: this.config.orgId,
        metricName: 'VideoBufferTime',
        payload: { duration, unit: 'Seconds' }
      });
    }
  }

  private _onPlayerReady(): void {
    if (this._playerReadyTime > 0) {
      const value = Date.now() - this._playerReadyTime;
      this._playerReadyTime = 0;
      this._bridge.sendLoggerEvent({
        logLevel: 'info',
        namespace: 'VideoPlayer',
        orgId: this.config.orgId,
        metricName: 'VideoPlayerReady',
        payload: { value, unit: 'Milliseconds' }
      });
    }
  }

  private _onError(event: { payload: { severity: number; code: number; data: string } }): void {
    const { code, data } = event.payload;
    this._bridge.sendLoggerEvent({
      logLevel: 'error',
      namespace: 'VideoPlayer',
      orgId: this.config.orgId,
      metricName: 'VideoError',
      payload: {
        videoId: this._videoId,
        videoTitle: this._videoTitle,
        message: data || 'Unknown error',
        code,
        value: 1,
        unit: 'Count'
      }
    });
  }

  // --- Fire-once dedup ---

  private _sendEvent(name: string, extra?: Record<string, string>): void {
    if (this._firedEvents.has(name)) return;
    this._firedEvents.add(name);
    this._bridge.sendAnalyticsEvent({
      type: 'awsTvVideo',
      name,
      videoId: this._videoId,
      videoTitle: this._videoTitle,
      ...extra
    });
  }

  // --- Watched duration from TimeRanges ---

  private _getWatchedDuration(): number {
    const videoEl = this.player.getVideoElement?.();
    if (!videoEl?.played) return 0;
    let total = 0;
    for (let i = 0; i < videoEl.played.length; i++) {
      total += videoEl.played.end(i) - videoEl.played.start(i);
    }
    return total;
  }

  // --- Page lifecycle: WatchTime ---

  private _boundOnUnload = (): void => this._sendWatchTime();
  private _boundOnVisibility = (): void => {
    if (document.visibilityState === 'hidden') {
      this._sendWatchTime();
    } else {
      this._watchTimeSentThisCycle = false;
    }
  };

  private _bindUnload(): void {
    window.addEventListener('pagehide', this._boundOnUnload, { capture: true });
    window.addEventListener('beforeunload', this._boundOnUnload, { capture: true });
    document.addEventListener('visibilitychange', this._boundOnVisibility, { capture: true });
  }

  private _unbindUnload(): void {
    window.removeEventListener('pagehide', this._boundOnUnload, { capture: true });
    window.removeEventListener('beforeunload', this._boundOnUnload, { capture: true });
    document.removeEventListener('visibilitychange', this._boundOnVisibility, { capture: true });
  }

  private _sendWatchTime(): void {
    if (this._watchTimeSentThisCycle) return;

    const videoEl = this.player.getVideoElement?.();
    if (!videoEl?.played) return;

    let watched = 0;
    for (let i = 0; i < videoEl.played.length; i++) {
      watched += videoEl.played.end(i) - videoEl.played.start(i);
    }
    if (watched <= 0) return;

    this._watchTimeSentThisCycle = true;

    this._bridge.sendAnalyticsEvent({
      type: 'awsTvVideo',
      name: 'WatchTime',
      videoId: this._videoId,
      videoTitle: this._videoTitle,
      timestamp: String(Date.now()),
      watchTime: String(Math.round(watched)),
      duration: String(Math.round(this.player.duration || 0))
    });
  }

  // --- Helpers ---

  private _clearPendingPause(): void {
    if (this._pendingPauseTimer !== null) {
      clearTimeout(this._pendingPauseTimer);
      this._pendingPauseTimer = null;
    }
  }
}
