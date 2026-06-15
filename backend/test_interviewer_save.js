require('dotenv').config();
const mongoose = require('mongoose');
const Interviewer = require('./models/Interviewer');
const User = require('./models/User');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai_interview_system');
  console.log('Connected to MongoDB');
  const interviewers = await Interviewer.find().populate('userId', 'name email user_role');
  console.log('Total interviewers found:', interviewers.length);
  for (const intv of interviewers) {
    console.log('Interviewer Profile ID:', intv._id);
    console.log('User Details:', intv.userId);
    console.log('Hourly Rate:', intv.hourlyRate);
    console.log('Is Accepting Bookings:', intv.isAcceptingBookings);
    console.log('Domains:', intv.domains);
    console.log('Skills:', intv.skills);
    console.log('Roles:', intv.roles);
    console.log('Bio:', intv.bio);
    console.log('Linkedin:', intv.linkedinUrl);
    console.log('------------------------------------');
  }
  await mongoose.disconnect();
}

test().catch(console.error);
