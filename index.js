'use strict';

const R = require('ramda');
const { Map, Set } = require('immutable');

var Rx = require('rxjs/Rx');
var GPIO = require('pi-pins');

var exec = require('child_process').exec;
var util = require('util');

const all = Set(["fff0", "fff1", "fff2"]);
let connected = Set();
let devices = Map();

const device1 = GPIO.connect(14);
device1.mode("in");

const device2 = GPIO.connect(15);
device2.mode("in");

const device3 = GPIO.connect(18);
device3.mode("in");

const PIN_MAP = {"fff0": device1, "fff1": device2, "fff2": device3};

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

  const subs = all
    .map(id => {
      return Rx.Observable
        .interval(50)
        .map(() => PIN_MAP[id].value())
        .map(val => val ? "1" : "0")
        .distinctUntilChanged()
        .map(pinVal => {
          return {
            device: devices.get(id),
            buffer: new Buffer(pinVal)
          }
        })
        .filter(state => state.device !== undefined)
    })
    .map(source => source.subscribe(state => state.device.write(state.buffer, false, () => {})));

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
  peripheral.connect((err) => handleConnectedPeripheral(err, ids, peripheral) );
}

function handleConnectedPeripheral(err, ids, peripheral) {
  if(err === undefined) {
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
}

startBluetooth();
