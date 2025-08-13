const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const ResearchPresentation = require('./src/models/ResearchPresentation');
const User = require('./src/models/User');

const linkUsersToResearch = async () => {
  try {
    console.log('🔗 Linking Users to Their Research Presentations');
    console.log('=' .repeat(60));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all unlinked presentations
    const unlinkedPresentations = await ResearchPresentation.find({
      conferenceYear: 2025,
      'authors.name.firstName': { $exists: true },
      'authors.userId': { $exists: false }
    });

    console.log(`📊 Found ${unlinkedPresentations.length} presentations needing user linking`);

    let totalLinked = 0;
    let totalAuthors = 0;
    let exactMatches = 0;
    let fuzzyMatches = 0;
    let noMatches = 0;

    for (const presentation of unlinkedPresentations) {
      console.log(`\n📄 Processing: "${presentation.title.substring(0, 50)}..."`);
      
      let presentationUpdated = false;
      const updatedAuthors = [];

      for (let i = 0; i < presentation.authors.length; i++) {
        const author = presentation.authors[i];
        totalAuthors++;

        if (!author.name?.firstName || !author.name?.lastName) {
          console.log(`   ⚠️  Skipping author with incomplete name data`);
          updatedAuthors.push(author);
          continue;
        }

        const authorName = `${author.name.firstName} ${author.name.lastName}`;
        console.log(`   🔍 Searching for: ${authorName} at ${author.affiliation?.institution || 'Unknown'}`);

        // Try exact name match first
        let matchedUser = await User.findOne({
          'name.firstName': author.name.firstName,
          'name.lastName': author.name.lastName
        });

        if (matchedUser) {
          console.log(`   ✅ Exact match found: ${matchedUser.email}`);
          exactMatches++;
        } else {
          // Try case-insensitive match
          matchedUser = await User.findOne({
            'name.firstName': new RegExp(`^${author.name.firstName}$`, 'i'),
            'name.lastName': new RegExp(`^${author.name.lastName}$`, 'i')
          });

          if (matchedUser) {
            console.log(`   ✅ Case-insensitive match found: ${matchedUser.email}`);
            fuzzyMatches++;
          } else {
            // Try partial name match (in case of middle names, etc.)
            matchedUser = await User.findOne({
              $or: [
                {
                  'name.firstName': new RegExp(author.name.firstName, 'i'),
                  'name.lastName': new RegExp(author.name.lastName, 'i')
                },
                {
                  email: new RegExp(`${author.name.firstName.toLowerCase()}.${author.name.lastName.toLowerCase()}`, 'i')
                }
              ]
            });

            if (matchedUser) {
              console.log(`   ✅ Partial match found: ${matchedUser.email}`);
              fuzzyMatches++;
            } else {
              console.log(`   ❌ No user match found for ${authorName}`);
              noMatches++;
            }
          }
        }

        // Update author with user link
        const updatedAuthor = { ...author.toObject() };
        if (matchedUser) {
          updatedAuthor.userId = matchedUser._id;
          presentationUpdated = true;
        }
        updatedAuthors.push(updatedAuthor);
      }

      // Save updated presentation if any authors were linked
      if (presentationUpdated) {
        try {
          await ResearchPresentation.findByIdAndUpdate(
            presentation._id,
            { authors: updatedAuthors },
            { new: true }
          );
          totalLinked++;
          console.log(`   ✅ Presentation updated with user links`);
        } catch (error) {
          console.log(`   ❌ Error updating presentation: ${error.message}`);
        }
      }
    }

    // Final statistics
    console.log('\n📊 LINKING RESULTS');
    console.log('=' .repeat(60));
    console.log(`Total Presentations Processed: ${unlinkedPresentations.length}`);
    console.log(`Total Presentations Updated: ${totalLinked}`);
    console.log(`Total Authors Processed: ${totalAuthors}`);
    console.log(`Exact Name Matches: ${exactMatches}`);
    console.log(`Fuzzy Name Matches: ${fuzzyMatches}`);
    console.log(`No Matches Found: ${noMatches}`);

    // Verify final linking status
    console.log('\n🔍 VERIFICATION');
    console.log('-'.repeat(40));

    const allPresentations = await ResearchPresentation.countDocuments({ conferenceYear: 2025 });
    const linkedPresentations = await ResearchPresentation.countDocuments({
      conferenceYear: 2025,
      'authors.userId': { $exists: true, $ne: null }
    });

    const linkingPercentage = Math.round((linkedPresentations / allPresentations) * 100);
    console.log(`Final Linking Status: ${linkingPercentage}% (${linkedPresentations}/${allPresentations})`);

    // Show remaining unlinked presentations
    if (linkedPresentations < allPresentations) {
      const remainingUnlinked = await ResearchPresentation.find({
        conferenceYear: 2025,
        'authors.userId': { $exists: false }
      }).limit(5);

      console.log('\n⚠️  Sample Remaining Unlinked Presentations:');
      remainingUnlinked.forEach((pres, index) => {
        console.log(`${index + 1}. "${pres.title.substring(0, 60)}..."`);
        pres.authors.forEach(author => {
          if (author.name?.firstName && author.name?.lastName) {
            console.log(`   - ${author.name.firstName} ${author.name.lastName} (${author.affiliation?.institution || 'Unknown'})`);
          }
        });
      });
    }

    console.log('\n🎉 User-Research Linking Complete!');

  } catch (error) {
    console.error('❌ Error linking users to research:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

linkUsersToResearch();
