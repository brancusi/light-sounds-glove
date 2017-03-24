const { Set } = require('immutable');
const all = Set([1,2,3])
const connected = Set();

console.log(connected.isEmpty());
// console.log(connected.toJS());

// const updated = connected.concat([2,5,6]);

// console.log(updated.toJS());

console.log(all.subtract(connected).toJS());
