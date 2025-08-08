const User = require('../models/User');

const getAllUsers = async () => {
  const users = await User.find({ isActive: true })
    .select('-password')
    .sort({ createdAt: -1 });
  return users;
};

const getUserById = async (id) => {
  const user = await User.findById(id).select('-password');
  return user;
};

const createUser = async (userData) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const user = await User.create(userData);
  return user;
};

const updateUser = async (id, userData) => {
  // Remove fields that shouldn't be updated via this method
  const { password, ...updateData } = userData;
  
  const user = await User.findByIdAndUpdate(
    id,
    updateData,
    { 
      new: true, // Return updated document
      runValidators: true // Run schema validators
    }
  ).select('-password');
  
  return user;
};

const deleteUser = async (id) => {
  // Soft delete - set isActive to false instead of removing from database
  const user = await User.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  ).select('-password');
  
  return user;
};

const getUserByEmail = async (email) => {
  const user = await User.findOne({ email, isActive: true });
  return user;
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserByEmail
};
