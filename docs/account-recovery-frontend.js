// Account Recovery Frontend Implementation Guide

/**
 * SOBIE Find My Account - Frontend Implementation
 * 
 * This provides a complete frontend implementation for the account recovery system
 * that helps existing SOBIE community members find and access their accounts.
 */

// 1. Account Recovery Landing Page Component
const AccountRecoveryPage = () => {
  const [currentStep, setCurrentStep] = useState('search');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="account-recovery-container">
      <div className="recovery-header">
        <h1>Find Your SOBIE Account</h1>
        <p>Welcome back! Let's help you find your existing SOBIE conference account.</p>
      </div>

      {currentStep === 'search' && (
        <AccountSearchForm 
          onSearchComplete={(results) => {
            setSearchResults(results);
            setCurrentStep('results');
          }}
          loading={loading}
          setLoading={setLoading}
        />
      )}

      {currentStep === 'results' && (
        <SearchResults 
          results={searchResults}
          onSelectAccount={(userId) => setCurrentStep('recover')}
          onNewSearch={() => {
            setCurrentStep('search');
            setSearchResults(null);
          }}
        />
      )}

      {currentStep === 'recover' && (
        <AccountRecoveryForm 
          onComplete={() => setCurrentStep('success')}
        />
      )}

      {currentStep === 'success' && (
        <RecoverySuccess />
      )}
    </div>
  );
};

// 2. Account Search Form Component
const AccountSearchForm = ({ onSearchComplete, loading, setLoading }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    institution: '',
    alternateEmail: ''
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/find-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        onSearchComplete(result.data);
      } else {
        setErrors({ general: result.message });
      }
    } catch (error) {
      setErrors({ general: 'An error occurred while searching. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  return (
    <div className="search-form-container">
      <div className="search-instructions">
        <h2>Search for Your Account</h2>
        <p>Enter any information you remember about your SOBIE account. We'll search our records including historical conference data.</p>
        
        <div className="search-tips">
          <h4>Search Tips:</h4>
          <ul>
            <li>Provide at least one piece of information</li>
            <li>Try different email addresses you may have used</li>
            <li>Include your institution or university name</li>
            <li>Check spelling variations of your name</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="search-form">
        <div className="form-group">
          <label htmlFor="firstName">First Name</label>
          <input
            type="text"
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="Enter your first name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <input
            type="text"
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Enter your last name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter any email you may have used"
          />
        </div>

        <div className="form-group">
          <label htmlFor="institution">Institution/Organization</label>
          <input
            type="text"
            id="institution"
            value={formData.institution}
            onChange={(e) => handleInputChange('institution', e.target.value)}
            placeholder="University, school, or organization"
          />
        </div>

        <div className="form-group">
          <label htmlFor="alternateEmail">Alternate Email</label>
          <input
            type="email"
            id="alternateEmail"
            value={formData.alternateEmail}
            onChange={(e) => handleInputChange('alternateEmail', e.target.value)}
            placeholder="Another email address you may have used"
          />
        </div>

        {errors.general && (
          <div className="error-message">
            {errors.general}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="search-button"
        >
          {loading ? 'Searching...' : 'Find My Account'}
        </button>
      </form>

      <div className="alternative-actions">
        <p>Can't find your information?</p>
        <button 
          onClick={() => window.location.href = '/register'}
          className="secondary-button"
        >
          Create New Account
        </button>
        <button 
          onClick={() => window.location.href = '/contact-support'}
          className="secondary-button"
        >
          Contact Support
        </button>
      </div>
    </div>
  );
};

// 3. Search Results Component
const SearchResults = ({ results, onSelectAccount, onNewSearch }) => {
  const [selectedAccount, setSelectedAccount] = useState(null);

  const renderMatchBadge = (confidence) => {
    const badgeClass = {
      'high': 'badge-high',
      'medium': 'badge-medium', 
      'low': 'badge-low'
    }[confidence];

    return <span className={`confidence-badge ${badgeClass}`}>{confidence} match</span>;
  };

  const renderAccountCard = (match, index) => (
    <div 
      key={index}
      className={`account-card ${selectedAccount?.user.id === match.user.id ? 'selected' : ''}`}
      onClick={() => setSelectedAccount(match)}
    >
      <div className="account-header">
        <h3>{match.user.name.firstName} {match.user.name.lastName}</h3>
        {renderMatchBadge(match.confidence)}
      </div>

      <div className="account-details">
        <p><strong>Email:</strong> {match.user.email}</p>
        {match.user.secondaryEmail && (
          <p><strong>Alt Email:</strong> {match.user.secondaryEmail}</p>
        )}
        {match.user.affiliation?.institution && (
          <p><strong>Institution:</strong> {match.user.affiliation.institution}</p>
        )}
        {match.user.affiliation?.department && (
          <p><strong>Department:</strong> {match.user.affiliation.department}</p>
        )}
        <p><strong>User Type:</strong> {match.user.userType}</p>
        <p><strong>Account Created:</strong> {new Date(match.user.accountCreated).toLocaleDateString()}</p>
        {match.user.isHistoricalData && (
          <p className="historical-badge">📚 Historical Account</p>
        )}
      </div>

      <div className="match-reasons">
        <p><strong>Why this matches:</strong></p>
        <ul>
          {match.matchReasons.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      </div>

      <div className="match-score">
        Match Score: {match.matchScore}%
      </div>
    </div>
  );

  return (
    <div className="search-results-container">
      <div className="results-header">
        <h2>Found {results.totalMatches} Potential Account{results.totalMatches > 1 ? 's' : ''}</h2>
        <button onClick={onNewSearch} className="secondary-button">
          🔍 New Search
        </button>
      </div>

      {results.highConfidenceMatches.length > 0 && (
        <div className="results-section">
          <h3>🎯 High Confidence Matches</h3>
          <p>These accounts closely match your search criteria:</p>
          <div className="account-grid">
            {results.highConfidenceMatches.map(renderAccountCard)}
          </div>
        </div>
      )}

      {results.mediumConfidenceMatches.length > 0 && (
        <div className="results-section">
          <h3>📊 Medium Confidence Matches</h3>
          <p>These accounts partially match your search:</p>
          <div className="account-grid">
            {results.mediumConfidenceMatches.map(renderAccountCard)}
          </div>
        </div>
      )}

      {results.lowConfidenceMatches.length > 0 && (
        <div className="results-section">
          <h3>🔍 Possible Matches</h3>
          <p>These accounts have some similarities:</p>
          <div className="account-grid">
            {results.lowConfidenceMatches.map(renderAccountCard)}
          </div>
        </div>
      )}

      {selectedAccount && (
        <div className="selected-account-actions">
          <div className="selection-confirmation">
            <h3>Is this your account?</h3>
            <div className="selected-summary">
              <p><strong>{selectedAccount.user.name.firstName} {selectedAccount.user.name.lastName}</strong></p>
              <p>{selectedAccount.user.email}</p>
              {selectedAccount.user.affiliation?.institution && (
                <p>{selectedAccount.user.affiliation.institution}</p>
              )}
            </div>
          </div>

          <div className="recovery-options">
            <button 
              onClick={() => onSelectAccount(selectedAccount.user.id)}
              className="primary-button"
            >
              Yes, This Is My Account
            </button>
            <button 
              onClick={() => setSelectedAccount(null)}
              className="secondary-button"
            >
              Not My Account
            </button>
          </div>
        </div>
      )}

      {results.totalMatches === 0 && (
        <div className="no-results">
          <h3>No Accounts Found</h3>
          <p>We couldn't find any accounts matching your search criteria.</p>
          <div className="no-results-actions">
            <button onClick={onNewSearch} className="primary-button">
              Try Different Search
            </button>
            <button 
              onClick={() => window.location.href = '/register'}
              className="secondary-button"
            >
              Create New Account
            </button>
            <button 
              onClick={() => window.location.href = '/contact-support'}
              className="secondary-button"
            >
              Contact Support
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 4. Account Recovery Form Component
const AccountRecoveryForm = ({ selectedAccount, onComplete }) => {
  const [recoveryMethod, setRecoveryMethod] = useState('magic_link');
  const [email, setEmail] = useState(selectedAccount?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRecovery = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/recover-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedAccount.id,
          email: email,
          recoveryMethod: recoveryMethod
        })
      });

      const result = await response.json();

      if (result.success) {
        onComplete(result.data);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('An error occurred during account recovery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recovery-form-container">
      <div className="recovery-header">
        <h2>Recover Your Account</h2>
        <div className="account-summary">
          <p><strong>Account:</strong> {selectedAccount?.name.firstName} {selectedAccount?.name.lastName}</p>
          <p><strong>Email:</strong> {selectedAccount?.email}</p>
          {selectedAccount?.isHistoricalData && (
            <div className="historical-notice">
              <p>📚 This is a historical account created from past SOBIE conference data. After logging in, please review and update your profile information.</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleRecovery} className="recovery-form">
        <div className="recovery-method-selection">
          <h3>Choose Recovery Method</h3>
          
          <div className="method-option">
            <label className="radio-label">
              <input
                type="radio"
                value="magic_link"
                checked={recoveryMethod === 'magic_link'}
                onChange={(e) => setRecoveryMethod(e.target.value)}
              />
              <div className="method-details">
                <h4>🔗 Magic Link (Recommended)</h4>
                <p>Receive a secure link via email to log in without a password</p>
                <ul>
                  <li>No need to remember or create a password</li>
                  <li>Secure one-time access</li>
                  <li>Quick and easy</li>
                </ul>
              </div>
            </label>
          </div>

          <div className="method-option">
            <label className="radio-label">
              <input
                type="radio"
                value="password_reset"
                checked={recoveryMethod === 'password_reset'}
                onChange={(e) => setRecoveryMethod(e.target.value)}
              />
              <div className="method-details">
                <h4>🔑 Password Reset</h4>
                <p>Set a new password for your account</p>
                <ul>
                  <li>Traditional login method</li>
                  <li>Full account control</li>
                  <li>Works for future logins</li>
                </ul>
              </div>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">Confirm Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p className="field-note">
            We'll send the {recoveryMethod === 'magic_link' ? 'magic link' : 'password reset link'} to this email address
          </p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="recovery-button"
        >
          {loading ? 'Sending...' : `Send ${recoveryMethod === 'magic_link' ? 'Magic Link' : 'Password Reset'}`}
        </button>
      </form>
    </div>
  );
};

// 5. Recovery Success Component
const RecoverySuccess = ({ recoveryData }) => {
  return (
    <div className="recovery-success-container">
      <div className="success-header">
        <h2>✅ Recovery Email Sent!</h2>
        <p>We've sent a {recoveryData?.recoveryMethod === 'magic_link' ? 'magic link' : 'password reset link'} to your email address.</p>
      </div>

      <div className="success-details">
        <div className="email-info">
          <p><strong>Email sent to:</strong> {recoveryData?.email}</p>
          <p><strong>Account:</strong> {recoveryData?.userName}</p>
          <p><strong>Expires in:</strong> {recoveryData?.expiresIn}</p>
        </div>

        <div className="next-steps">
          <h3>Next Steps:</h3>
          <ol>
            <li>Check your email inbox (and spam folder)</li>
            <li>Click the link in the email</li>
            <li>{recoveryData?.recoveryMethod === 'magic_link' ? 'You\'ll be automatically logged in' : 'Set your new password'}</li>
            <li>Update your profile information after logging in</li>
          </ol>
        </div>

        {recoveryData?.isHistoricalAccount && (
          <div className="historical-account-notice">
            <h3>📚 Historical Account Notice</h3>
            <p>Your account was created from historical SOBIE conference data. After logging in, please:</p>
            <ul>
              <li>Review and update your contact information</li>
              <li>Add any missing affiliation details</li>
              <li>Set your communication preferences</li>
              <li>Complete your profile for the best conference experience</li>
            </ul>
          </div>
        )}
      </div>

      <div className="success-actions">
        <button 
          onClick={() => window.location.href = '/login'}
          className="primary-button"
        >
          Go to Login Page
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="secondary-button"
        >
          Start Over
        </button>
      </div>
    </div>
  );
};

// 6. CSS Styles for Account Recovery
const accountRecoveryStyles = `
.account-recovery-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.recovery-header {
  text-align: center;
  margin-bottom: 30px;
}

.recovery-header h1 {
  color: #333;
  margin-bottom: 10px;
}

.search-form-container {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.search-instructions {
  margin-bottom: 30px;
}

.search-tips {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  margin-top: 15px;
}

.search-tips ul {
  margin: 10px 0 0 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.search-button {
  background: #007cba;
  color: white;
  padding: 12px 30px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  width: 100%;
}

.search-button:hover {
  background: #005a8b;
}

.search-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alternative-actions {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.secondary-button {
  background: #f8f9fa;
  color: #333;
  padding: 10px 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin: 0 10px;
  cursor: pointer;
}

.account-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.account-card:hover {
  border-color: #007cba;
  box-shadow: 0 2px 8px rgba(0,123,186,0.1);
}

.account-card.selected {
  border-color: #007cba;
  background: #f0f8ff;
}

.account-header {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 15px;
}

.confidence-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.badge-high {
  background: #d4edda;
  color: #155724;
}

.badge-medium {
  background: #fff3cd;
  color: #856404;
}

.badge-low {
  background: #f8d7da;
  color: #721c24;
}

.historical-badge {
  background: #e7f3ff;
  color: #0056b3;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.match-reasons ul {
  margin: 5px 0 0 20px;
}

.selected-account-actions {
  background: #f0f8ff;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
  text-align: center;
}

.primary-button {
  background: #007cba;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin: 0 10px;
}

.primary-button:hover {
  background: #005a8b;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 4px;
  margin: 15px 0;
}

.recovery-form-container {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.method-option {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.method-option:has(input:checked) {
  border-color: #007cba;
  background: #f0f8ff;
}

.radio-label {
  display: flex;
  align-items: flex-start;
  cursor: pointer;
}

.radio-label input[type="radio"] {
  margin-right: 15px;
  margin-top: 5px;
}

.method-details h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.method-details ul {
  margin: 10px 0 0 20px;
  color: #666;
}

.historical-notice {
  background: #e7f3ff;
  padding: 15px;
  border-radius: 5px;
  margin-top: 15px;
}

.recovery-success-container {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  text-align: center;
}

.success-header h2 {
  color: #28a745;
  margin-bottom: 15px;
}

.success-details {
  text-align: left;
  margin: 30px 0;
}

.email-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
}

.next-steps ol {
  margin-left: 20px;
}

.historical-account-notice {
  background: #e7f3ff;
  padding: 20px;
  border-radius: 5px;
  margin-top: 20px;
}

.historical-account-notice ul {
  margin: 10px 0 0 20px;
}
`;

// 7. Integration Instructions
const integrationInstructions = `
INTEGRATION INSTRUCTIONS:

1. Add the Account Recovery route to your main router:
   - Add a route like /find-account that renders the AccountRecoveryPage component

2. Update your login page to include a "Find My Account" link:
   <Link to="/find-account">Can't find your username? Search for your account</Link>

3. Update your registration page:
   - Add a "Find Existing Account" option before the registration form
   - Include the email check functionality to prevent duplicate accounts

4. Add the CSS styles to your main stylesheet or component styles

5. Test the workflow:
   - Search for accounts with various criteria
   - Test both magic link and password reset recovery methods
   - Verify welcome back messages are sent

6. For historical data:
   - Mark imported accounts with isHistoricalData: true
   - Set appropriate historicalDataSource values
   - Include historicalDataNotes for context

API Endpoints used:
- GET /api/auth/recovery-info - Recovery instructions
- POST /api/auth/find-account - Search for accounts  
- POST /api/auth/check-email - Check if email exists
- POST /api/auth/recover-account - Request account recovery
- POST /api/auth/magic-link - Request magic link
- POST /api/auth/forgot-password - Request password reset
`;

export {
  AccountRecoveryPage,
  AccountSearchForm,
  SearchResults,
  AccountRecoveryForm,
  RecoverySuccess,
  accountRecoveryStyles,
  integrationInstructions
};
