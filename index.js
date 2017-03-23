'use strict';

var Rx = require('rxjs/Rx');
var GPIO = require('pi-pins');

var exec = require('child_process').exec;
var util = require('util');

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

  var subscription = source.subscribe(
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

    // noble.stopScanning();

    peripheral.on('connect', function() {
      console.log('on -> connect');
      this.updateRssi();

      peripheral.discoverServices(["fffffffffffffffffffffffffffffff0"], function(err, services){
        console.log("Discover services");
        const service = services.filter(service => service.uuid === "fffffffffffffffffffffffffffffff0")[0];

        if(service) {

          const chars = service.discoverCharacteristics([], (err, characteristics) => {
            console.log("Setting instance");
            inst = characteristics.filter(char => char.uuid === "fffffffffffffffffffffffffffffff4")[0];
          });
        }

      })
    });

    peripheral.connect();
  });
}

startBluetooth();
