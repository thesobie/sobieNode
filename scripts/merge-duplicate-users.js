const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

/**
 * SOBIE Historical User Duplicate Detection and Merging System
 * 
 * This system identifies duplicate users across conference years and merges them
 * into single records with complete multi-year attendance history.
 */

class SOBIEDuplicateMerger {
  constructor() {
    this.mergeStats = {
      duplicateGroupsFound: 0,
      duplicateUsersFound: 0,
      mergedUsers: 0,
      deletedDuplicates: 0,
      errors: []
    };
  }

  /**
   * Main method to find and merge duplicate users
   */
  async findAndMergeDuplicates() {
    try {
      console.log('🚀 Starting SOBIE Duplicate User Detection and Merge');
      console.log('='.repeat(60));

      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Database connected successfully');

      // Find exact duplicate groups (same name + organization)
      const duplicateGroups = await this.findExactDuplicates();
      
      if (duplicateGroups.length === 0) {
        console.log('✅ No duplicates found! All users are unique.');
        return this.mergeStats;
      }

      console.log(`\n📊 Found ${duplicateGroups.length} duplicate groups affecting ${this.calculateTotalDuplicates(duplicateGroups)} users`);
      
      // Process each duplicate group
      for (const group of duplicateGroups) {
        await this.mergeDuplicateGroup(group);
      }

      // Verify results
      await this.verifyMergeResults();

      console.log('\n✅ Duplicate Detection and Merge Complete!');
      this.displayMergeStats();

      await mongoose.disconnect();
      return this.mergeStats;

    } catch (error) {
      console.error('❌ Duplicate merge failed:', error);
      this.mergeStats.errors.push(`System error: ${error.message}`);
      return this.mergeStats;
    }
  }

  /**
   * Find exact duplicates (same name + organization)
   */
  async findExactDuplicates() {
    const duplicateGroups = await User.aggregate([
      { $match: { isHistoricalData: true } },
      {
        $group: {
          _id: {
            firstName: { $trim: { input: '$name.firstName' } },
            lastName: { $trim: { input: '$name.lastName' } },
            organization: { $trim: { input: '$affiliation.organization' } }
          },
          users: { 
            $push: { 
              id: '$_id', 
              email: '$email', 
              historicalDataNotes: '$historicalDataNotes',
              sobieHistory: '$sobieHistory',
              createdAt: '$createdAt'
            } 
          },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);

    this.mergeStats.duplicateGroupsFound = duplicateGroups.length;
    this.mergeStats.duplicateUsersFound = this.calculateTotalDuplicates(duplicateGroups);
    
    return duplicateGroups;
  }

  /**
   * Merge a group of duplicate users into a single consolidated record
   */
  async mergeDuplicateGroup(group) {
    try {
      const { firstName, lastName, organization } = group._id;
      const users = group.users;
      
      console.log(`\n🔄 Merging: ${firstName} ${lastName} at ${organization} (${users.length} duplicates)`);
      
      // Find the primary user (oldest record or most complete)
      const primaryUser = await this.selectPrimaryUser(users);
      const duplicateUsers = users.filter(u => u.id.toString() !== primaryUser.id.toString());
      
      console.log(`   📌 Primary record: ${this.extractYear(primaryUser.historicalDataNotes)}`);
      console.log(`   🔀 Merging ${duplicateUsers.length} duplicates`);
      
      // Merge attendance history from all duplicates
      const consolidatedAttendance = await this.consolidateAttendanceHistory(primaryUser, duplicateUsers);
      
      // Update primary user with consolidated data
      await this.updatePrimaryUser(primaryUser.id, consolidatedAttendance);
      
      // Delete duplicate records
      await this.deleteDuplicateUsers(duplicateUsers);
      
      this.mergeStats.mergedUsers++;
      this.mergeStats.deletedDuplicates += duplicateUsers.length;
      
      console.log(`   ✅ Merged into single record with ${consolidatedAttendance.length} conference years`);
      
    } catch (error) {
      const errorMsg = `Failed to merge group ${group._id.firstName} ${group._id.lastName}: ${error.message}`;
      console.error(`   ❌ ${errorMsg}`);
      this.mergeStats.errors.push(errorMsg);
    }
  }

  /**
   * Select the primary user from duplicates (prefer oldest or most complete record)
   */
  async selectPrimaryUser(users) {
    // Get full user documents
    const userIds = users.map(u => u.id);
    const fullUsers = await User.find({ _id: { $in: userIds } });
    
    // Prefer user with most complete profile or oldest record
    return fullUsers.reduce((primary, current) => {
      const primaryScore = this.calculateCompletenessScore(primary);
      const currentScore = this.calculateCompletenessScore(current);
      
      if (currentScore > primaryScore) return current;
      if (currentScore === primaryScore && current.createdAt < primary.createdAt) return current;
      return primary;
    });
  }

  /**
   * Calculate completeness score for user selection
   */
  calculateCompletenessScore(user) {
    let score = 0;
    if (user.affiliation?.department) score += 1;
    if (user.affiliation?.position) score += 1;
    if (user.profile?.bio) score += 1;
    if (user.sobieHistory?.attendance?.length > 0) score += 2;
    return score;
  }

  /**
   * Consolidate attendance history from all duplicate users
   */
  async consolidateAttendanceHistory(primaryUser, duplicateUsers) {
    const attendanceMap = new Map();
    
    // Add primary user's attendance
    if (primaryUser.sobieHistory?.attendance) {
      primaryUser.sobieHistory.attendance.forEach(record => {
        attendanceMap.set(record.year, record);
      });
    } else {
      // Extract from historical notes if no sobieHistory
      const year = this.extractYear(primaryUser.historicalDataNotes);
      if (year) {
        attendanceMap.set(year, { year, role: 'attendee', sessionsAttended: [] });
      }
    }
    
    // Get full documents for duplicates and merge their attendance
    const duplicateIds = duplicateUsers.map(u => u.id);
    const fullDuplicates = await User.find({ _id: { $in: duplicateIds } });
    
    fullDuplicates.forEach(user => {
      if (user.sobieHistory?.attendance) {
        user.sobieHistory.attendance.forEach(record => {
          if (!attendanceMap.has(record.year)) {
            attendanceMap.set(record.year, record);
          }
        });
      } else {
        // Extract from historical notes
        const year = this.extractYear(user.historicalDataNotes);
        if (year && !attendanceMap.has(year)) {
          attendanceMap.set(year, { year, role: 'attendee', sessionsAttended: [] });
        }
      }
    });
    
    // Convert to sorted array
    return Array.from(attendanceMap.values()).sort((a, b) => a.year - b.year);
  }

  /**
   * Update primary user with consolidated data
   */
  async updatePrimaryUser(userId, consolidatedAttendance) {
    const years = consolidatedAttendance.map(a => a.year).join(', ');
    
    await User.findByIdAndUpdate(userId, {
      'sobieHistory.attendance': consolidatedAttendance,
      historicalDataNotes: `Consolidated record from SOBIE conferences: ${years}. Originally from PDF parsing, merged duplicate records.`,
      lastMergeDate: new Date()
    });
  }

  /**
   * Delete duplicate user records
   */
  async deleteDuplicateUsers(duplicateUsers) {
    const duplicateIds = duplicateUsers.map(u => u.id);
    await User.deleteMany({ _id: { $in: duplicateIds } });
  }

  /**
   * Extract year from historical data notes
   */
  extractYear(notes) {
    const match = notes?.match(/SOBIE (\d{4})/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Calculate total number of duplicate users
   */
  calculateTotalDuplicates(duplicateGroups) {
    return duplicateGroups.reduce((total, group) => total + group.count, 0);
  }

  /**
   * Verify merge results
   */
  async verifyMergeResults() {
    console.log('\n🔍 Verifying merge results...');
    
    const totalUsers = await User.countDocuments({ isHistoricalData: true });
    const usersWithMultiYearHistory = await User.countDocuments({
      isHistoricalData: true,
      'sobieHistory.attendance.1': { $exists: true } // Has at least 2 attendance records
    });
    
    console.log(`   📊 Total users after merge: ${totalUsers}`);
    console.log(`   📅 Users with multi-year history: ${usersWithMultiYearHistory}`);
    
    // Sample merged user
    const sampleMergedUser = await User.findOne({
      isHistoricalData: true,
      'sobieHistory.attendance.1': { $exists: true }
    });
    
    if (sampleMergedUser) {
      const years = sampleMergedUser.sobieHistory.attendance.map(a => a.year);
      console.log(`   ✅ Sample merged user: ${sampleMergedUser.name.firstName} ${sampleMergedUser.name.lastName}`);
      console.log(`   📅 Attended: ${years.join(', ')} (${years.length} years)`);
    }
  }

  /**
   * Display merge statistics
   */
  displayMergeStats() {
    console.log('\n📊 Merge Statistics:');
    console.log('='.repeat(40));
    console.log(`   Duplicate groups found: ${this.mergeStats.duplicateGroupsFound}`);
    console.log(`   Total duplicate users: ${this.mergeStats.duplicateUsersFound}`);
    console.log(`   Users merged: ${this.mergeStats.mergedUsers}`);
    console.log(`   Duplicate records deleted: ${this.mergeStats.deletedDuplicates}`);
    console.log(`   Net user reduction: ${this.mergeStats.deletedDuplicates}`);
    
    if (this.mergeStats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${this.mergeStats.errors.length}`);
      this.mergeStats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
  }
}

// Run the duplicate merger if this file is executed directly
async function runDuplicateMerger() {
  const merger = new SOBIEDuplicateMerger();
  const stats = await merger.findAndMergeDuplicates();
  
  console.log('\n🎉 Duplicate merge process completed!');
  console.log(`Final result: Reduced database by ${stats.deletedDuplicates} duplicate records`);
  
  return stats;
}

if (require.main === module) {
  runDuplicateMerger();
}

module.exports = { SOBIEDuplicateMerger, runDuplicateMerger };
