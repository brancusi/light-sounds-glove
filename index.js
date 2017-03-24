'use strict';

const R = require('ramda');

var Rx = require('rxjs/Rx');
var GPIO = require('pi-pins');

var exec = require('child_process').exec;
var util = require('util');

const all = ["fffffffffffffffffffffffffffffff0"];
const connected = new Set();

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
  console.log("Started App");
  var noble = require('noble');

  var pin = GPIO.connect(16);
  pin.mode("in");

  var inst = undefined;

  var isOn = false;

  var source = Rx.Observable
      .interval(50)
      .map(() => pin.value())
      .distinctUntilChanged();

  var readSub = source.subscribe(
      function (isOn) {
        console.log(isOn);
        if(inst) {
          var code = isOn ? 1 : 0;
          var buf = new Buffer(2);
          buf.writeUInt16BE(code, 0);
          inst.write(buf, false, function(err) {
            if (err) {
              console.log('bake error');
            }
          });
        }
      },
      function (err) {
          console.log('Error: ' + err);
      },
      function () {
          console.log('Completed');
      });

  noble.on('stateChange', function(state) {
    console.log('on -> stateChange: ' + state);

    if (state === 'poweredOn') {
      noble.startScanning([], true);
      // Rx.Observable
      //   .interval(10000)
      //   .subscribe(
      //     function () {
      //       noble.startScanning(R.difference(all, [...connected]));
      //     },
      //     function (err) {
      //         console.log('Error: ' + err);
      //     },
      //     function () {
      //         console.log('Completed');
      //     });
    } else {
      noble.stopScanning();
    }
  });

  noble.on('scanStart', function() {
    console.log('on -> scanStart');
  });

  noble.on('scanStop', function() {
    console.log('on -> scanStop');
  });

  noble.on('discover', function(peripheral) {
    console.log('on -> discover: ' + peripheral);

    peripheral.on('connect', function() {
      console.log('on -> connect', peripheral);
      this.updateRssi();

      peripheral.discoverServices(["fffffffffffffffffffffffffffffff0"], function(err, services){
        console.log("Discover services");
        const service = services[0];
        const uuid = service.uuid;
        connected.add(uuid);

        if(service) {
          const chars = service.discoverCharacteristics(["fffffffffffffffffffffffffffffff4"], (err, characteristics) => {
            console.log("Setting instance");
            inst = characteristics[0];
          });
        }

      })
    });

    peripheral.on('disconnect', function() {
      console.log("disconnected", peripheral);
    });

    peripheral.connect();
  });
}

startBluetooth();
