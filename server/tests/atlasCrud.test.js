import 'dotenv/config';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Task from '../src/models/Task.js';
import Bid from '../src/models/Bid.js';
import Conversation from '../src/models/Conversation.js';
import Message from '../src/models/Message.js';
import { createOtp, encryptOtp, decryptOtp, verifyOtp } from '../src/utils/otp.js';

async function runTest() {
  await connectDB();
  console.log('Connected to Atlas successfully.');

  const customer = await User.findOne({ email: 'customer@gmail.com' });
  const runner = await User.findOne({ email: 'runner@gmail.com' });

  if (!customer || !runner) {
    throw new Error('Demo accounts not found');
  }

  console.log('1. Testing Task Creation in MongoDB Atlas...');
  const task = await Task.create({
    customerId: customer._id,
    title: 'Test Delivery from Gulshan 1',
    description: 'Picking up parcel from Gulshan 1 to Banani 11',
    estimatedPrice: 350,
    pickupLocation: { type: 'Point', coordinates: [90.4152, 23.7925] },
    deliveryLocation: { type: 'Point', coordinates: [90.4043, 23.7937] },
    pickupAddress: 'Gulshan 1 Circle',
    deliveryAddress: 'Banani Road 11',
  });
  console.log('Task created with ID:', task._id.toString());

  console.log('2. Verifying Task exists in Atlas...');
  const foundTask = await Task.findById(task._id);
  if (!foundTask || foundTask.status !== 'pending') {
    throw new Error('Task not found in Atlas or status not pending');
  }
  console.log('Task confirmed saved in MongoDB Atlas!');

  console.log('3. Testing Runner Accepting Task...');
  const pickupOTP = createOtp();
  const deliveryOTP = createOtp();
  const acceptedTask = await Task.findOneAndUpdate(
    { _id: task._id, status: 'pending' },
    {
      $set: {
        runnerId: runner._id,
        finalPrice: task.estimatedPrice,
        status: 'accepted',
        pickupOTP: encryptOtp(pickupOTP),
        deliveryOTP: encryptOtp(deliveryOTP),
        acceptedAt: new Date(),
      },
    },
    { new: true }
  ).select('+pickupOTP +deliveryOTP');

  if (!acceptedTask || acceptedTask.status !== 'accepted') {
    throw new Error('Failed to accept task');
  }
  console.log('Runner accepted task! Status:', acceptedTask.status);

  console.log('4. Testing OTP Verification...');
  const decryptedPickup = decryptOtp(acceptedTask.pickupOTP);
  console.log('Decrypted pickup OTP:', decryptedPickup);
  if (!verifyOtp(acceptedTask.pickupOTP, decryptedPickup)) {
    throw new Error('OTP verification failed');
  }
  await Task.updateOne({ _id: task._id }, { $set: { status: 'picked-up', pickedUpAt: new Date() } });
  console.log('Pickup OTP verified, status updated to picked-up');

  await Task.updateOne({ _id: task._id }, { $set: { status: 'in-transit', departedAt: new Date() } });
  await Task.updateOne({ _id: task._id }, { $set: { status: 'arriving', arrivingAt: new Date() } });
  console.log('Delivery stages updated: in-transit -> arriving');

  const decryptedDelivery = decryptOtp(acceptedTask.deliveryOTP);
  if (!verifyOtp(acceptedTask.deliveryOTP, decryptedDelivery)) {
    throw new Error('Delivery OTP verification failed');
  }
  await Task.updateOne({ _id: task._id }, { $set: { status: 'completed', completedAt: new Date() } });
  console.log('Delivery OTP verified, status updated to completed!');

  console.log('5. Testing Chat Conversation & Messages in MongoDB Atlas...');
  let conversation = await Conversation.findOne({ job: task._id });
  if (!conversation) {
    conversation = await Conversation.create({
      job: task._id,
      participants: [customer._id, runner._id],
      lastMessage: 'Hello Runner, I am waiting',
      lastMessageAt: new Date(),
      unreadCount: { [String(runner._id)]: 1, [String(customer._id)]: 0 },
      status: 'active',
    });
  }
  console.log('Conversation created in Atlas with ID:', conversation._id.toString());

  const message1 = await Message.create({
    conversation: conversation._id,
    sender: customer._id,
    type: 'text',
    text: 'Please call me when you reach the shop.',
    status: 'sent',
  });
  console.log('Customer message created with ID:', message1._id.toString());

  const message2 = await Message.create({
    conversation: conversation._id,
    sender: runner._id,
    type: 'text',
    text: 'Sure, I am on my way!',
    status: 'sent',
  });
  console.log('Runner message created with ID:', message2._id.toString());

  const messagesInDb = await Message.find({ conversation: conversation._id });
  console.log('Total messages stored in Atlas for this job:', messagesInDb.length);
  if (messagesInDb.length < 2) {
    throw new Error('Messages not saved properly in MongoDB Atlas');
  }

  console.log('6. Testing Message Deletion (CRUD Delete)...');
  await Message.deleteOne({ _id: message1._id });
  const remaining = await Message.find({ conversation: conversation._id });
  console.log('Remaining messages after delete:', remaining.length);
  if (remaining.length !== 1) {
    throw new Error('Delete message failed');
  }

  console.log('7. Cleaning up test data...');
  await Message.deleteMany({ conversation: conversation._id });
  await Conversation.deleteOne({ _id: conversation._id });
  await Task.deleteOne({ _id: task._id });
  console.log('Test task, conversation, and messages cleaned up.');

  console.log('ALL CRUD OPERATIONS & ATLAS PERSISTENCE VERIFIED SUCCESSFULLY!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

