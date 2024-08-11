import type {
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import type { DryerFromVibrationPlatform } from './platform.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class DryerFromVibrationAccessory {
  private lightbuilbService: Service;
  private occupancyService: Service;

  private events: number[] = [];
  private timeout?: NodeJS.Timeout;

  private isOccupied = false;

  constructor(
    private readonly platform: DryerFromVibrationPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Manufacturer,
        'Dryer from Vibration Manufacturer',
      )
      .setCharacteristic(
        this.platform.Characteristic.Model,
        'Dryer from Vibration Model',
      )
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        '123456789',
      );

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.lightbuilbService =
      this.accessory.getService(this.platform.Service.Lightbulb) || //
      this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.lightbuilbService.setCharacteristic(
      this.platform.Characteristic.Name,
      this.platform.config.name + ' switch',
    );

    this.occupancyService =
      this.accessory.getService(this.platform.Service.OccupancySensor) || //
      this.accessory.addService(this.platform.Service.OccupancySensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.occupancyService.setCharacteristic(
      this.platform.Characteristic.Name,
      this.platform.config.name + ' sensor',
    );

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.lightbuilbService
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below

    // register handlers for the On/Off Characteristic
    this.occupancyService
      .getCharacteristic(this.platform.Characteristic.OccupancyDetected)
      .onGet(this.getOccupied.bind(this)); // GET - bind to the `getOccupied` method below

    this.occupancyService.setCharacteristic(
      this.platform.Characteristic.OccupancyDetected,
      this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED,
    );
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(_value: CharacteristicValue) {
    if (_value) {
      this.platform.log(this.platform.config.name + ' switch turned on');
      setTimeout(() => {
        this.lightbuilbService.updateCharacteristic(
          this.platform.Characteristic.On,
          false,
        );
      }, 0);
      this.events.push(Date.now());
      this.updateEvents();
    }
  }

  private updateEvents() {
    const now = Date.now();
    const cutoff = now - this.platform.config.onTimeSpanSec * 1000;
    this.events = this.events.filter((event) => event >= cutoff);

    const numberOfEvents = this.platform.config.numberOfEvents;
    if (this.events.length > numberOfEvents) {
      this.platform.log('setting occupancy sensor to OCCUPANCY_DETECTED');
      this.isOccupied = true;
      this.occupancyService.updateCharacteristic(
        this.platform.Characteristic.OccupancyDetected,
        this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED,
      );
    }
    if (this.isOccupied) {
      const offTimeSpanSec = this.platform.config.offTimeSpanSec;
      if (this.timeout) {
        this.platform.log.debug(
          'resetting timer to turn occupancy off after ' +
            offTimeSpanSec +
            ' sec',
        );
        clearTimeout(this.timeout);
      } else {
        this.platform.log.debug(
          'setting timer to turn occupancy off after ' + offTimeSpanSec + ' sec',
        );
      }
      this.timeout = setTimeout(
        this.onTimeout.bind(this),
        this.platform.config.offTimeSpanSec * 1000,
      );
    }
  }

  private onTimeout() {
    this.timeout = undefined;
    this.platform.log('setting occupancy sensor to OCCUPANCY_NOT_DETECTED');
    this.isOccupied = false;
    this.occupancyService.updateCharacteristic(
      this.platform.Characteristic.OccupancyDetected,
      this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED,
    );
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(): Promise<CharacteristicValue> {
    const isOn = false;

    this.platform.log.debug('Get Characteristic On ->', isOn);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return isOn;
  }

  async getOccupied(): Promise<CharacteristicValue> {
    const isOccupied = this.isOccupied
      ? this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
      : this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;

    this.platform.log.debug('Get Characteristic Occupied ->', isOccupied);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return isOccupied;
  }
}
