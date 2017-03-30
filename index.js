'use strict';

const R = require('ramda');
const { Map, Set } = require('immutable');

var Rx = require('rxjs/Rx');
var GPIO = require("gpio");

var exec = require('child_process').exec;
var util = require('util');

const all = Set(["fff0", "fff1", "fff2"]);
let connected = Set();
let devices = Map();

const DEVICE_PIN_MAP = {
  "fff0": 16,
  "fff1": 20,
  "fff2": 21
}

const pinsListeners = Object.keys(DEVICE_PIN_MAP)
  .map(key => {
    const pinNumber = DEVICE_PIN_MAP[key];
    const pin = GPIO.export(pinNumber, { direction: "in", interval: 50 });

    return pin.on("change", state => {
      const device = devices.get(key);

      console.log(key, pinNumber, state);

      if(device) {
        device.write(new Buffer(String(state)), true);
      }
    });
  });

function startBluetooth() {
  exec("/usr/bin/hciattach /dev/ttyAMA0 bcm43xx 921600 noflow -", function(err, stdout){
    if(err) {
      console.log("Error starting bluetooth");
      startBluetooth();
    } else {
      startRadio();
    }
  });
}

function startRadio() {
  exec("hciconfig hci0 up", function(err, stdout1){
    if(err) {
      console.log("Error starting radio");
      startRadio();
    } else {
      startApp();
    }
  });
}

function startApp() {
  const noble = require('noble');

  noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
      Rx.Observable
        .interval(10000)
        .startWith(0)
        .map(() => all.subtract(connected))
        .filter(keys => !keys.isEmpty())
        .map(keys => keys.toJS())
        .do(keys => console.log("Going to scan for ", keys))
        .subscribe(jsKeys => noble.startScanning(jsKeys));
    } else {
      noble.stopScanning();
    }
  });

  noble.on('discover', peripheral => {
    const uuids = peripheral.advertisement.serviceUuids

    connectPeripheral(peripheral.advertisement.serviceUuids, peripheral);

    peripheral.on('disconnect', () => {
      connected = connected.subtract(uuids);
    });
  });
}

function connectPeripheral(ids, peripheral) {
  peripheral.connect(err => {
    if(err) {
      console.log("Error connecting to device", err, ids);
    } else {
      handleConnectedPeripheral(ids, peripheral)
    }
  });
}

function handleConnectedPeripheral(ids, peripheral) {
  connected = connected.concat(ids);

  peripheral.discoverServices(ids, (err, services) => {
    const service = services[0];

    if(service) {
      const chars = service.discoverCharacteristics(["fff1"], (err, characteristics) => {
        devices = devices.set(ids[0], characteristics[0]);
      });
    }
  });
}

startBluetooth();
