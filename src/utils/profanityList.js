/**
 * Basic profanity word list for content moderation
 * This is a minimal list - in production, you'd want a more comprehensive list
 * or use a professional content moderation service like AWS Comprehend, 
 * Microsoft Content Moderator, or Google Cloud Natural Language API
 */

module.exports = [
  // Basic profanity (minimal set for demonstration)
  'damn', 'hell', 'crap', 'shit', 'fuck', 'bitch', 'ass', 'bastard',
  
  // Academic-inappropriate terms
  'stupid', 'idiot', 'moron', 'dumb', 'retard',
  
  // Spam-related terms
  'viagra', 'casino', 'lottery', 'free money', 'click here',
  
  // Add more terms as needed...
  // Note: In production, consider using a more sophisticated solution
];
