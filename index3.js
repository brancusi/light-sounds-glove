'use strict';

const R = require('ramda');
const { Set, Map } = require('immutable');

var Rx = require('rxjs/Rx');
// var GPIO = require('pi-pins');

var exec = require('child_process').exec;
var util = require('util');

const all = Set(["fff0"]);
let connected = Set();
let devices = Map();

function startApp() {
  const noble = require('noble');

  var source = Rx.Observable
      .interval(50)
      .map(() => pin.value())
      .distinctUntilChanged();

  var stdin = process.stdin;
  var playback = undefined;

  // without this, we would only get streams once enter is pressed
  stdin.setRawMode( true );

  // resume stdin in the parent process (node app won't quit all by itself
  // unless an error or process.exit() happens)
  stdin.resume();

  // i don't want binary, do you?
  stdin.setEncoding( 'utf8' );

  // on any data into stdin
  stdin.on( 'data', function( key ){
    const device = devices.get("fff0");

    if(key === 'a') {
      if(device) {
        device.write(new Buffer("1"), false, () => {});
      }
    }

    if(key === 's') {
      if(device) {
        device.write(new Buffer("0"), false, () => {});
      }
    }

    // ctrl-c ( end of text )
    if ( key === '\u0003' ) {
      if(device) {
        device.write(new Buffer("0"), false, () => {});
      }

      process.exit();
    }
    // write the key to stdout all normal like
    process.stdout.write( key );
  });

  noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
      Rx.Observable
        .interval(10000)
        .startWith(0)
        .map(() => all.subtract(connected))
        .filter(keys => !keys.isEmpty())
        .map(keys => keys.toJS())
        .do(keys => console.log("Going to scan for ", keys))
        .subscribe(jsKeys => {
          console.log("Scan baby!");
          noble.startScanning(jsKeys);
        });
    } else {
      noble.stopScanning();
    }
  });

  noble.on('discover', peripheral => {
    const uuids = peripheral.advertisement.serviceUuids

    connectPeripheral(peripheral.advertisement.serviceUuids, peripheral);

    peripheral.on('disconnect', function() {
      console.log("disconnected", uuids);
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

    peripheral.discoverServices(["fff0"], (err, services) => {
      const service = services[0];

      if(service) {
        const chars = service.discoverCharacteristics(["fff1"], (err, characteristics) => {
          devices = devices.set(ids[0], characteristics[0]);
        });
      }
    });
  }
}



startApp();
