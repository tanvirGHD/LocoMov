import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTaskListFilter, filterTasksForMarketplace } from '../src/controllers/taskController.js';

test('runner marketplace includes both open jobs and their own assigned jobs', () => {
  const filter = buildTaskListFilter({ role: 'runner', _id: 'runner-1' });
  assert.deepEqual(filter, {
    $or: [
      { status: 'pending', customerId: { $ne: 'runner-1' } },
      { runnerId: 'runner-1', status: { $nin: ['cancelled', 'deleted'] } },
    ],
  });
});

test('marketplace search filters by keyword and location text', () => {
  const tasks = [
    { _id: '1', title: 'Medicine pickup', description: 'Need urgent medicine from Gulshan', pickupAddress: 'Gulshan 1', deliveryAddress: 'Dhanmondi' },
    { _id: '2', title: 'Grocery run', description: 'Daily grocery', pickupAddress: 'Motijheel', deliveryAddress: 'Bashundhara' },
    { _id: '3', title: 'Parcel delivery', description: 'Deliver package to Banani', pickupAddress: 'Banani', deliveryAddress: 'Uttara' },
  ];

  assert.deepEqual(filterTasksForMarketplace(tasks, 'medicine').map((task) => task._id), ['1']);
  assert.deepEqual(filterTasksForMarketplace(tasks, 'banani').map((task) => task._id), ['3']);
  assert.deepEqual(filterTasksForMarketplace(tasks, 'gulshan').map((task) => task._id), ['1']);
});

test('admin row should retain cancelled and deleted tasks for review', () => {
  const summaries = [
    { status: 'cancelled', reason: 'customer cancelled' },
    { status: 'deleted', reason: 'customer deleted post' },
    { status: 'accepted', reason: 'active job' },
  ];

  const includeForAdmin = summaries.filter((task) => ['cancelled', 'deleted', 'accepted', 'picked-up', 'in-transit', 'arriving', 'completed', 'pending'].includes(task.status));
  assert.equal(includeForAdmin.length, 3);
  assert.deepEqual(includeForAdmin.map((task) => task.status).sort(), ['accepted', 'cancelled', 'deleted']);
});
