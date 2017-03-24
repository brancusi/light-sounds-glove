var Sound = require('aplay');

// with ability to pause/resume:
var music = new Sound();
// music.play('foo1.mp3');

// setTimeout(function () {
// 	music.pause(); // pause the music after five seconds
// }, 5000);
//
// setTimeout(function () {
//   music.resume(); // and resume it two seconds after pausing
// }, 7000);
//
// // you can also listen for various callbacks:
// music.on('complete' function () {
//   console.log('Done with playback!');
// });

// var Player = require('player');
// var player = new Player('./foo1.mp3');
//
var stdin = process.stdin;

// without this, we would only get streams once enter is pressed
stdin.setRawMode( true );

// resume stdin in the parent process (node app won't quit all by itself
// unless an error or process.exit() happens)
stdin.resume();

// i don't want binary, do you?
stdin.setEncoding( 'utf8' );

// on any data into stdin
stdin.on( 'data', function( key ){
  if(key === 'a') {
    music.play('foo1.mp3');
  }

  if(key === 's') {
    music.pause();
  }

  // ctrl-c ( end of text )
  if ( key === '\u0003' ) {
    process.exit();
  }
  // write the key to stdout all normal like
  process.stdout.write( key );
});
