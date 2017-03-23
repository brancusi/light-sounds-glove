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
      .interval(10)
      .timeInterval()
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
      noble.startScanning(["fffffffffffffffffffffffffffffff0"]);
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
      // console.log('on -> connect');
      // this.updateRssi();

      peripheral.discoverServices([], function(err, services){
        const service = services.filter(service => service.uuid === "fffffffffffffffffffffffffffffff0")[0];
        const chars = service.discoverCharacteristics([], (err, characteristics) => {
          inst = characteristics.filter(char => char.uuid === "fffffffffffffffffffffffffffffff4")[0];
        });

      })
    });
    //
    // peripheral.on('disconnect', function() {
    //   console.log('on -> disconnect');
    // });
    //
    // peripheral.on('rssiUpdate', function(rssi) {
    //   console.log('on -> RSSI update ' + rssi);
    //   this.discoverServices();
    // });
    //
    // peripheral.on('servicesDiscover', function(services) {
    //   console.log('on -> peripheral services discovered ' + services);
    //
    //   var serviceIndex = 0;
    //
    //   services[serviceIndex].on('includedServicesDiscover', function(includedServiceUuids) {
    //     console.log('on -> service included services discovered ' + includedServiceUuids);
    //     this.discoverCharacteristics();
    //   });
    //
    //   services[serviceIndex].on('characteristicsDiscover', function(characteristics) {
    //     console.log('on -> service characteristics discovered ' + characteristics);
    //
    //     var characteristicIndex = 0;
    //
    //     characteristics[characteristicIndex].on('read', function(data, isNotification) {
    //       console.log('on -> characteristic read ' + data + ' ' + isNotification);
    //       console.log(data);
    //
    //       peripheral.disconnect();
    //     });
    //
    //     characteristics[characteristicIndex].on('write', function() {
    //       console.log('on -> characteristic write ');
    //
    //       peripheral.disconnect();
    //     });
    //
    //     characteristics[characteristicIndex].on('broadcast', function(state) {
    //       console.log('on -> characteristic broadcast ' + state);
    //
    //       peripheral.disconnect();
    //     });
    //
    //     characteristics[characteristicIndex].on('notify', function(state) {
    //       console.log('on -> characteristic notify ' + state);
    //
    //       peripheral.disconnect();
    //     });
    //
    //     characteristics[characteristicIndex].on('descriptorsDiscover', function(descriptors) {
    //       console.log('on -> descriptors discover ' + descriptors);
    //
    //       var descriptorIndex = 0;
    //
    //       descriptors[descriptorIndex].on('valueRead', function(data) {
    //         console.log('on -> descriptor value read ' + data);
    //         console.log(data);
    //         peripheral.disconnect();
    //       });
    //
    //       descriptors[descriptorIndex].on('valueWrite', function() {
    //         console.log('on -> descriptor value write ');
    //         peripheral.disconnect();
    //       });
    //
    //       descriptors[descriptorIndex].readValue();
    //       //descriptors[descriptorIndex].writeValue(new Buffer([0]));
    //     });
    //
    //
    //     characteristics[characteristicIndex].read();
    //     //characteristics[characteristicIndex].write(new Buffer('hello'));
    //     //characteristics[characteristicIndex].broadcast(true);
    //     //characteristics[characteristicIndex].notify(true);
    //     // characteristics[characteristicIndex].discoverDescriptors();
    //   });
    //
    //
    //   services[serviceIndex].discoverIncludedServices();
    // });

    peripheral.connect();
  });
}

startBluetooth();
