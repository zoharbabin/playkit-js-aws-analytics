import { registerPlugin } from '@playkit-js/kaltura-player-js';
import { AwsAnalytics, pluginName } from './aws-analytics';

registerPlugin(pluginName, AwsAnalytics);

export { AwsAnalytics, pluginName };
export * from './types';
