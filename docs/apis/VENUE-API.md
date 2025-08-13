# San Destin Resort & Venue API

## Overview

The Venue API handles all San Destin resort-related functionality for SOBIE Conference attendees, including accommodation preferences, discount code management, and resort information distribution.

## Key Features

### 🏖️ **San Destin Resort Integration**
- **Consistent Venue**: All SOBIE conferences are held at Sandestin Golf and Beach Resort
- **Comprehensive Information**: Resort amenities, accommodation types, transportation
- **Booking Support**: Group codes, reservation assistance, deadline tracking

### 🎟️ **Dynamic Discount Code System**
- **Group Rate Codes**: Base SOBIE conference discount (15% off standard rates)
- **Early Bird Discounts**: Additional savings for advance bookings (10% extra)
- **Student Rates**: Special pricing for student attendees (5% extra)
- **Automatic Eligibility**: Codes generated based on registration status and timeline

### 🏨 **Accommodation Management**
- **Preference Tracking**: On-resort vs off-resort accommodation choices
- **Room Type Selection**: Hotel rooms, condos, vacation rentals
- **Special Requests**: Accessibility needs, room preferences
- **Booking Confirmation**: Track reservation details and guest counts

### 📧 **Automated Communications**
- **Resort Information Emails**: Comprehensive resort details with discount codes
- **Registration Integration**: Resort info included in confirmation emails
- **Deadline Reminders**: Booking deadline notifications

## API Endpoints

### Get San Destin Information

```http
GET /api/venue/san-destin/:conferenceId
```

**Description**: Retrieve comprehensive San Destin resort information and available discount codes for a specific conference.

**Authentication**: Required (JWT token)

**Path Parameters**:
- `conferenceId` (string, required): MongoDB ObjectId of the conference

**Response**:
```json
{
  "success": true,
  "data": {
    "venue": {
      "name": "Sandestin Golf and Beach Resort",
      "location": {
        "address": "9300 Emerald Coast Pkwy W",
        "city": "Miramar Beach",
        "state": "FL",
        "zipCode": "32550",
        "country": "USA"
      },
      "description": "Premier destination resort offering luxury accommodations...",
      "amenities": [
        "Four championship golf courses",
        "Tennis courts and fitness facilities",
        "Multiple swimming pools and beach access",
        "Spa and wellness services"
      ],
      "accommodationTypes": [
        {
          "type": "Hotel Rooms",
          "description": "Comfortable hotel-style accommodations",
          "features": ["Daily housekeeping", "Resort amenities access"]
        }
      ],
      "transportationInfo": {
        "airport": "Destin-Fort Walton Beach Airport (VPS) - 15 minutes",
        "shuttleService": "Resort shuttle available from airport",
        "parking": "Complimentary self-parking",
        "localTransportation": "Resort trolley service"
      },
      "bookingInfo": {
        "reservationWebsite": "https://www.sandestin.com",
        "reservationPhone": "1-800-277-0800",
        "groupCode": "SOBIE2024",
        "bookingInstructions": "Mention SOBIE Conference when booking"
      }
    },
    "discountCodes": [
      {
        "code": "SOBIE2024",
        "type": "group_rate",
        "description": "SOBIE Conference group rate",
        "discount": "15% off standard room rates",
        "validFrom": "2024-01-01T00:00:00.000Z",
        "validUntil": "2024-06-15T00:00:00.000Z",
        "terms": [
          "Valid for conference dates and 2 days before/after",
          "Subject to availability",
          "Cannot be combined with other offers"
        ],
        "bookingInstructions": "Use code when booking online"
      }
    ],
    "registration": {
      "id": "507f1f77bcf86cd799439011",
      "status": "confirmed",
      "registrationDate": "2024-03-15T10:00:00.000Z",
      "accommodationPreference": {
        "type": "on-resort",
        "roomType": "hotel",
        "discountCodeUsed": true
      }
    },
    "bookingDeadlines": {
      "groupRateDeadline": "2024-05-15T00:00:00.000Z",
      "resortBookingDeadline": "2024-06-01T00:00:00.000Z",
      "cancellationDeadline": "2024-06-08T00:00:00.000Z",
      "conferenceStart": "2024-06-15T00:00:00.000Z",
      "conferenceEnd": "2024-06-18T00:00:00.000Z"
    }
  }
}
```

### Update Accommodation Preference

```http
PUT /api/venue/accommodation-preference
```

**Description**: Update user's accommodation preferences and booking details.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "registrationId": "507f1f77bcf86cd799439011",
  "accommodationType": "on-resort",
  "roomType": "condo",
  "specialRequests": "Ground floor room preferred due to mobility needs",
  "discountCodeUsed": true,
  "bookingConfirmation": {
    "confirmationNumber": "SAN12345",
    "bookingDate": "2024-03-20T10:00:00.000Z",
    "checkInDate": "2024-06-14T15:00:00.000Z",
    "checkOutDate": "2024-06-19T11:00:00.000Z",
    "guestsCount": 2
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Accommodation preferences updated successfully",
  "data": {
    "accommodationPreference": {
      "type": "on-resort",
      "roomType": "condo",
      "specialRequests": "Ground floor room preferred",
      "discountCodeUsed": true,
      "updatedAt": "2024-03-20T10:30:00.000Z"
    }
  }
}
```

### Send Resort Information Email

```http
POST /api/venue/send-resort-info
```

**Description**: Send comprehensive resort information email with discount codes to a registered attendee.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "registrationId": "507f1f77bcf86cd799439011"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Resort information email sent successfully"
}
```

### Get Venue Statistics (Admin)

```http
GET /api/venue/admin/statistics/:conferenceId
```

**Description**: Retrieve accommodation statistics for conference planning and logistics.

**Authentication**: Required (Admin role)

**Path Parameters**:
- `conferenceId` (string, required): MongoDB ObjectId of the conference

**Response**:
```json
{
  "success": true,
  "data": {
    "totalRegistrations": 247,
    "onResort": 189,
    "offResort": 34,
    "undecided": 24,
    "discountCodeUsage": {
      "groupRate": 201,
      "earlyBird": 56,
      "student": 23,
      "none": 46
    },
    "accommodationTypes": {
      "hotel": 142,
      "condo": 38,
      "vacation_rental": 9,
      "unspecified": 58
    },
    "specialRequests": [
      {
        "registrationId": "507f1f77bcf86cd799439012",
        "request": "Wheelchair accessible room required"
      }
    ]
  }
}
```

## Data Models

### Accommodation Preference Schema

```javascript
accommodationPreference: {
  type: {
    type: String,
    enum: ['on-resort', 'off-resort', 'undecided'],
    default: 'undecided'
  },
  roomType: {
    type: String,
    enum: ['hotel', 'condo', 'vacation_rental', 'unspecified'],
    default: 'unspecified'
  },
  specialRequests: {
    type: String,
    maxlength: 500
  },
  discountCodeUsed: {
    type: Boolean,
    default: false
  },
  discountCodesApplied: [{
    code: String,
    type: {
      type: String,
      enum: ['group_rate', 'early_bird', 'student']
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  bookingConfirmation: {
    confirmationNumber: String,
    bookingDate: Date,
    checkInDate: Date,
    checkOutDate: Date,
    guestsCount: {
      type: Number,
      min: 1,
      default: 1
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

### Discount Code Types

#### Group Rate Code
- **Code Format**: `SOBIE{YEAR}` (e.g., `SOBIE2024`)
- **Discount**: 15% off standard room rates
- **Eligibility**: All confirmed conference registrants
- **Validity**: From registration open until conference start date

#### Early Bird Code
- **Code Format**: `SOBIE{YEAR}EARLY` (e.g., `SOBIE2024EARLY`)
- **Discount**: Additional 10% off group rate
- **Eligibility**: Bookings made 60+ days before conference
- **Validity**: From registration open until 60 days before conference

#### Student Code
- **Code Format**: `SOBIE{YEAR}STUDENT` (e.g., `SOBIE2024STUDENT`)
- **Discount**: Additional 5% off group rate
- **Eligibility**: Attendees with student registration type
- **Validity**: From registration open until conference start date
- **Requirements**: Valid student ID required at check-in

## Resort Information

### Sandestin Golf and Beach Resort

**Location**: Miramar Beach, Florida  
**Address**: 9300 Emerald Coast Pkwy W, Miramar Beach, FL 32550

### Resort Amenities
- Four championship golf courses
- Tennis courts and fitness facilities
- Multiple swimming pools and beach access
- Full-service spa and wellness center
- Various dining options and restaurants
- Conference and meeting facilities
- Complimentary shuttle service within resort
- Water sports and recreational activities
- Shopping and entertainment venues

### Accommodation Types

#### Hotel Rooms
- **Description**: Traditional hotel-style rooms with resort access
- **Features**: Daily housekeeping, resort amenities, conference shuttle
- **Best For**: Solo travelers, short stays, full-service experience

#### Condominiums
- **Description**: Spacious units with kitchens and living areas
- **Features**: Full kitchen, separate living areas, washer/dryer
- **Best For**: Longer stays, families, groups wanting kitchen facilities

#### Vacation Rentals
- **Description**: Private homes and villas for larger groups
- **Features**: Multiple bedrooms, full kitchens, private outdoor spaces
- **Best For**: Large groups, extended stays, maximum privacy

### Transportation

#### Airport Access
- **Primary**: Destin-Fort Walton Beach Airport (VPS) - 15 minutes
- **Alternative**: Pensacola Regional Airport (PNS) - 1 hour
- **Shuttle**: Resort shuttle available (advance booking required)

#### Ground Transportation
- **Parking**: Complimentary self-parking for resort guests
- **Local Transport**: Resort trolley connects all areas
- **Rental Cars**: Available at airport and resort
- **Ride Sharing**: Uber/Lyft available

## Integration Examples

### Frontend Integration (React)

```javascript
// Get resort information for a conference
const getResortInfo = async (conferenceId) => {
  try {
    const response = await fetch(`/api/venue/san-destin/${conferenceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.data;
    }
  } catch (error) {
    console.error('Error fetching resort info:', error);
  }
};

// Update accommodation preferences
const updateAccommodation = async (preferences) => {
  try {
    const response = await fetch('/api/venue/accommodation-preference', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferences)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Preferences updated:', result.data);
    }
  } catch (error) {
    console.error('Error updating preferences:', error);
  }
};

// Send resort information email
const sendResortEmail = async (registrationId) => {
  try {
    const response = await fetch('/api/venue/send-resort-info', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ registrationId })
    });
    
    if (response.ok) {
      alert('Resort information email sent successfully!');
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
```

### Vue.js Component Example

```vue
<template>
  <div class="resort-info">
    <h2>Sandestin Golf and Beach Resort</h2>
    
    <!-- Discount Codes Display -->
    <div v-if="discountCodes.length" class="discount-codes">
      <h3>Your Exclusive Discount Codes</h3>
      <div v-for="code in discountCodes" :key="code.code" class="discount-card">
        <h4>{{ code.code }}</h4>
        <p>{{ code.description }}</p>
        <p class="discount">{{ code.discount }}</p>
        <p class="validity">Valid: {{ formatDate(code.validFrom) }} - {{ formatDate(code.validUntil) }}</p>
      </div>
    </div>
    
    <!-- Accommodation Preferences -->
    <div class="accommodation-prefs">
      <h3>Accommodation Preferences</h3>
      <form @submit.prevent="updatePreferences">
        <div class="form-group">
          <label>Accommodation Type:</label>
          <select v-model="preferences.accommodationType">
            <option value="on-resort">On Resort</option>
            <option value="off-resort">Off Resort</option>
            <option value="undecided">Undecided</option>
          </select>
        </div>
        
        <div v-if="preferences.accommodationType === 'on-resort'" class="form-group">
          <label>Room Type:</label>
          <select v-model="preferences.roomType">
            <option value="hotel">Hotel Room</option>
            <option value="condo">Condominium</option>
            <option value="vacation_rental">Vacation Rental</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Special Requests:</label>
          <textarea v-model="preferences.specialRequests" 
                    placeholder="Accessibility needs, room preferences, etc."
                    maxlength="500"></textarea>
        </div>
        
        <button type="submit" :disabled="updating">
          {{ updating ? 'Updating...' : 'Update Preferences' }}
        </button>
      </form>
    </div>
    
    <!-- Resort Information -->
    <div v-if="venue" class="venue-details">
      <h3>Resort Information</h3>
      <div class="venue-info">
        <p><strong>Address:</strong> {{ venue.location.address }}, {{ venue.location.city }}, {{ venue.location.state }}</p>
        <p><strong>Phone:</strong> {{ venue.bookingInfo.reservationPhone }}</p>
        <p><strong>Website:</strong> <a :href="venue.bookingInfo.reservationWebsite" target="_blank">{{ venue.bookingInfo.reservationWebsite }}</a></p>
        <p><strong>Group Code:</strong> <code>{{ venue.bookingInfo.groupCode }}</code></p>
      </div>
      
      <div class="amenities">
        <h4>Resort Amenities</h4>
        <ul>
          <li v-for="amenity in venue.amenities" :key="amenity">{{ amenity }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ResortInfo',
  data() {
    return {
      venue: null,
      discountCodes: [],
      preferences: {
        accommodationType: 'undecided',
        roomType: 'hotel',
        specialRequests: '',
        discountCodeUsed: false
      },
      updating: false
    };
  },
  
  async mounted() {
    await this.loadResortInfo();
  },
  
  methods: {
    async loadResortInfo() {
      try {
        const response = await this.$http.get(`/api/venue/san-destin/${this.$route.params.conferenceId}`);
        const data = response.data.data;
        
        this.venue = data.venue;
        this.discountCodes = data.discountCodes;
        
        if (data.registration?.accommodationPreference) {
          this.preferences = { ...data.registration.accommodationPreference };
        }
      } catch (error) {
        console.error('Error loading resort info:', error);
      }
    },
    
    async updatePreferences() {
      this.updating = true;
      try {
        await this.$http.put('/api/venue/accommodation-preference', {
          registrationId: this.$route.params.registrationId,
          ...this.preferences
        });
        
        this.$toast.success('Accommodation preferences updated successfully!');
      } catch (error) {
        console.error('Error updating preferences:', error);
        this.$toast.error('Failed to update preferences');
      } finally {
        this.updating = false;
      }
    },
    
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString();
    }
  }
};
</script>
```

## Business Logic

### Discount Code Eligibility

The system automatically determines discount code eligibility based on:

1. **Registration Status**: Only confirmed registrations receive discount codes
2. **Timing**: Early bird codes only available for bookings 60+ days in advance
3. **Attendee Type**: Student codes only for attendees with student registration type
4. **Conference Timeline**: All codes expire at conference start date

### Accommodation Statistics

Admin statistics help with:
- **Logistics Planning**: Understanding on-resort vs off-resort distribution
- **Transportation**: Planning shuttle services based on accommodation locations
- **Special Needs**: Tracking accessibility and special accommodation requests
- **Capacity Planning**: Understanding room type preferences for future negotiations

### Email Automation

The system automatically:
1. **Includes resort information** in registration confirmation emails
2. **Sends detailed resort emails** with discount codes after confirmation
3. **Provides email triggers** for deadline reminders
4. **Tracks email delivery** for communication audit trails

## Security & Validation

### Authentication
- All endpoints require valid JWT authentication
- Admin endpoints require admin or super_admin role
- Users can only modify their own accommodation preferences

### Data Validation
- Conference IDs validated as MongoDB ObjectIds
- Accommodation types restricted to defined enums
- Special requests limited to 500 characters
- Booking dates validated for logical consistency

### Business Rules
- Discount codes automatically calculated based on eligibility
- Multiple discount codes can be applied per attendee
- Booking confirmations tracked for administrative purposes
- Special requests captured for accessibility compliance

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "accommodationType",
      "message": "Invalid accommodation type",
      "value": "invalid_type"
    }
  ]
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Registration not found or access denied",
  "statusCode": 404
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required",
  "statusCode": 401
}
```

This comprehensive venue API ensures SOBIE Conference attendees have all the information and tools they need to book their stay at Sandestin Golf and Beach Resort with appropriate discounts and accommodations.
