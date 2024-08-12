import type {
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import type { Context, DryerFromVibrationPlatform } from './platform.js';
import timestring from 'timestring';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class DryerFromVibrationAccessory {
  private switchService: Service;
  private occupancyService: Service;

  private events: number[] = [];
  private timeout?: NodeJS.Timeout;

  private isOn = false;
  private isOccupied = false;

  constructor(
    private readonly platform: DryerFromVibrationPlatform,
    private readonly accessory: PlatformAccessory<Context>,
  ) {
    const name = this.accessory.context.name;

    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Manufacturer,
        'Homebridge',
      )
      .setCharacteristic(this.platform.Characteristic.Model, name)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '0001');

    // get the Switch service if it exists, otherwise create a new Switch service
    // you can create multiple services for each accessory
    this.switchService =
      this.accessory.getService(this.platform.Service.Switch) || //
      this.accessory.addService(this.platform.Service.Switch);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.switchService.setCharacteristic(
      this.platform.Characteristic.Name,
      name + ' switch',
    );

    this.occupancyService =
      this.accessory.getService(this.platform.Service.OccupancySensor) || //
      this.accessory.addService(this.platform.Service.OccupancySensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.occupancyService.setCharacteristic(
      this.platform.Characteristic.Name,
      name + ' sensor',
    );

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.switchService
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below

    // register handlers for the On/Off Characteristic
    this.occupancyService
      .getCharacteristic(this.platform.Characteristic.OccupancyDetected)
      .onGet(this.getOccupied.bind(this)); // GET - bind to the `getOccupied` method below

    this.switchService.updateCharacteristic(
      this.platform.Characteristic.On,
      false,
    );
    this.occupancyService.updateCharacteristic(
      this.platform.Characteristic.OccupancyDetected,
      this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED,
    );
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    this.platform.log(
      this.accessory.context.name + ' switch turned ' + value ? 'on' : 'off',
    );
    this.isOn = value as boolean;

    if (this.isOn) {
      if (!this.timeout) {
        const ms = timestring(this.accessory.context.minimumTime, 'ms');
        this.timeout = setTimeout(this.onTimeout.bind(this), ms);
      }
    } else {
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = undefined;
      }

      if (this.isOccupied) {
        this.isOccupied = false;
        this.occupancyService.updateCharacteristic(
          this.platform.Characteristic.OccupancyDetected,
          this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED,
        );
      }
    }
  }

  private onTimeout() {
    this.platform.log('setting occupancy sensor to OCCUPANCY_DETECTED');
    this.timeout = undefined;
    this.isOccupied = true;
    this.occupancyService.updateCharacteristic(
      this.platform.Characteristic.OccupancyDetected,
      this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED,
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
    const isOn = this.isOn;

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
