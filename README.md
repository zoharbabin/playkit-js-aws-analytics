[![](https://img.shields.io/npm/v/@playkit-js/playkit-js-aws-analytics/latest.svg)](https://www.npmjs.com/package/@playkit-js/playkit-js-aws-analytics)
[![](https://img.shields.io/npm/v/@playkit-js/playkit-js-aws-analytics/canary.svg)](https://www.npmjs.com/package/@playkit-js/playkit-js-aws-analytics/v/canary)

# playkit-js-aws-analytics

Kaltura Player JS plugin that bridges player analytics to the AWS TV Libra framework via `CustomEvent` dispatch.

Drop-in replacement for the analytics layer in the AWS TV video player — all 12 analytics events are auto-detected from native player events, dispatched on 3 CustomEvent channels, with buffer metrics (VideoBufferTime, VideoPlayerReady, VideoError) and page-lifecycle watch-time tracking. Verified against the real `aws.amazon.com/video/watch/*` pages.

## Quick Start

```html
<!-- 1. Load the Kaltura Player -->
<script src="https://cdn.jsdelivr.net/npm/@playkit-js/kaltura-player-js@latest/dist/kaltura-ovp-player.js"></script>

<!-- 2. Load the plugin -->
<script src="playkit-aws-analytics.js"></script>

<!-- 3. Set up the player — zero-config (videoId & videoTitle auto-resolve from entry) -->
<script>
  const player = KalturaPlayer.setup({
    targetId: 'player-container',
    provider: { partnerId: YOUR_PARTNER_ID, uiConfId: YOUR_UICONF_ID },
    plugins: {
      awsAnalytics: {}
    }
  });
  player.loadMedia({ entryId: '1_abc123' });
</script>
```

## Configuration

All options are optional. `videoId` and `videoTitle` auto-resolve from the Kaltura Player's media info (`player.sources.id` and `player.sources.metadata.name`). Set them explicitly only if you need a custom override.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `videoId` | `string` | *auto* | Auto-resolved from `player.sources.id`. Set to override with a custom video identifier. |
| `videoTitle` | `string` | *auto* | Auto-resolved from `player.sources.metadata.name`. Set to override with a custom title. |
| `orgId` | `string` | `'awsm_tv'` | Organization ID sent in buffer-time logger events. Change if your Libra config uses a different org. |
| `watchThresholdSeconds` | `number` | `30` | Seconds of actual watch time before the `Watch` event fires |
| `completeThresholdPercent` | `number` | `0.95` | Fraction of video duration watched before `Complete` fires |

**With explicit overrides:**
```javascript
plugins: {
  awsAnalytics: {
    videoId: 'custom-id',
    videoTitle: 'Custom Title',
    orgId: 'my_org',
    watchThresholdSeconds: 15,
    completeThresholdPercent: 0.90
  }
}
```

> **Why no endpoint URLs or API keys?** This plugin is a CustomEvent bridge, not an HTTP transport. It dispatches browser events that the Libra framework (already on the page) listens for. Libra handles all network transport, auth, and batching.

## Analytics Events

All 12 events match the real AWS TV player (`aws.amazon.com/video/watch/*`) exactly. Events are auto-detected from native player events — no manual API calls needed. Fire-once events reset on `loadMedia`.

| Event | Player Event | Extra Fields |
|-------|-------------|--------------|
| `Play` | `FIRST_PLAYING` | — |
| `Pause` | `PAUSE` (deferred, filtered during seek/ended) | — |
| `Replay` | `PLAYING` when `_isEnded` is true | — |
| `Watch` | `TIME_UPDATE` — accumulated watch time exceeds threshold | — |
| `Complete` | `TIME_UPDATE` — watch ratio exceeds threshold | `duration` (rounded seconds) |
| `WatchTime` | `visibilitychange` / `pagehide` / `beforeunload` | `timestamp`, `watchTime`, `duration` |
| `VolumeChange` | `VOLUME_CHANGE` | — |
| `FullScreenChange` | `ENTER_FULLSCREEN` / `EXIT_FULLSCREEN` | — |
| `SeekForward` | `SEEKED` — seek delta > 1s forward | — |
| `SeekBackward` | `SEEKED` — seek delta > 1s backward | — |
| `QualityChange` | `VIDEO_TRACK_CHANGED` | — |
| `TranscriptToggle` | `TEXT_TRACK_CHANGED` | — |

Every analytics event payload includes:
```json
{
  "type": "awsTvVideo",
  "name": "<EventName>",
  "videoId": "<auto-resolved or config override>",
  "videoTitle": "<auto-resolved or config override>"
}
```

## State Broadcasts

Player state changes are dispatched on `document.body` via the `custom_awstv_video-player-state` channel:

| State | When |
|-------|------|
| `play` | Every time playback starts or resumes |
| `pause` | User pauses, or just before `ended` at natural video end |
| `ended` | Video reaches the end |

## Logger Metrics

Three operational metrics are dispatched on the `custom_aws_eb-logger_notify-listener` channel (matching the real AWS TV player):

**VideoBufferTime** — fires each time the player exits a buffering state:
```json
{ "logLevel": "info", "namespace": "VideoPlayer", "orgId": "awsm_tv",
  "metricName": "VideoBufferTime", "payload": { "duration": 1.234, "unit": "Seconds" } }
```

**VideoPlayerReady** — fires once when the player can play (CAN_PLAY):
```json
{ "logLevel": "info", "namespace": "VideoPlayer", "orgId": "awsm_tv",
  "metricName": "VideoPlayerReady", "payload": { "value": 842, "unit": "Milliseconds" } }
```

**VideoError** — fires on player errors:
```json
{ "logLevel": "error", "namespace": "VideoPlayer", "orgId": "awsm_tv",
  "metricName": "VideoError", "payload": { "videoId": "...", "videoTitle": "...",
  "message": "...", "code": 2000, "value": 1, "unit": "Count" } }
```

## UI Events API

All events above are auto-detected from native player events. If you also have custom UI controls that bypass the player's native events, you can use `sendUiEvent` as an additional trigger:

```javascript
const plugin = player._pluginManager.get('awsAnalytics');
plugin.sendUiEvent('SeekForward');
plugin.sendUiEvent('SeekBackward');
plugin.sendUiEvent('TranscriptToggle');
plugin.sendUiEvent('QualityChange');
```

## Development

```bash
# Install dependencies
npm install

# Dev server with demo page (http://localhost:8080)
npm run serve

# Production build
npm run build

# Type check
npm run type-check

# Lint
npm run lint

# Run Cypress E2E tests (builds, copies bundle, runs Chrome)
npm test

# Open Cypress interactive runner
npm run test:watch
```

## Deployment

```bash
npm run build
```

This produces `dist/playkit-aws-analytics.js` (UMD bundle, ~9.5 KB minified) and `dist/playkit-aws-analytics.js.map`.

Load the bundle after the Kaltura Player script — the plugin auto-registers as `awsAnalytics`. An empty `awsAnalytics: {}` in your plugin config is all that's needed to activate it.

## Compatibility

Tested with `@playkit-js/kaltura-player-js` v3.17.x. Compatible with any Kaltura OVP or OTT player that uses the standard plugin system.

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.
