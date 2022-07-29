/*
 * Created with @iobroker/create-adapter v2.1.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import { isNumeric } from "rxjs/util/isNumeric";
import { getPosition } from "suncalc";

// Load your modules here, e.g.:
// import * as fs from "fs";

class Shuttermanager extends utils.Adapter {

	private latitude = 0;
	private longitude = 0;


	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "shuttermanager",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		// Initialize your adapter here
		this.getForeignObject("system.config", (err, state) => {
			if (!err) {
				this.longitude = state?.common.longitude;
				this.latitude = state?.common.latitude;
			}
		});

		this.initEnums();

		this.setInterval(this.check.bind(this), 5000);

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:

		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
		await this.setObjectNotExistsAsync("testVariable", {
			type: "state",
			common: {
				name: "testVariable",
				type: "boolean",
				role: "indicator",
				read: true,
				write: true,
			},
			native: {},
		});

		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		this.subscribeStates("testVariable");
		// You can also add a subscription for multiple states. The following line watches all states starting with "lights."
		// this.subscribeStates("lights.*");
		// Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
		// this.subscribeStates("*");

		/*
			setState examples
			you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
		await this.setStateAsync("testVariable", true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		await this.setStateAsync("testVariable", { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		let result = await this.checkPasswordAsync("admin", "iobroker");
		this.log.info("check user admin pw iobroker: " + result);

		result = await this.checkGroupAsync("admin", "admin");
		this.log.info("check group user admin group admin: " + result);
	}

	private initEnums(): void {
		this.setObjectNotExistsAsync("enum.functions.schutters", {
			common: {
				name: {
					"en": "Shutters",
					"de": "Rollläden",
					"ru": "затворы",
					"pt": "Portas de madeira",
					"nl": "Kappen",
					"fr": "Volets",
					"it": "Persiane",
					"es": "Persianas",
					"pl": "Szablon",
					"zh-cn": "穿梭"
				}
			}
		} as ioBroker.EnumObject)
	}

	private async check(): Promise<void> {
		this.checkSunProtection();
	}

	private async checkSunProtection(): Promise<void> {
		if (this.config.tempSensorId == undefined) {
			this.log.warn("Temperature sensor id is not set!");
			return;
		}
		const tempSensor = await this.getForeignStateAsync(this.config.tempSensorId);
		if (tempSensor == undefined || tempSensor.val == undefined || !isNumeric(tempSensor.val)) {
			this.log.warn("Can't read current temperature from sensor with id " + this.config.tempSensorId);
			return;
		}
		this.log.info(this.config.sunProtectionIfTempIsHigherThan + "," + (tempSensor.val as number + Number(1)))
		if (this.config.sunProtectionIfTempIsHigherThan > (tempSensor.val as number + Number(1))) {
			this.resetAllSunProtections();
			return;
		}
		if (this.config.sunProtectionIfTempIsHigherThan > tempSensor.val) {
			return;
		}
		const sunPositionResult = getPosition(new Date(), this.latitude, this.longitude);
		const altitude = sunPositionResult.altitude * 180 / Math.PI
		const azimuth = 180 + sunPositionResult.azimuth * 180 / Math.PI

		this.log.info(altitude + "," + azimuth);

		if (altitude < this.config.minimumAltitude) {
			this.resetAllSunProtections();
			return;
		}
		let i = 0;
		while (i < this.config.sunProtectionShutters.length) {
			const shutter = await this.getForeignStateAsync(this.config.sunProtectionShutters[i].shutterId);
			this.log.info(this.config.sunProtectionShutters[i].sunProtectionUntil +"("+JSON.stringify(shutter)+")"+ ","+azimuth);
			if (this.config.sunProtectionShutters[i].sunProtectionFrom < azimuth && this.config.sunProtectionShutters[i].sunProtectionUntil > azimuth) {
				if (shutter?.val == 0) {
					this.setForeignStateAsync(this.config.sunProtectionShutters[i].shutterId, this.config.sunProtectionShutters[i].sunProtectionPosition);
				}
			} else {
				if (shutter?.val == this.config.sunProtectionShutters[i].sunProtectionPosition) {
					this.setForeignStateAsync(this.config.sunProtectionShutters[i].shutterId, 0);
				}
			}
			i++;
		}



	}
	private async resetAllSunProtections(): Promise<void> {
		let i = 0;
		while (i < this.config.sunProtectionShutters.length) {
			const shutter = await this.getForeignStateAsync(this.config.sunProtectionShutters[i].shutterId);
			if (shutter?.val == this.config.sunProtectionShutters[i].sunProtectionPosition) {
				this.setForeignStateAsync(this.config.sunProtectionShutters[i].shutterId, 0);
			}
			i++;
		}
	}




	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private onUnload(callback: () => void): void {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (e) {
			callback();
		}
	}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Shuttermanager(options);
} else {
	// otherwise start the instance directly
	(() => new Shuttermanager())();
}