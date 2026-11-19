import assert from 'node:assert';
import { calculateFare } from '../src/utils/calculateFare.js';
const eco = calculateFare({ distanceKm: 8.5, durationMin: 22, category: 'economy', tip: 0 });
assert.deepStrictEqual([eco.fare, eco.commission, eco.driverEarnings], [19200, 3840, 15360]);
const xl = calculateFare({ distanceKm: 8.5, durationMin: 22, category: 'xl', tip: 0 });
assert.deepStrictEqual([xl.fare, xl.commission, xl.driverEarnings], [26900, 5380, 21520]);
assert.strictEqual(calculateFare({ distanceKm: 0.2, durationMin: 1, category: 'economy' }).fare, 6000); // mínima
assert.strictEqual(calculateFare({ distanceKm: 8.5, durationMin: 22, category: 'xl', tip: 2000 }).driverEarnings, 23520); // propina completa
console.log('calculateFare OK');
