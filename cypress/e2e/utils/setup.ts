const PARTNER_ID = 6492412;
const UICONF_ID = 57927432;
const ENTRY_ID = '1_io380akk';
const VIDEO_TITLE = 'Test Video';

export { ENTRY_ID, VIDEO_TITLE };

export function setupPlayer(overridePluginConfig?: Record<string, unknown>): void {
  cy.visit('index.html');
  cy.window().then((win) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const player = win.KalturaPlayer.setup({
      targetId: 'player-placeholder',
      provider: { partnerId: PARTNER_ID, uiConfId: UICONF_ID },
      plugins: {
        awsAnalytics: { videoId: ENTRY_ID, videoTitle: VIDEO_TITLE, ...overridePluginConfig }
      },
      playback: { muted: true, autoplay: false }
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    win.__kalturaPlayer = player;
    return player.loadMedia({ entryId: ENTRY_ID });
  });
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.wait(3000);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withPlayer(fn: (p: any) => void): void {
  cy.window().then((win) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    fn(win.__kalturaPlayer);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPlugin(): Cypress.Chainable<any> {
  return cy.window().then((win) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return win.__kalturaPlayer._pluginManager.get('awsAnalytics');
  });
}
