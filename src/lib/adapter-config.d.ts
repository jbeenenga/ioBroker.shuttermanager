// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			sunProtectionIfTempIsHigherThan: number;
			minimumAltitude: number;
			tempSensorId: string;
			sunProtectionShutters: SunProtectionShutter[];
		}

		interface SunProtectionShutter{
			shutterId: string;
			sunProtectionFrom: number;
			sunProtectionUntil: number;
			sunProtectionPosition: number;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export { };