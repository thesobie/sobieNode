const User = require('../models/User');
const userService = require('./userService');

const login = async (email, password) => {
  // Find user by email (including password field for comparison)
  const user = await User.findOne({ email, isActive: true }).select('+password');
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  // For now, we'll do a simple password comparison
  // In production, you would use bcrypt to compare hashed passwords
  if (user.password !== password) {
    throw new Error('Invalid credentials');
  }
  
  // Update last login
  await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
  
  // Remove password from response
  const userResponse = user.toJSON();
  
  return {
    user: userResponse,
    token: 'fake-jwt-token-here' // You'll replace this with real JWT
  };
};

const register = async (userData) => {
  const { email, password, name, userType, studentLevel, affiliation } = userData;
  
  if (!email || !password || !name?.firstName || !name?.lastName || !userType || !affiliation?.organization) {
    throw new Error('Please provide all required fields: email, password, name (first and last), user type, and organization');
  }
  
  if (userType === 'student' && !studentLevel) {
    throw new Error('Student level is required for student users');
  }
  
  // Check if user already exists
  const existingUser = await userService.getUserByEmail(email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  
  // Create new user
  const newUser = await userService.createUser(userData);
  
  return {
    user: newUser,
    token: 'fake-jwt-token-here' // You'll replace this with real JWT
  };
};

module.exports = {
  login,
  register
};
