const assert = require('assert');
const gamesManager = require('../src/gamesManager');

console.log('Running backend unit tests...');

// Test 1: Room creation
const { room, role } = gamesManager.createRoom('socket_host_1', 'Alice', 'white');
assert.strictEqual(role, 'white');
assert.strictEqual(room.players.white.name, 'Alice');
assert.strictEqual(room.status, 'waiting');
console.log('✓ Room creation passed');

// Test 2: Second player joining
const joinResult = gamesManager.joinRoom(room.id, 'socket_player_2', 'Bob');
assert.strictEqual(joinResult.role, 'black');
assert.strictEqual(joinResult.room.players.black.name, 'Bob');
assert.strictEqual(joinResult.room.status, 'active');
console.log('✓ Player joining passed');

// Test 3: Making a legal move (e2 -> e4)
const move1 = gamesManager.makeMove(room.id, 'socket_host_1', { from: 'e2', to: 'e4' });
assert.strictEqual(move1.success, true);
assert.strictEqual(move1.turn, 'black');
assert.strictEqual(move1.isCheck, false);
console.log('✓ Legal move e2-e4 passed');

// Test 4: Illegal move (White tries to move out of turn)
const illegalTurnMove = gamesManager.makeMove(room.id, 'socket_host_1', { from: 'e4', to: 'e5' });
assert.strictEqual(illegalTurnMove.error, 'Not your turn');
console.log('✓ Turn validation passed');

// Test 5: Black responds (e7 -> e5)
const move2 = gamesManager.makeMove(room.id, 'socket_player_2', { from: 'e7', to: 'e5' });
assert.strictEqual(move2.success, true);
assert.strictEqual(move2.turn, 'white');
console.log('✓ Opponent response passed');

console.log('All backend logic tests passed successfully!');
