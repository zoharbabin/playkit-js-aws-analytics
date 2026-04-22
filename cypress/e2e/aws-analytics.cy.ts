import { getAnalyticsEvents, getStateEvents, getLoggerEvents } from './utils/expects';
import { setupPlayer, withPlayer, getPlugin, ENTRY_ID, VIDEO_TITLE } from './utils/setup';

describe('AWS Analytics Plugin', () => {
  // ─────────────────── Play ───────────────────
  describe('Play', () => {
    beforeEach(() => setupPlayer());

    it('fires Play once on first play with correct payload', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(3000);
      getAnalyticsEvents('Play').should((events) => {
        expect(events).to.have.length(1);
        expect(events[0].detail.type).to.equal('awsTvVideo');
        expect(events[0].detail.videoId).to.equal(ENTRY_ID);
        expect(events[0].detail.videoTitle).to.equal(VIDEO_TITLE);
      });
    });

    it('fires Play only once across pause/resume cycles', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      withPlayer((p) => p.pause());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000);
      getAnalyticsEvents('Play').should((events) => {
        expect(events).to.have.length(1);
      });
    });
  });

  // ─────────────────── Pause ───────────────────
  describe('Pause', () => {
    beforeEach(() => setupPlayer());

    it('fires Pause once on user pause', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      withPlayer((p) => p.pause());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      getAnalyticsEvents('Pause').should((events) => {
        expect(events).to.have.length(1);
        expect(events[0].detail.type).to.equal('awsTvVideo');
      });
    });

    it('does NOT fire Pause during seek', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      withPlayer((p) => {
        p.currentTime = p.currentTime + 30;
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      getAnalyticsEvents('Pause').should((events) => {
        expect(events).to.have.length(0);
      });
    });

    it('does NOT fire Pause when video ends naturally', () => {
      withPlayer((p) => {
        p.play();
        setTimeout(() => {
          p.currentTime = p.duration - 1;
        }, 1000);
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(5000);
      getAnalyticsEvents('Pause').should((events) => {
        expect(events).to.have.length(0);
      });
      getStateEvents('ended').should((events) => {
        expect(events.length).to.be.greaterThan(0);
      });
    });

    it('fires Pause only once across multiple pause/resume cycles', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      withPlayer((p) => p.pause());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      withPlayer((p) => p.pause());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      getAnalyticsEvents('Pause').should((events) => {
        expect(events).to.have.length(1);
      });
    });
  });

  // ─────────────────── VolumeChange ───────────────────
  describe('VolumeChange', () => {
    beforeEach(() => setupPlayer());

    it('fires VolumeChange once across multiple volume changes', () => {
      withPlayer((p) => {
        p.play();
        p.volume = 0.3;
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000);
      withPlayer((p) => {
        p.volume = 0.7;
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000);
      getAnalyticsEvents('VolumeChange').should((events) => {
        expect(events).to.have.length(1);
      });
    });
  });

  // ─────────────────── FullScreenChange ───────────────────
  describe('FullScreenChange', () => {
    beforeEach(() => setupPlayer());

    it('fires FullScreenChange once via sendUiEvent', () => {
      getPlugin().then((plugin) => {
        plugin._sendEvent('FullScreenChange');
        plugin._sendEvent('FullScreenChange');
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      getAnalyticsEvents('FullScreenChange').should((events) => {
        expect(events).to.have.length(1);
        expect(events[0].detail.type).to.equal('awsTvVideo');
        expect(events[0].detail.videoId).to.equal(ENTRY_ID);
      });
    });
  });

  // ─────────────────── UI events (sendUiEvent) ───────────────────
  describe('UI events (sendUiEvent)', () => {
    beforeEach(() => setupPlayer());

    it('fires SeekForward and SeekBackward independently, once each', () => {
      getPlugin().then((plugin) => {
        plugin.sendUiEvent('SeekForward');
        plugin.sendUiEvent('SeekForward');
        plugin.sendUiEvent('SeekBackward');
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      getAnalyticsEvents('SeekForward').should((events) => {
        expect(events).to.have.length(1);
      });
      getAnalyticsEvents('SeekBackward').should((events) => {
        expect(events).to.have.length(1);
      });
    });

    it('fires TranscriptToggle and QualityChange once each', () => {
      getPlugin().then((plugin) => {
        plugin.sendUiEvent('TranscriptToggle');
        plugin.sendUiEvent('QualityChange');
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      getAnalyticsEvents('TranscriptToggle').should((events) => {
        expect(events).to.have.length(1);
      });
      getAnalyticsEvents('QualityChange').should((events) => {
        expect(events).to.have.length(1);
      });
    });
  });

  // ─────────────────── State broadcasts ───────────────────
  describe('State broadcasts', () => {
    beforeEach(() => setupPlayer());

    it('fires play state on every PLAYING', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      withPlayer((p) => p.pause());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000);
      getStateEvents('play').should((events) => {
        expect(events.length).to.be.greaterThan(1);
      });
    });

    it('fires ended state when video ends', () => {
      withPlayer((p) => {
        p.play();
        setTimeout(() => {
          p.currentTime = p.duration - 1;
        }, 1000);
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(5000);
      getStateEvents('ended').should((events) => {
        expect(events).to.have.length(1);
        expect(events[0].detail.videoId).to.equal(ENTRY_ID);
      });
    });

    it('fires pause state then ended state on natural video end', () => {
      withPlayer((p) => {
        p.play();
        setTimeout(() => {
          p.currentTime = p.duration - 1;
        }, 1000);
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(5000);
      getStateEvents().should((events) => {
        const pauseAndEnded = events.filter((e) => e.detail.state === 'pause' || e.detail.state === 'ended');
        const lastTwo = pauseAndEnded.slice(-2);
        expect(lastTwo).to.have.length(2);
        expect(lastTwo[0].detail.state).to.equal('pause');
        expect(lastTwo[1].detail.state).to.equal('ended');
      });
    });

    it('does NOT fire pause state during seeking', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      getStateEvents('pause').then((beforeEvents) => {
        const countBefore = beforeEvents.length;
        withPlayer((p) => {
          p.currentTime = p.currentTime + 20;
        });
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(2000);
        getStateEvents('pause').should((afterEvents) => {
          expect(afterEvents.length).to.equal(countBefore);
        });
      });
    });
  });

  // ─────────────────── Replay ───────────────────
  describe('Replay', () => {
    beforeEach(() => setupPlayer());

    it('fires Replay when playing after ended', () => {
      withPlayer((p) => {
        p.play();
        setTimeout(() => {
          p.currentTime = p.duration - 2;
        }, 1000);
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(6000);
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      getAnalyticsEvents('Replay').should((events) => {
        expect(events).to.have.length(1);
      });
    });

    it('does NOT fire Replay on normal resume after pause', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      withPlayer((p) => p.pause());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000);
      getAnalyticsEvents('Replay').should((events) => {
        expect(events).to.have.length(0);
      });
    });
  });

  // ─────────────────── Watch threshold ───────────────────
  describe('Watch threshold', () => {
    it('fires Watch after watchThresholdSeconds of actual playback', () => {
      setupPlayer({ watchThresholdSeconds: 5 });
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(8000);
      getAnalyticsEvents('Watch').should((events) => {
        expect(events).to.have.length(1);
        expect(events[0].detail.type).to.equal('awsTvVideo');
        expect(events[0].detail.videoId).to.equal(ENTRY_ID);
      });
    });

    it('does NOT fire Watch before threshold reached', () => {
      setupPlayer({ watchThresholdSeconds: 60 });
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(5000);
      getAnalyticsEvents('Watch').should((events) => {
        expect(events).to.have.length(0);
      });
    });

    it('Watch payload has only base fields (no extras)', () => {
      setupPlayer({ watchThresholdSeconds: 3 });
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(6000);
      getAnalyticsEvents('Watch').should((events) => {
        expect(events).to.have.length(1);
        const d = events[0].detail;
        expect(d.type).to.equal('awsTvVideo');
        expect(d.name).to.equal('Watch');
        expect(d.videoId).to.equal(ENTRY_ID);
        expect(d.videoTitle).to.equal(VIDEO_TITLE);
        expect(d).to.not.have.property('duration');
        expect(d).to.not.have.property('timestamp');
        expect(d).to.not.have.property('watchTime');
      });
    });
  });

  // ─────────────────── Complete threshold ───────────────────
  describe('Complete threshold', () => {
    it('fires Complete when watched ratio exceeds threshold', () => {
      setupPlayer({ completeThresholdPercent: 0.005 });
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(8000);
      getAnalyticsEvents('Complete').should((events) => {
        expect(events).to.have.length(1);
      });
    });

    it('Complete payload includes duration as a string', () => {
      setupPlayer({ completeThresholdPercent: 0.005 });
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(8000);
      getAnalyticsEvents('Complete').should((events) => {
        expect(events).to.have.length(1);
        const d = events[0].detail;
        expect(d.type).to.equal('awsTvVideo');
        expect(d.name).to.equal('Complete');
        expect(d.duration).to.be.a('string');
        expect(Number(d.duration)).to.be.greaterThan(0);
      });
    });

    it('does NOT fire Complete when watched ratio is below threshold', () => {
      setupPlayer({ completeThresholdPercent: 0.99 });
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(5000);
      withPlayer((p) => p.pause());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      getAnalyticsEvents('Complete').should((events) => {
        expect(events).to.have.length(0);
      });
    });
  });

  // ─────────────────── WatchTime (page lifecycle) ───────────────────
  describe('WatchTime', () => {
    beforeEach(() => setupPlayer());

    it('fires WatchTime with correct payload on visibilitychange hidden', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(3000);
      cy.window().then((win) => {
        Object.defineProperty(win.document, 'visibilityState', {
          value: 'hidden',
          writable: true,
          configurable: true
        });
        win.document.dispatchEvent(new Event('visibilitychange'));
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      getAnalyticsEvents('WatchTime').should((events) => {
        expect(events).to.have.length(1);
        const d = events[0].detail;
        expect(d.type).to.equal('awsTvVideo');
        expect(d.name).to.equal('WatchTime');
        expect(d.videoId).to.equal(ENTRY_ID);
        expect(d.videoTitle).to.equal(VIDEO_TITLE);
        expect(d.timestamp).to.be.a('string');
        expect(d.watchTime).to.be.a('string');
        expect(Number(d.watchTime)).to.be.greaterThan(0);
        expect(d.duration).to.be.a('string');
      });
    });

    it('does NOT double-fire WatchTime within same visibility cycle', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      cy.window().then((win) => {
        Object.defineProperty(win.document, 'visibilityState', {
          value: 'hidden',
          writable: true,
          configurable: true
        });
        win.document.dispatchEvent(new Event('visibilitychange'));
        win.document.dispatchEvent(new Event('visibilitychange'));
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      getAnalyticsEvents('WatchTime').should((events) => {
        expect(events).to.have.length(1);
      });
    });

    it('fires WatchTime again after tab regains then loses visibility', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      cy.window().then((win) => {
        Object.defineProperty(win.document, 'visibilityState', {
          value: 'hidden',
          writable: true,
          configurable: true
        });
        win.document.dispatchEvent(new Event('visibilitychange'));
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);
      cy.window().then((win) => {
        Object.defineProperty(win.document, 'visibilityState', {
          value: 'visible',
          writable: true,
          configurable: true
        });
        win.document.dispatchEvent(new Event('visibilitychange'));
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);
      cy.window().then((win) => {
        Object.defineProperty(win.document, 'visibilityState', {
          value: 'hidden',
          writable: true,
          configurable: true
        });
        win.document.dispatchEvent(new Event('visibilitychange'));
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      getAnalyticsEvents('WatchTime').should((events) => {
        expect(events).to.have.length(2);
      });
    });
  });

  // ─────────────────── loadMedia reset ───────────────────
  describe('loadMedia reset', () => {
    beforeEach(() => setupPlayer());

    it('resets fire-once state so events can re-fire on new media', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      getAnalyticsEvents('Play').should((events) => {
        expect(events).to.have.length(1);
      });
      withPlayer((p) => p.pause());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);

      cy.window().then((win) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return win.__kalturaPlayer.loadMedia({ entryId: ENTRY_ID });
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(3000);
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      getAnalyticsEvents('Play').should((events) => {
        expect(events).to.have.length(2);
      });
    });

    it('clears pending pause timer on loadMedia', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      withPlayer((p) => p.pause());

      cy.window().then((win) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return win.__kalturaPlayer.loadMedia({ entryId: ENTRY_ID });
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(3000);
      getAnalyticsEvents('Pause').should((events) => {
        expect(events).to.have.length(0);
      });
    });

    it('resets WatchTime tracking so it can fire for new media', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      cy.window().then((win) => {
        Object.defineProperty(win.document, 'visibilityState', {
          value: 'hidden',
          writable: true,
          configurable: true
        });
        win.document.dispatchEvent(new Event('visibilitychange'));
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);
      getAnalyticsEvents('WatchTime').should((events) => {
        expect(events).to.have.length(1);
      });

      cy.window().then((win) => {
        Object.defineProperty(win.document, 'visibilityState', {
          value: 'visible',
          writable: true,
          configurable: true
        });
        win.document.dispatchEvent(new Event('visibilitychange'));
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300);

      cy.window().then((win) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return win.__kalturaPlayer.loadMedia({ entryId: ENTRY_ID });
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(3000);
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      cy.window().then((win) => {
        Object.defineProperty(win.document, 'visibilityState', {
          value: 'hidden',
          writable: true,
          configurable: true
        });
        win.document.dispatchEvent(new Event('visibilitychange'));
      });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      getAnalyticsEvents('WatchTime').should((events) => {
        expect(events).to.have.length(2);
      });
    });
  });

  // ─────────────────── Payload schema ───────────────────
  describe('Payload schema', () => {
    beforeEach(() => setupPlayer());

    it('all analytics events have correct base schema', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(3000);
      withPlayer((p) => p.pause());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      getAnalyticsEvents().should((events) => {
        expect(events.length).to.be.greaterThan(0);
        for (const evt of events) {
          expect(evt.detail.type).to.equal('awsTvVideo');
          expect(evt.detail.name).to.be.a('string');
          expect(evt.detail.name.length).to.be.greaterThan(0);
          expect(evt.detail.videoId).to.be.a('string');
          expect(evt.detail.videoTitle).to.be.a('string');
        }
      });
    });

    it('state broadcast events include videoId', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      getStateEvents().should((events) => {
        expect(events.length).to.be.greaterThan(0);
        for (const evt of events) {
          expect(evt.detail.state).to.be.oneOf(['play', 'pause', 'ended']);
          expect(evt.detail.videoId).to.equal(ENTRY_ID);
        }
      });
    });
  });

  // ─────────────────── Buffer metrics ───────────────────
  describe('Buffer metrics', () => {
    beforeEach(() => setupPlayer());

    it('buffer events on logger channel have correct schema when they fire', () => {
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(5000);
      getLoggerEvents('VideoBufferTime').then((events) => {
        if (events.length === 0) {
          cy.log('No buffer events (fast connection) — skipping assertions');
          return;
        }
        for (const evt of events) {
          expect(evt.detail.logLevel).to.equal('info');
          expect(evt.detail.namespace).to.equal('VideoPlayer');
          expect(evt.detail.orgId).to.equal('awsm_tv');
          expect(evt.detail.metricName).to.equal('VideoBufferTime');
          expect(evt.detail.payload.unit).to.equal('Seconds');
          expect(evt.detail.payload.duration).to.be.a('number');
          expect(evt.detail.payload.duration).to.be.greaterThan(0);
        }
      });
    });
  });

  // ─────────────────── Plugin instantiation ───────────────────
  describe('Plugin instantiation', () => {
    beforeEach(() => setupPlayer());

    it('plugin is accessible via _pluginManager.get', () => {
      getPlugin().should((plugin) => {
        expect(plugin).to.not.be.undefined;
        expect(typeof plugin.sendUiEvent).to.equal('function');
      });
    });

    it('config is correctly merged with defaults', () => {
      getPlugin().should((plugin) => {
        expect(plugin.config.videoId).to.equal(ENTRY_ID);
        expect(plugin.config.videoTitle).to.equal(VIDEO_TITLE);
        expect(plugin.config.orgId).to.equal('awsm_tv');
        expect(plugin.config.watchThresholdSeconds).to.equal(30);
        expect(plugin.config.completeThresholdPercent).to.equal(0.95);
      });
    });
  });

  // ─────────────────── Auto-resolve videoId / videoTitle ───────────────────
  describe('Auto-resolve from player sources', () => {
    it('uses player.sources.id when videoId is not in config', () => {
      setupPlayer({ videoId: '' });
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(3000);
      getAnalyticsEvents('Play').should((events) => {
        expect(events).to.have.length(1);
        expect(events[0].detail.videoId).to.equal(ENTRY_ID);
      });
    });

    it('uses player.sources.metadata.name when videoTitle is not in config', () => {
      setupPlayer({ videoTitle: '' });
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(3000);
      getAnalyticsEvents('Play').should((events) => {
        expect(events).to.have.length(1);
        expect(events[0].detail.videoTitle).to.be.a('string');
        expect(events[0].detail.videoTitle.length).to.be.greaterThan(0);
      });
    });

    it('prefers explicit config videoId over player.sources.id', () => {
      setupPlayer({ videoId: 'custom-override-id' });
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(3000);
      getAnalyticsEvents('Play').should((events) => {
        expect(events).to.have.length(1);
        expect(events[0].detail.videoId).to.equal('custom-override-id');
      });
    });

    it('auto-resolves videoId in state broadcasts too', () => {
      setupPlayer({ videoId: '' });
      withPlayer((p) => p.play());
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000);
      getStateEvents('play').should((events) => {
        expect(events.length).to.be.greaterThan(0);
        expect(events[0].detail.videoId).to.equal(ENTRY_ID);
      });
    });
  });
});
