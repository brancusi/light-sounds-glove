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
  "fff0": 14,
  "fff1": 15,
  "fff2": 18
}

R.forEachObjIndexed((key, val) => {
  const pin = GPIO.export(val, {direction: "in"});

  console.log("Setting up pin", key, val);

  pin.on("change", function(state) {
    console.log("Changed", key, val, state);
    const device = devices.get(key);

    if(device) {
      device.write(new Buffer(String(state)), true, err => {});
    }
  });
}, DEVICE_PIN_MAP)

function startBluetooth() {
  console.log("Starting bluetooth");
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
  console.log("Starting Radio");
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

  // const subs = all
  //   .map(id =>
  //     Rx.Observable
  //       .interval(200)
  //       .map(() => {
  //         const hey = PIN_MAP[id].value();
  //         console.log(PIN_MAP, id, hey);
  //         return hey;
  //       })
  //       .map(val => val ? "1" : "0")
  //       .distinctUntilChanged()
  //       .map(pinVal => {
  //         console.log("Pin", id, pinVal);
  //         return {
  //           id,
  //           device: devices.get(id),
  //           buffer: new Buffer(pinVal)
  //         }
  //       })
  //       .filter(state => state.device !== undefined))
  //   .map(source => source.subscribe(state => {
  //     console.log("Going to write to", state.id, state.buffer.toString());
  //     state.device.write(state.buffer, true, err => {
  //       if(err) {
  //         console.log("Error writing to device", state.id, err)
  //       }
  //     });
  //   }));

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
  console.log("Connect to ids", ids);
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
  console.log(connected.toJS());

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
