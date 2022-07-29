"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_isNumeric = require("rxjs/util/isNumeric");
var import_suncalc = require("suncalc");
class Shuttermanager extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "shuttermanager"
    });
    this.latitude = 0;
    this.longitude = 0;
    this.on("ready", this.onReady.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    this.getForeignObject("system.config", (err, state) => {
      if (!err) {
        this.longitude = state == null ? void 0 : state.common.longitude;
        this.latitude = state == null ? void 0 : state.common.latitude;
      }
    });
    this.initEnums();
    this.setInterval(this.check.bind(this), 5e3);
    await this.setObjectNotExistsAsync("testVariable", {
      type: "state",
      common: {
        name: "testVariable",
        type: "boolean",
        role: "indicator",
        read: true,
        write: true
      },
      native: {}
    });
    this.subscribeStates("testVariable");
    await this.setStateAsync("testVariable", true);
    await this.setStateAsync("testVariable", { val: true, ack: true });
    await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });
    let result = await this.checkPasswordAsync("admin", "iobroker");
    this.log.info("check user admin pw iobroker: " + result);
    result = await this.checkGroupAsync("admin", "admin");
    this.log.info("check group user admin group admin: " + result);
  }
  initEnums() {
    this.setObjectNotExistsAsync("enum.functions.schutters", {
      common: {
        name: {
          "en": "Shutters",
          "de": "Rolll\xE4den",
          "ru": "\u0437\u0430\u0442\u0432\u043E\u0440\u044B",
          "pt": "Portas de madeira",
          "nl": "Kappen",
          "fr": "Volets",
          "it": "Persiane",
          "es": "Persianas",
          "pl": "Szablon",
          "zh-cn": "\u7A7F\u68AD"
        }
      }
    });
  }
  async check() {
    this.checkSunProtection();
  }
  async checkSunProtection() {
    if (this.config.tempSensorId == void 0) {
      this.log.warn("Temperature sensor id is not set!");
      return;
    }
    const tempSensor = await this.getForeignStateAsync(this.config.tempSensorId);
    if (tempSensor == void 0 || tempSensor.val == void 0 || !(0, import_isNumeric.isNumeric)(tempSensor.val)) {
      this.log.warn("Can't read current temperature from sensor with id " + this.config.tempSensorId);
      return;
    }
    this.log.info(this.config.sunProtectionIfTempIsHigherThan + "," + (tempSensor.val + Number(1)));
    if (this.config.sunProtectionIfTempIsHigherThan > tempSensor.val + Number(1)) {
      this.resetAllSunProtections();
      return;
    }
    if (this.config.sunProtectionIfTempIsHigherThan > tempSensor.val) {
      return;
    }
    const sunPositionResult = (0, import_suncalc.getPosition)(new Date(), this.latitude, this.longitude);
    const altitude = sunPositionResult.altitude * 180 / Math.PI;
    const azimuth = 180 + sunPositionResult.azimuth * 180 / Math.PI;
    this.log.info(altitude + "," + azimuth);
    if (altitude < this.config.minimumAltitude) {
      this.resetAllSunProtections();
      return;
    }
    let i = 0;
    while (i < this.config.sunProtectionShutters.length) {
      const shutter = await this.getForeignStateAsync(this.config.sunProtectionShutters[i].shutterId);
      this.log.info(this.config.sunProtectionShutters[i].sunProtectionUntil + "(" + JSON.stringify(shutter) + ")," + azimuth);
      if (this.config.sunProtectionShutters[i].sunProtectionFrom < azimuth && this.config.sunProtectionShutters[i].sunProtectionUntil > azimuth) {
        if ((shutter == null ? void 0 : shutter.val) == 0) {
          this.setForeignStateAsync(this.config.sunProtectionShutters[i].shutterId, this.config.sunProtectionShutters[i].sunProtectionPosition);
        }
      } else {
        if ((shutter == null ? void 0 : shutter.val) == this.config.sunProtectionShutters[i].sunProtectionPosition) {
          this.setForeignStateAsync(this.config.sunProtectionShutters[i].shutterId, 0);
        }
      }
      i++;
    }
  }
  async resetAllSunProtections() {
    let i = 0;
    while (i < this.config.sunProtectionShutters.length) {
      const shutter = await this.getForeignStateAsync(this.config.sunProtectionShutters[i].shutterId);
      if ((shutter == null ? void 0 : shutter.val) == this.config.sunProtectionShutters[i].sunProtectionPosition) {
        this.setForeignStateAsync(this.config.sunProtectionShutters[i].shutterId, 0);
      }
      i++;
    }
  }
  onUnload(callback) {
    try {
      callback();
    } catch (e) {
      callback();
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new Shuttermanager(options);
} else {
  (() => new Shuttermanager())();
}
//# sourceMappingURL=main.js.map
