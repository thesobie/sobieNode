// Test the draft program builder functionality without database
console.log('🧪 Testing Draft Program Builder Logic\n');

// Mock submission data representing different review states
const mockSubmissions = [
  // Accepted papers
  {
    _id: '1',
    title: 'Accepted Finance Paper',
    status: 'accepted',
    discipline: 'finance',
    keywords: ['blockchain', 'fintech'],
    abstract: 'This is an accepted paper about blockchain in finance.',
    acceptanceProbability: 1.0 // Already accepted
  },
  
  // Under review with good scores
  {
    _id: '2',
    title: 'Under Review High Score Paper',
    status: 'under_review',
    discipline: 'analytics',
    keywords: ['machine learning', 'data science'],
    abstract: 'This paper has high review scores.',
    reviewWorkflow: {
      reviewers: [
        {
          status: 'completed',
          review: {
            overallScore: 4,
            recommendation: 'accept'
          }
        },
        {
          status: 'completed', 
          review: {
            overallScore: 5,
            recommendation: 'strong_accept'
          }
        }
      ]
    }
  },
  
  // Under review with medium scores
  {
    _id: '3',
    title: 'Under Review Medium Score Paper',
    status: 'under_review',
    discipline: 'management',
    keywords: ['leadership', 'organizational behavior'],
    abstract: 'This paper has medium review scores.',
    reviewWorkflow: {
      reviewers: [
        {
          status: 'completed',
          review: {
            overallScore: 3,
            recommendation: 'minor_revision'
          }
        }
      ]
    }
  },
  
  // Pending revision (lower probability)
  {
    _id: '4',
    title: 'Pending Revision Paper',
    status: 'pending_revision',
    discipline: 'pedagogy',
    keywords: ['online learning', 'education'],
    abstract: 'This paper needs revisions.',
    reviewWorkflow: {
      reviewers: [
        {
          status: 'completed',
          review: {
            overallScore: 2,
            recommendation: 'major_revision'
          }
        }
      ]
    }
  },
  
  // Recently revised (higher probability)
  {
    _id: '5',
    title: 'Recently Revised Paper',
    status: 'revised',
    discipline: 'accounting',
    keywords: ['sustainability', 'reporting'],
    abstract: 'This paper was recently revised.',
    reviewWorkflow: {
      reviewers: [
        {
          status: 'completed',
          review: {
            overallScore: 4,
            recommendation: 'accept'
          }
        }
      ]
    }
  },
  
  // No reviews yet
  {
    _id: '6',
    title: 'No Reviews Yet Paper',
    status: 'under_review',
    discipline: 'finance',
    keywords: ['cryptocurrency', 'regulation', 'blockchain', 'fintech'],
    abstract: 'This paper has no completed reviews yet but has good quality indicators like multiple keywords and a detailed abstract.',
    reviewWorkflow: {
      reviewers: [
        {
          status: 'assigned'
        }
      ]
    }
  }
];

// Helper function to calculate acceptance probability (from our controller)
function calculateAcceptanceProbability(submission) {
  if (!submission.reviewWorkflow || !submission.reviewWorkflow.reviewers) {
    return 0.3; // Default low probability if no review data
  }

  const completedReviews = submission.reviewWorkflow.reviewers.filter(
    reviewer => reviewer.status === 'completed' && reviewer.review
  );

  if (completedReviews.length === 0) {
    // No completed reviews yet, base on submission quality indicators
    const hasKeywords = submission.keywords && submission.keywords.length > 3;
    const hasLongAbstract = submission.abstract && submission.abstract.length > 200;
    const hasCoAuthors = submission.coAuthors && submission.coAuthors.length > 0;
    
    let baseScore = 0.4;
    if (hasKeywords) baseScore += 0.1;
    if (hasLongAbstract) baseScore += 0.1;
    if (hasCoAuthors) baseScore += 0.1;
    
    return Math.min(baseScore, 0.7); // Cap at 70% without actual reviews
  }

  // Calculate based on completed reviews
  let totalScore = 0;
  let recommendationScore = 0;
  let reviewCount = completedReviews.length;

  completedReviews.forEach(reviewer => {
    const review = reviewer.review;
    
    // Use overall score (typically 1-5 scale)
    if (review.overallScore) {
      totalScore += review.overallScore;
    }
    
    // Factor in recommendation
    if (review.recommendation) {
      switch (review.recommendation.toLowerCase()) {
        case 'accept':
        case 'strong_accept':
          recommendationScore += 1.0;
          break;
        case 'minor_revision':
          recommendationScore += 0.8;
          break;
        case 'major_revision':
          recommendationScore += 0.5;
          break;
        case 'reject':
        case 'strong_reject':
          recommendationScore += 0.1;
          break;
        default:
          recommendationScore += 0.4;
      }
    }
  });

  // Calculate average scores
  const avgScore = totalScore / reviewCount;
  const avgRecommendation = recommendationScore / reviewCount;
  
  // Convert to probability (assuming 5-point scale)
  let scoreProbability = (avgScore - 1) / 4; // Convert 1-5 to 0-1
  
  // Combine score and recommendation (weighted)
  const finalProbability = (scoreProbability * 0.6) + (avgRecommendation * 0.4);
  
  // Factor in revision status
  if (submission.status === 'pending_revision') {
    return Math.max(finalProbability * 0.8, 0.1); // Slightly lower for revisions needed
  } else if (submission.status === 'revised') {
    return Math.min(finalProbability * 1.1, 0.9); // Slightly higher for submitted revisions
  }
  
  return Math.max(Math.min(finalProbability, 0.95), 0.05); // Clamp between 5% and 95%
}

// Function to simulate the dashboard categorization logic
function categorizeSubmissions(submissions, confidenceLevel = 'medium') {
  const results = {
    confirmed: [],
    likely: [],
    uncertain: [],
    statistics: {
      totalSubmissions: submissions.length,
      confirmedCount: 0,
      likelyCount: 0,
      uncertainCount: 0
    }
  };

  submissions.forEach(submission => {
    if (submission.status === 'accepted') {
      submission.acceptanceProbability = 1.0;
      submission.confidenceLevel = 'confirmed';
      results.confirmed.push(submission);
      results.statistics.confirmedCount++;
    } else {
      const probability = calculateAcceptanceProbability(submission);
      submission.acceptanceProbability = probability;
      
      // Determine confidence level thresholds
      let highThreshold = 0.7;
      let mediumThreshold = 0.4;
      
      if (confidenceLevel === 'conservative') {
        highThreshold = 0.8;
        mediumThreshold = 0.6;
      } else if (confidenceLevel === 'high') {
        highThreshold = 0.5;
        mediumThreshold = 0.2;
      }
      
      if (probability >= highThreshold) {
        submission.confidenceLevel = 'likely';
        results.likely.push(submission);
        results.statistics.likelyCount++;
      } else if (probability >= mediumThreshold) {
        submission.confidenceLevel = 'uncertain';
        results.uncertain.push(submission);
        results.statistics.uncertainCount++;
      }
      // Below medium threshold papers are excluded from planning
    }
  });

  return results;
}

// Test different confidence levels
console.log('📊 Testing Acceptance Probability Calculations:');
console.log('════════════════════════════════════════════\n');

mockSubmissions.forEach((submission, index) => {
  const probability = submission.status === 'accepted' ? 1.0 : calculateAcceptanceProbability(submission);
  console.log(`${index + 1}. ${submission.title}`);
  console.log(`   Status: ${submission.status}`);
  console.log(`   Acceptance Probability: ${(probability * 100).toFixed(1)}%`);
  if (submission.reviewWorkflow) {
    const completedReviews = submission.reviewWorkflow.reviewers.filter(r => r.status === 'completed');
    console.log(`   Completed Reviews: ${completedReviews.length}`);
    if (completedReviews.length > 0) {
      const avgScore = completedReviews.reduce((sum, r) => sum + (r.review?.overallScore || 0), 0) / completedReviews.length;
      console.log(`   Average Review Score: ${avgScore.toFixed(1)}/5`);
    }
  }
  console.log('');
});

console.log('\n📋 Testing Draft Program Building with Different Confidence Levels:');
console.log('═══════════════════════════════════════════════════════════════════\n');

const confidenceLevels = ['conservative', 'medium', 'high'];
confidenceLevels.forEach(level => {
  console.log(`🎯 ${level.toUpperCase()} Confidence Level:`);
  const results = categorizeSubmissions(mockSubmissions, level);
  
  console.log(`   📊 Statistics:`);
  console.log(`      Total Submissions: ${results.statistics.totalSubmissions}`);
  console.log(`      Confirmed (accepted): ${results.statistics.confirmedCount}`);
  console.log(`      Likely to be accepted: ${results.statistics.likelyCount}`);
  console.log(`      Uncertain but possible: ${results.statistics.uncertainCount}`);
  console.log(`      Total for planning: ${results.statistics.confirmedCount + results.statistics.likelyCount + results.statistics.uncertainCount}`);
  
  console.log(`   📝 Papers included in draft program:`);
  [...results.confirmed, ...results.likely, ...results.uncertain].forEach(paper => {
    console.log(`      • ${paper.title} (${(paper.acceptanceProbability * 100).toFixed(1)}% - ${paper.confidenceLevel})`);
  });
  console.log('');
});

console.log('✅ Draft Program Builder Logic Test Complete!\n');
console.log('📊 Key Features Demonstrated:');
console.log('• Acceptance probability calculation based on review scores and recommendations');
console.log('• Quality indicators used when no reviews are available');
console.log('• Different confidence levels for risk management');
console.log('• Proper categorization of submissions for draft program planning');
console.log('• Statistics showing planning capacity at different confidence levels');
console.log('\n🎯 This enables conference organizers to:');
console.log('• Start building the program before final acceptance decisions');
console.log('• Plan conservatively or optimistically based on their risk tolerance');
console.log('• See which papers are most likely to be accepted');
console.log('• Allocate session slots efficiently with confidence indicators');
