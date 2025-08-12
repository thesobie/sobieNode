const mongoose = require('mongoose');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Conference = require('../models/Conference');
const Session = require('../models/Session');

// Test data for communication system
const testCommunicationSystem = async () => {
  try {
    console.log('🧪 Testing Communication System...\n');

    // Find test users
    const users = await User.find({ isActive: true }).limit(3);
    if (users.length < 2) {
      console.log('❌ Need at least 2 active users for testing');
      return;
    }

    const sender = users[0];
    const recipients = users.slice(1);
    console.log(`📧 Sender: ${sender.name.firstName} ${sender.name.lastName}`);
    console.log(`👥 Recipients: ${recipients.map(u => `${u.name.firstName} ${u.name.lastName}`).join(', ')}\n`);

    // Test 1: Create a direct message
    console.log('1️⃣ Testing Direct Message...');
    const directMessage = new Message({
      subject: 'Test Direct Message',
      content: 'This is a test message to verify the communication system is working properly.',
      messageType: 'direct',
      priority: 'normal',
      senderId: sender._id,
      senderRole: sender.primaryRole,
      recipients: recipients.map(user => ({
        userId: user._id,
        readStatus: 'unread',
        notificationSent: false
      })),
      deliveryStatus: 'sent',
      totalRecipients: recipients.length,
      actualSendTime: new Date()
    });

    await directMessage.save();
    console.log(`✅ Direct message created with ID: ${directMessage._id}\n`);

    // Test 2: Create an announcement
    console.log('2️⃣ Testing Announcement...');
    const announcement = Message.createAnnouncement({
      subject: 'Important Conference Update',
      content: 'This is a test announcement for all conference participants. Please review the updated schedule.',
      priority: 'high',
      senderId: sender._id,
      recipients: recipients.map(user => ({
        userId: user._id,
        readStatus: 'unread'
      })),
      deliveryStatus: 'sent',
      totalRecipients: recipients.length,
      actualSendTime: new Date()
    });

    await announcement.save();
    console.log(`✅ Announcement created with ID: ${announcement._id}\n`);

    // Test 3: Create a schedule change notification
    console.log('3️⃣ Testing Schedule Change Notification...');
    
    // Create test session data
    const testSession = await Session.findOne() || {
      _id: new mongoose.Types.ObjectId(),
      title: 'Test Session',
      track: 'Research Presentations'
    };

    const scheduleChange = Message.createScheduleChange(
      testSession._id,
      {
        changeType: 'time',
        originalData: {
          scheduledTime: '2024-03-15T10:00:00Z',
          location: 'Room A101'
        },
        newData: {
          scheduledTime: '2024-03-15T14:00:00Z',
          location: 'Room B205'
        }
      },
      sender._id,
      'Venue conflict resolution'
    );

    scheduleChange.recipients = recipients.map(user => ({
      userId: user._id,
      readStatus: 'unread'
    }));
    scheduleChange.totalRecipients = recipients.length;
    scheduleChange.deliveryStatus = 'sent';
    scheduleChange.actualSendTime = new Date();

    await scheduleChange.save();
    console.log(`✅ Schedule change notification created with ID: ${scheduleChange._id}`);
    
    // Test the HTML formatting
    const htmlContent = scheduleChange.getScheduleChangeHTML();
    console.log('📄 Schedule change HTML preview:');
    console.log(htmlContent.substring(0, 200) + '...\n');

    // Test 4: Create notifications
    console.log('4️⃣ Testing Notification System...');
    const notifications = recipients.map(recipient => ({
      title: 'Test Notification',
      message: 'This is a test notification for the communication system.',
      type: 'system',
      priority: 'normal',
      userId: recipient._id,
      sourceType: 'admin',
      sourceId: sender._id,
      sourceModel: 'User',
      messageId: directMessage._id,
      actionRequired: false,
      actionType: 'view',
      actionUrl: `/messages/${directMessage._id}`,
      icon: 'bell',
      color: 'blue'
    }));

    await Notification.insertMany(notifications);
    console.log(`✅ Created ${notifications.length} notifications\n`);

    // Test 5: Test message retrieval
    console.log('5️⃣ Testing Message Retrieval...');
    const userMessages = await Message.getUserMessages(recipients[0]._id, {
      limit: 10
    });
    console.log(`✅ Found ${userMessages.length} messages for user ${recipients[0].name.firstName}\n`);

    // Test 6: Test notification retrieval
    console.log('6️⃣ Testing Notification Retrieval...');
    const userNotifications = await Notification.getUserNotifications(recipients[0]._id, {
      limit: 10
    });
    console.log(`✅ Found ${userNotifications.length} notifications for user ${recipients[0].name.firstName}\n`);

    // Test 7: Test mark as read functionality
    console.log('7️⃣ Testing Mark as Read...');
    if (userMessages.length > 0) {
      await userMessages[0].markAsRead(recipients[0]._id);
      console.log(`✅ Marked message ${userMessages[0]._id} as read\n`);
    }

    if (userNotifications.length > 0) {
      await userNotifications[0].markAsRead();
      console.log(`✅ Marked notification ${userNotifications[0]._id} as read\n`);
    }

    // Test 8: Test notification counts
    console.log('8️⃣ Testing Notification Counts...');
    const counts = await Notification.getNotificationCounts(recipients[0]._id);
    console.log('📊 Notification counts:', counts);

    console.log('\n🎉 All communication system tests completed successfully!');
    console.log('\n📋 Summary of created test data:');
    console.log(`   • Direct message: ${directMessage._id}`);
    console.log(`   • Announcement: ${announcement._id}`);
    console.log(`   • Schedule change: ${scheduleChange._id}`);
    console.log(`   • Notifications: ${notifications.length} created`);

  } catch (error) {
    console.error('❌ Communication system test failed:', error.message);
    console.error(error.stack);
  }
};

// Test individual message HTML formatting
const testScheduleChangeFormatting = () => {
  console.log('\n🎨 Testing Schedule Change HTML Formatting...\n');

  // Test data for different types of changes
  const testChanges = [
    {
      changeType: 'time',
      originalData: { scheduledTime: '2024-03-15T10:00:00Z' },
      newData: { scheduledTime: '2024-03-15T14:00:00Z' }
    },
    {
      changeType: 'location',
      originalData: { location: 'Conference Hall A' },
      newData: { location: 'Online Virtual Room' }
    },
    {
      changeType: 'cancellation',
      originalData: { status: 'scheduled' },
      newData: { status: 'cancelled' }
    }
  ];

  testChanges.forEach((change, index) => {
    console.log(`Test ${index + 1}: ${change.changeType.toUpperCase()} change`);
    
    const mockMessage = {
      scheduleChange: change,
      getScheduleChangeHTML: Message.schema.methods.getScheduleChangeHTML
    };
    
    const htmlContent = mockMessage.getScheduleChangeHTML();
    console.log('Generated HTML:');
    console.log(htmlContent.substring(0, 300) + '...\n');
  });
};

// Export test functions
module.exports = {
  testCommunicationSystem,
  testScheduleChangeFormatting
};

// Run tests if this file is executed directly
if (require.main === module) {
  // Connect to MongoDB (assuming connection is already established)
  console.log('🚀 Starting Communication System Tests...\n');
  
  testScheduleChangeFormatting();
  
  // Uncomment to run full database tests (requires MongoDB connection)
  // testCommunicationSystem().then(() => {
  //   console.log('\n✨ All tests completed!');
  //   process.exit(0);
  // }).catch(error => {
  //   console.error('Test suite failed:', error);
  //   process.exit(1);
  // });
}
