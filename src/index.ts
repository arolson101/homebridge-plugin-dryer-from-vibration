import type { API } from 'homebridge';

import { DryerFromVibrationPlatform } from './platform.js';
import { PLATFORM_NAME } from './settings.js';

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, DryerFromVibrationPlatform);
};
