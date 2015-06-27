/*
 *	** Device Sensor Base **
 *	DS are used for the global access
 */
var DeviceSensor = DS = {};

DS.extend = function(superclass, subclass) {
	for(var prop in subclass)
		superclass[prop] = subclass[prop];
};
/*
 * ** Device Sensor Constant
 */

DS.AccelerationMagnitudeFilterValue 	= 1.0;
DS.ShakeAccelerationAngleThreshold 		= 150;
DS.SensorCheckingTimeout 				= 3000;

/*
 * Device Sensor states
 * Initially, device sensor sets to unknown state.
 * When user starts initialing DS, the state of all sensors changes to initializing.
 * And the state changes to support or notsupport depending on testing result.
 */
DS.State = {
	Unknown 		: 0,
	Initializing 	: 1,
	Support 		: 2,
	NotSupport 		: 3,
};

DS.SensorType = {
	Orientation		: 0,
	Motion			: 1,
};

DS.DeviceType = {
	Null			: 0,
	Android			: 1,
	iOS				: 2,
};


/*
 * Math Helper
 *
 */

DS.Vector = function(vector) {
	this.x = vector.x || 0;
	this.y = vector.y || 0;
	this.z = vector.z || 0;

	return this;
};

DS.Vector.prototype = {
	add: function(vector) {
		var new_vector = new DS.Vector({
			x: this.x + vector.x,
			y: this.y + vector.y,
			z: this.z + vector.z
		});

		return new_vector;
	},

	negate: function() {
		this.x = -this.x;
		this.y = -this.y;
		this.z = -this.z;

		return this;
	},

	toString: function() {
		return "{" + 
			"x:" + this.x.toFixed(2) + "," + 
			"y:" + this.y.toFixed(2) + "," + 
			"z:" + this.z.toFixed(2) + "}";

	},
};

DS.Euler = function(euler) {
	if(typeof euler === "undefined") euler = {};

	this.set(euler);

	return this;
};

DS.Euler.prototype = {
	set: function(euler) {
		return this.setAlpha(euler.alpha || 0)
				.setBeta(euler.beta || 0)
				.setGamma(euler.gamma || 0);
	},

	clone: function() {
		return new DS.Euler(this);
	},

	setAlpha: function(deg) {
		this.alpha = deg;

		return this;
	},


	setBeta: function(deg) {
		this.beta = deg;

		return this;
	},


	setGamma: function(deg) {
		this.gamma = deg;

		return this;
	},

	add: function(another_euler) {
		var new_euler = new DS.Euler({
			alpha: this.alpha + another_euler.alpha,
			beta: this.beta + another_euler.beta,
			gamma: this.gamma + another_euler.gamma,
		});

		if(new_euler.alpha >= 360) new_euler.alpha -= 360;
		if(new_euler.beta >= 360) new_euler.beta -= 360;
		if(new_euler.gamma >= 360) new_euler.gamma -= 360;

		return new_euler;
	},

	addAlpha: function(deg) {
		var new_euler = new DS.Euler({
			alpha: this.alpha + deg,
			beta: this.beta,
			gamma: this.gamma,
		});

		if(new_euler.alpha >= 360) new_euler.alpha -= 360;

		return new_euler;
	},

	addBeta: function(deg) {
		var new_euler = new DS.Euler({
			alpha: this.alpha,
			beta: this.beta + deg,
			gamma: this.gamma,
		});

		if(new_euler.beta >= 360) new_euler.beta -= 360;

		return new_euler;
	},

	addGamma: function(deg) {
		var new_euler = new DS.Euler({
			alpha: this.alpha,
			beta: this.beta,
			gamma: this.gamma + deg,
		});

		if(new_euler.gamma >= 360) new_euler.gamma -= 360;

		return new_euler;
	},

	within: function(deg) {
		if(this.withinAlpha(deg) && this.withinBeta(deg) && this.withinGamma(deg)) return true;
		return false;
	},

	withinAlpha: function(deg) {
		if(Math.abs(this.alpha) <= deg) return true;
		return false;
	},

	withinBeta: function(deg) {
		if(Math.abs(this.beta) <= deg) return true;
		return false;
	},

	withinGamma: function(deg) {
		if(Math.abs(this.gamma) <= deg) return true;
		return false;
	},

	toString: function() {
		return "{" + 
			"alpha:" + this.alpha.toFixed(2) + "," + 
			"beta:" + this.beta.toFixed(2) + "," + 
			"gamma:" + this.gamma.toFixed(2) + "}";

	},
};

DS.DeviceManager = function(sensorManager) {
	//default device
	this._sensorManager = sensorManager;
	this._initDevice();
};

DS.DeviceManager.prototype = {
	
	_isDetermined: false,

	_isDetermining: false,

	_type: DS.DeviceType.Null,

	_determining: function(e) {
		var self = this;
		var accelerationGravity = e.accelerationIncludingGravity.add(e.acceleration.negate());
		if(accelerationGravity.z < -8) {
			var sensordata = this._sensorManager.sensordata.get();
			var diff = Math.abs(sensordata.orientation.alpha - this._initAlpha)
			if(diff > 100) {
				//the alpha value is inverted, it is android mobile
				this.__proto__._type = DS.DeviceType.Android;
			}
			else if(diff < 20) {
				//if alpha value is almost the same, it is ios mobile
				this.__proto__._type = DS.DeviceType.iOS;
			}
			else {
				//continue to test
				return;
			}

			this._sensorManager.motion.unbind(this._determining);

			setTimeout(function() {
				// window.navigator.vibrate(500);
				self._initDevice();
				self._determined(self.device);

				delete self._determined;
				delete self._initAlpha;
			}, 1500);
		}
	},

	_determined: function() {
	},

	_initDevice: function() {
		if((navigator.userAgent.match(/iPhone/i)) || (navigator.userAgent.match(/iPod/i))) {
			this._type = DS.DeviceType.iOS;
			this.device = new DS.DeviceiOS(this._sensorManager.sensordata);
		}
		else {
			this._type = DS.DeviceType.Android
			this.device = new DS.DeviceAndroid(this._sensorManager.sensordata);
		}
	},

	determine: function(options) {
		if(this._isDetermining) return;

		var complete = options.complete || this._determined;
		this._determined = complete;
		this._isDetermining = true;
		this._initAlpha = this._sensorManager.sensordata.get().orientation.alpha;

		this._sensorManager.motion.bind(this._determining, this);
	}, 

	_offsetOrientation: function(e) {
		return this.device._offsetOrientation(e);
	},

	_offsetMotion: function(e) {
		return this.device._offsetMotion(e);
	},

	_calibrateOrientation: function() {
		if(typeof this.device._calibrateOrientation === "function")
			this.device._calibrateOrientation();
	},
	
	_getType: function() {
		return this._type;
	},

	isAndroid: function() {
		return this._type == DS.DeviceType.Android;
	}
};

DS.DeviceMobile = function(type, sensordata) {
	this.type = type;
	this.sensordata = sensordata;
};

DS.DeviceMobile.prototype = {
};

DS.DeviceAndroid = function(sensordata) {
	DS.DeviceMobile.call(this, DS.DeviceType.Android, sensordata);
};

DS.DeviceAndroid.prototype = Object.create(DS.DeviceMobile.prototype);
DS.extend(DS.DeviceAndroid.prototype, {
	constructor: DS.DeviceMobile,
	_inverted: false,
	_oFlag: false,

	_offsetOrientation: function(e) {
		// if calibration, no need to check inverted flag
		if(this._oFlag) {
			this._oFlag = false;
			return e;
		}

		var lastO = this.sensordata.get().orientation;
		if(lastO === undefined) return e;

		// console.log(lastO, e);

		if(this._inverted) {
			e = e.addAlpha(180);
			// e = e.addBeta(150);
			// e.gamma = -180 + e.gamma;
		}

		var diff = Math.abs(lastO.alpha - e.alpha);
		if(150 < diff && diff < 210) {
			this._inverted = !this._inverted;

			e = e.addAlpha(180);
			// e = e.addBeta(150);
			// e.gamma = -180 + e.gamma;
		}

		return e;
	},

	_offsetMotion: function(e) {
		var Aweight = 5;
		var Rweight = 25;

		e.accelerationIncludingGravity.x = -e.accelerationIncludingGravity.x;
		e.accelerationIncludingGravity.y = -e.accelerationIncludingGravity.y;
		e.accelerationIncludingGravity.z = -e.accelerationIncludingGravity.z;

		e.rotationRate.alpha *= Rweight;
		e.rotationRate.beta *= Rweight;
		e.rotationRate.gamma *= Rweight;

		return e;
	},

	_calibrateOrientation: function() {
		this._oFlag = true;
	}
});

DS.DeviceiOS = function(sensordata) {
	DS.DeviceMobile.call(this, DS.DeviceType.iOS, sensordata);
};

DS.DeviceiOS.prototype = Object.create(DS.DeviceMobile.prototype);
DS.extend(DS.DeviceiOS.prototype, {
	constructor: DS.DeviceMobile,

	_offsetOrientation: function(e) {
		return e;
	},

	_offsetMotion: function(e) {
		return e;
	},
});

DS.DeviceNull = function(sensordata) {
	DS.DeviceMobile.call(this, DS.DeviceType.Null, sensordata);
};

DS.DeviceNull.prototype = Object.create(DS.DeviceMobile.prototype);
DS.extend(DS.DeviceNull.prototype, {
	constructor: DS.DeviceMobile,

	_offsetOrientation: function(e) {
		return e;
	},

	_offsetMotion: function(e) {
		return e;
	},
});

/*
 * SensorData to record sensor data
 */

DS.SensorData  = function() {
	var self = this;

	setInterval(function() {
		//clear
		var i = self.indexOf(self._o, self._lastTimeStamp - self._dataRange);
		self._o = self._o.slice(i);

		i = self.indexOf(self._m, self._lastTimeStamp - self._dataRange);
		self._m = self._m.slice(i);

	}, self._dataRange / 2);
};

DS.SensorData.prototype = {
	constructor: DS.SensorData,
	//_o: orientation(gyro) data
	//_m: motion(accelerometer) data
	_o: [], _m: [], 

	//interval of each sensor data
	_interval: 50,

	//the latest timestamp of recorded sensordata
	_lastTimeStamp: 0,

	//the range of sensor data recorded (default 5000 ms)
	_dataRange: 5000,

	indexOf: function(arr, timestamp) {
		//no data here
		if(this._lastTimeStamp == 0) return -1;

		var imax = arr.length - 1;
		var imin = 0;
		var imid = null;

		while(imax >= imin) {
			imid = Math.ceil(imax + imin / 2);

			if(arr[imid].timestamp == timestamp)
				return imid;
			else if(arr[imid].timestamp < timestamp)
				imin = imid + 1;
			else
				imax = imid - 1;
		}

		if(imin == -1 || imax == -1) return 0;
		if(imin > imax) return imin;
		return imax;
	},

	set: function(type, data) {
		this._lastTimeStamp = data.timestamp;

		if(type == DS.SensorType.Orientation) {
			this._o.push(data);
		}

		if(type == DS.SensorType.Motion) {
			this._m.push(data);
		}
	},

	getWithin: function(timestamp, within) {
		var o = null;
		var m = null;
		var os = null;
		var ms = null;
		var i = this.indexOf(this._o, timestamp - within) - 1;
		if(i <= 0) os = this._o.slice(0);
		else os = this._o.slice(i);

		i = this.indexOf(this._m, timestamp - within) - 1;
		if(i <= 0) ms = this._m.slice(0);
		else ms = this._m.slice(i);

		return {
			orientations: os,
			motions: ms
		};
	},


	get: function(timestamp) {

		//if timestamp is not provided, return the lastest sensor data
		if(typeof timestamp === "undefined") {
			return {
				orientation: this._o[this._o.length - 1],
				motion: this._m[this._m.length - 1],
			};
		}

		var o = null;
		var m = null;
		var i = this.indexOf(this._o, timestamp) - 1;
		if(i <= 0) return false;

		if(timestamp >= this._o[i].timestamp) {
			o = this._o[i];
		}
		else {
			var a = this._o[i - 1];
			var b = this._o[i];
			var diff = b.timestamp - a.timestamp;
			var ascale = (timestamp - a.timestamp) / diff;
			var bscale = (b.timestamp - timestamp) / diff;


			o = {
				timestamp: timestamp,
				alpha: a.alpha * ascale + b.alpha * bscale,
				beta: a.beta * ascale + b.beta * bscale,
				gamma: a.gamma * ascale + b.gamma * bscale,
			}
		}

		i = this.indexOf(this._m, timestamp) - 1;
		if(i <= 0) return false;

		if(timestamp >= this._m[i].timestamp) {
			m = this._m[i];
		}
		else {
			var a = this._m[i - 1];
			var b = this._m[i];
			var scale = (timestamp - a.timestamp) / (b.timestamp - a.timestamp);

			m = {
				timestamp: timestamp,
				rotationRate: {
					alpha: a.rotationRate.alpha * ascale + b.rotationRate.alpha * bscale,
					beta: a.rotationRate.beta * ascale + b.rotationRate.beta * bscale,
					gamma: a.rotationRate.gamma * ascale + b.rotationRate.gamma * bscale,
				},
				accelerationIncludingGravity: {
					x: a.rotationRate.x * ascale + b.rotationRate.x * bscale,
					y: a.rotationRate.y * ascale + b.rotationRate.y * bscale,
					z: a.rotationRate.z * ascale + b.rotationRate.z * bscale,
				},
				acceleration: {
					x: a.rotationRate.x * ascale + b.rotationRate.x * bscale,
					y: a.rotationRate.y * ascale + b.rotationRate.y * bscale,
					z: a.rotationRate.z * ascale + b.rotationRate.z * bscale,
				},
			}
		}

		return {
			orientation: o,
			motion: m
		};
	},
};


/*
 * ** Device Sensor Event Handler **
 * DS Event Handler Listens all the custom events
 * EventHandler is the parent class
 * The child class includes:
 * -- ShakeHandler
 * -- SwingHandler
 * -- RotateHandler
 * The corresponding threshold & time count are written in the child class
 * Developers can bind or unbind callback functions to corresponding events listener
 * When the sensor detects event, the callback functions will be invoked.
 */

DS.EventManager = function(sensorManager) {
	this._sensorManager = sensorManager;
	this.shake = new DS.ShakeHandler(this, sensorManager.sensordata);
	this.swing = new DS.SwingHandler(this, sensorManager.sensordata);
};

DS.EventHandler = function(name, em, sensordata) {
	this.name = name;
	this.sensordata = sensordata;
	this.em = em;
	this._callback = [];
};

DS.EventHandler.prototype = {
	_enable: true,
	_invoke: function(data) {
		var e = new this._eventArgs(data);
		for(var i = 0; i < this._callback.length; i++) {
			var obj = this._callback[i];
			if(typeof obj.context === "undefined")
				obj.callback.call(this, e);
			else
				obj.callback.call(obj.context, e);
		}
	},
	enable: function() {
		this._enable = true;
	},
	disable: function() {
		this._enable = false;
	},
	isEnable: function() {
		return this._enable;
	},
	bind: function(callback, context) {
		if(typeof callback === "function")
			this._callback.push({
				callback: callback,
				context: context
			});
	},
	unbind: function(callback) {
		if(typeof callback === "function")
			for(var i = 0; i < this._callback.length; i++) {
				if(this._callback[i].callback === callback)
					this._callback.splice(i--, 1);
			}
	}
};

DS.ShakeHandler = function(em, sensordata) {
	DS.EventHandler.call(this, "shake", em, sensordata);
};

DS.ShakeHandler.prototype = Object.create(DS.EventHandler.prototype);
DS.extend(DS.ShakeHandler.prototype, {
	constructor: DS.EventHandler,
	_eventArgs: function(e) {
		for(var prop in e) {
			if(e.hasOwnProperty(prop))
				this[prop] = e[prop];
		}
	}
});

DS.SwingHandler = function(em, sensordata) {
	DS.EventHandler.call(this, "swing", em, sensordata);
	DS.SwingHandler.lastInvoke = (new Date()).getTime();
	this.foreCount = 0;
	this.backCount = 0;
	this.lastOrientationRate =0;
};

DS.SwingHandler.prototype = Object.create(DS.EventHandler.prototype);
DS.extend(DS.SwingHandler.prototype, {
	constructor: DS.EventHandler,
	_eventArgs: function(e) {
		for(var prop in e) {
			if(e.hasOwnProperty(prop))
				this[prop] = e[prop];
		}
	},

});

/*
 * ** Device Sensor Management **
 */
DS.Sensor = function(type, e, support, nativeSupport, sensorManager) {
	this._type = type;
	this._event = e;
	this._support = support;
	this._nativeSupport = nativeSupport;
	this._sensorCallback = [];
	this._sensorManager = sensorManager;
	this.event = sensorManager.event;

	var self = this;
	this._checkCallback = function(e) {
		if(self._isWorkable(e))
			self._support = DS.State.Support;
	};
	this._runCallback = function(e) {
		if(self._isWorkable(e))
			if(self._checking) self._sensorCallback[0].callback.call(self, e);
			else {

				//add timestamp
				e.timestamp = new Date().getTime();

				e = self._offset(e);

				if(self._filter(e)) return;

				//fire all sensor callback function
				for(var i = 0; i < self._sensorCallback.length; i++) {
					var obj = self._sensorCallback[i];
					if(typeof obj.context === "undefined")
						obj.callback.call(self, e);
					else
						obj.callback.call(obj.context, e);
				}
			}
		//e.preventDefault();
	};
};

DS.Sensor.prototype = {
	constructor: DS.Sensor, _running: false, _checking: false,

	_check: function() {
		if(this._checking) return;

		if(this._nativeSupport === undefined)
			this._support = DS.State.NotSupport;
		else if(this._support == DS.State.Unknown)
			this._support = DS.State.Initializing;

		this._checking = true;
		this.bind(this._checkCallback);
		this.run();
	},

	_uncheck: function() {
		if(!this._checking) return;

		this._checking = false;
		this.unbind(this._checkCallback);
		this.stop();
	},

	bind: function(callback, context) {
		if(typeof callback === "function")
			this._sensorCallback.push({
				callback: callback,
				context: context
			});
	},

	unbind: function(callback) {
		if (typeof callback === "function")
			for(var i = 0; i < this._sensorCallback.length; i++) {
				if(this._sensorCallback[i].callback === callback)
					this._sensorCallback.splice(i--, 1);
			}
	},

	run: function() {
		if(!this._running) {
			this._running = true;
			window.addEventListener(this._event, this._runCallback);
		}
	},

	stop: function() {
		if(this._running) {
			this._running = false;
			window.removeEventListener(this._event, this._runCallback);
		}
	},
};

//child class orientation
DS.SensorOrientation = function(sensorManager) {
	DS.Sensor.call(this, 'Orientation', 'deviceorientation', DS.State.Unknown, window.DeviceOrientationEvent, sensorManager);
};
DS.SensorOrientation.prototype = Object.create(DS.Sensor.prototype);
DS.extend(DS.SensorOrientation.prototype, {
	constructor: DS.SensorOrientation,

	eulerOffset: new DS.Euler(),

	_isCalibrating: false,

	// _isCalibrated: false,

	_isWorkable: function(e) {
		//this._sensorManager.sensordata.set(DS.SensorType.Orientation, this._calibrate(e));
		return e && e.alpha && e.beta && e.gamma;
	},

	//function return true if data will be filtered
	_filter: function(e) {
		return false;
	},

	_offset: function(e) {

		//format orientation data
		var orientation = new DS.Euler({
			alpha: e.alpha,
			beta: e.beta,
			gamma: e.gamma,
		});

		if(!this._isCalibrating) {

			//add offset by calibrating
			orientation = orientation.add(this.eulerOffset);

			//add offset by device
			orientation = this._sensorManager.device._offsetOrientation(orientation);
		}
		else
			this._sensorManager.device._calibrateOrientation();

		orientation.timestamp = e.timestamp;

		return orientation;
	},

	_eventDetection: function(e) {

	},

	// //when calibrating, check if beta and gamma within the range in 3 seconds,
	// //if yes, calibrate automatically
	_calibrating: function(e) {
	
		this.eulerOffset = this.eulerOffset.setAlpha(-e.alpha + 360);
		this.unbind(this._calibrating);
		this._isCalibrating = false;

		if(typeof this._calibrated === "function") {
			this._calibrated(this.eulerOffset);
			delete this._calibrated;
		}

	},

	// //callback function when sensor is calibrated
	_calibrated: function(e) {
	},

	calibrate: function(callback) {
		if(this._isCalibrating) return;

		// var sd = this._sensorManager.sensordata.get();
		this.eulerOffset = this.eulerOffset.setAlpha(0);
		this._isCalibrating = true;
		// this.eulerOffset = this.eulerOffset.setAlpha(-sd.orientation.alpha + 360);
		// callback(this.eulerOffset);
		this._calibrated = callback;
		this.bind(this._calibrating);
	},

	isCalibrating: function() {
		return this._isCalibrating;
	},
});

//child class motion
DS.SensorMotion = function(sensorManager) {
	DS.Sensor.call(this, 'Motion', 'devicemotion', DS.State.Unknown, window.DeviceMotionEvent, sensorManager);
};
DS.SensorMotion.prototype = Object.create(DS.Sensor.prototype);
DS.extend(DS.SensorMotion.prototype, {
	constructor: DS.SensorMotion,
	_isWorkable: function(e) {
		//this._sensorManager.sensordata.set(DS.SensorType.Motion, this._calibrate(e));
		return e && e.acceleration && e.accelerationIncludingGravity && e.rotationRate &&
		e.acceleration.x && e.accelerationIncludingGravity.x && e.rotationRate.alpha;
	},

	//function return true if data will be filtered
	_filter: function(e) {
		//if(e.acceleration.magitude() < 0.01) return true;

		//other filter function -> return true;

		return false;
	},

	_offset: function(e) {
		var acceleration = new DS.Vector({
			x: e.acceleration.x,
			y: e.acceleration.y,
			z: e.acceleration.z,
		});

		var accelerationIncludingGravity = new DS.Vector({
			x: e.accelerationIncludingGravity.x,
			y: e.accelerationIncludingGravity.y,
			z: e.accelerationIncludingGravity.z,
		});

		var rotationRate = new DS.Euler({
			alpha: e.rotationRate.alpha,
			beta: e.rotationRate.beta,
			gamma: e.rotationRate.gamma
		});

		return this._sensorManager.device._offsetMotion({
			timestamp: e.timestamp,
			acceleration: acceleration,
			accelerationIncludingGravity: accelerationIncludingGravity,
			rotationRate: rotationRate,
		});
	},

	_eventDetection: function(e) {

	},


});


DS.SensorManager = function() {

	var self = this;
	//exports to public
	this.orientation = null;
	this.motion = null;
	this.device = new DS.DeviceManager(this);
	this._em = new DS.EventManager(this);
	this.event = this._em;

	this.pause = function() {
		self._batch(self._sensors, function(s) { s.stop(); });
	};

	this.resume = function() {
		self._batch(self._sensors, function(s) { s.run(); });
	};

	this.support = function() {
		return this._isSupport;
	};

	this.options = {
		support 	: function() {},
		nosupport	: function() {},
		pause		: false,
		sensors		: [ DS.SensorType.Orientation, DS.SensorType.Motion ],
		check		: true,
	};
};

DS.SensorManager.prototype = {
	//flag to check if the manager is init
	_init 		: false,

	//orientation and sensor object
	_m 			: null,
	_o 			: null,

	//sensor object
	_sensors 	: [],

	_isSupport 	: false,

	//will loop through the array of sensors with callback
	_batch 		: function(sensors, callback) {

		for(var i = 0; i < sensors.length; i++)
			callback(sensors[i]);
	},

	_waitForSensorResponse : function(timeout, callback) {
		var self = this;
		var sensors = this._sensors;

		for(var i = 0; i < sensors.length; i++)
			if(sensors[i]._support == DS.State.NotSupport) {
				callback(false);
				return;
			}

		if(timeout > 0) {
			var pass = true;
			for(var i = 0; i < sensors.length; i++)
				if(sensors[i]._support != DS.State.Support)
					pass = false;
			if(pass) {
				callback(true);
				return;
			}

			timeout -= 1000;
			setTimeout(function() { self._waitForSensorResponse(timeout, callback); }, 1000);
		}
		else
			callback(false);
	},

	_eventDetection: function(e) {
		var swing = this._em.swing;
		var serve = this._em.serve;
		var toss = this._em.toss;
		if(swing.isEnable()) swing.swingDetection(e);
		if(serve.isEnable()) serve.serveDetection(e);
		if(toss.isEnable()) toss.tossDetection(e);
	},

	initialize	: function(options) {

		if(this._init) return;
		this.__proto__._init = true;

		//copy all the options
		for(var option in this.options)
			options[option] = options[option] || this.options[option];

		//init each sensor
		for(var i = 0; i < options.sensors.length; i++) {
			switch(options.sensors[i]) {
				case DS.SensorType.Orientation:
					this.__proto__._o = new DS.SensorOrientation(this);
					this._sensors.push(this._o);
					this.orientation = this._o;
				break;
				case DS.SensorType.Motion:
					this.__proto__._m = new DS.SensorMotion(this);
					this._sensors.push(this._m);
					this.motion = this._m;
				break;
				default:
				break;
			}
		}

		var support = function(isSupport) {
			self._batch(self._sensors, function(s) { s._uncheck(); });
			self.pause();

			//if support, 
			//bind the function to record sensor data for each sensor
			//and bind additional function to check event
			if(isSupport) {
				options.support();
				self.__proto__._isSupport = true;

				if(typeof self._o !== "undefined") {
					self._o.bind(function(e) {
						self.sensordata.set(DS.SensorType.Orientation, e);
						var dataset = self.sensordata.get(e.timestamp);
						if(dataset !== false)
							self._eventDetection(dataset);
						self._o._eventDetection(dataset);
					});
				}

				if(typeof self._m !== "undefined") {
					self._m.bind(function(e) {
						self.sensordata.set(DS.SensorType.Motion, e);
						var dataset = self.sensordata.get(e.timestamp);
						if(dataset !== false)
							self._eventDetection(dataset);
						self._m._eventDetection(dataset);
					});
				}

				self._batch(self._sensors, function(s) {
					if(!self.options.pause) s.run();
				});
			}
			else {
				options.nosupport();
			}
		};

		//not to check the sensors and default force support the sensor
		if(!options.check) {
			support(true);
			return;
		}

		var self = this;

		//check all the sensors
		this._batch(this._sensors, function(s) { s._check(); });

		//checking sensor availibility and wait for response
		this._waitForSensorResponse(DS.SensorCheckingTimeout, support);

	},
};

//used to record range of sensor data
DS.SensorManager.prototype.sensordata 		= new DS.SensorData();

DS.SensorManager.prototype.device 			= null;
