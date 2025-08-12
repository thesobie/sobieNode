# So## Features

- 🚀 **Express.js** - Fast, unopinionated web framework
- 🗄️ **MongoDB Atlas** - Cloud database with Mongoose ODM
- 🎓 **SOBIE Conference Features** - Academic conference management system
- 👥 **Enhanced User Profiles** - Academic titles, affiliations, and conference preferences
- 🛡️ **Security** - Helmet for security headers, CORS support, rate limiting
- 📝 **Logging** - Morgan HTTP request logger
- ✅ **Testing** - Jest testing framework with Supertest
- 🔧 **Development** - Nodemon for auto-restart during development
- 📋 **Code Quality** - ESLint with Standard configuration
- 🗂️ **Modular Architecture** - Organized folder structure with separation of concernsNode.js Backend Server

A boilerplate Node.js backend server built with Express.js, featuring a modular architecture and best practices.

## Features

- 🚀 **Express.js** - Fast, unopinionated web framework
- �️ **MongoDB Atlas** - Cloud database with Mongoose ODM
- �🛡️ **Security** - Helmet for security headers, CORS support, rate limiting
- 📝 **Logging** - Morgan HTTP request logger
- ✅ **Testing** - Jest testing framework with Supertest
- 🔧 **Development** - Nodemon for auto-restart during development
- 📋 **Code Quality** - ESLint with Standard configuration
- 🗂️ **Modular Architecture** - Organized folder structure with separation of concerns

## Project Structure

```
src/
├── config/            # Database configuration
├── controllers/       # Request handlers
├── middleware/        # Custom middleware
├── models/           # MongoDB/Mongoose models
├── routes/           # Route definitions
├── scripts/          # Utility scripts (seeding, etc.)
├── services/         # Business logic
├── utils/            # Utility functions
└── server.js         # Main server file

__tests__/            # Organized test files
├── auth/             # Authentication tests
├── content/          # Content moderation tests
├── demo/             # Demo and example scripts
└── README.md         # Test documentation

docs/                 # Project documentation
├── authentication/   # Authentication documentation
└── USER_DATA_STRUCTURE.md
```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   DB_NAME=your_database_name
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run seed` - Seed database with sample data

## API Endpoints

### Health Check
- `GET /health` - Server health status with database connection info

### API Routes
- `GET /api` - API information and available endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile (requires auth)

### SOBIE Conference Profiles
- `GET /api/profiles/stats` - Get conference attendee statistics
- `GET /api/profiles/search` - Search profiles by organization, type, etc.
- `GET /api/profiles/:id` - Get public user profile
- `GET /api/profiles/:id/nametag` - Get nametag information
- `PUT /api/profiles/:id` - Update user profile

## Example Requests

### Create a SOBIE conference user
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "professor@university.edu",
    "password": "password123",
    "name": {
      "firstName": "Jane",
      "lastName": "Smith",
      "prefix": "Dr.",
      "suffix": "Ph.D.",
      "pronouns": "she/her"
    },
    "nametag": {
      "preferredSalutation": "Dr. Smith"
    },
    "userType": "academic",
    "affiliation": {
      "organization": "University Name",
      "college": "College of Business",
      "department": "Information Systems",
      "jobTitle": "Associate Professor"
    }
  }'
```

### Get conference statistics
```bash
curl http://localhost:3000/api/profiles/stats
```

### Search for students
```bash
curl "http://localhost:3000/api/profiles/search?userType=student"
```

### Get nametag information
```bash
curl http://localhost:3000/api/profiles/{userId}/nametag
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "password123"}'
```

### Seed database with sample data
```bash
npm run seed
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=your_database_name
```

## Database

The application uses MongoDB Atlas with Mongoose ODM. The database schema includes:

### Enhanced User Model for SOBIE Conference
- **name**: Complex object with firstName, lastName, middleName, prefix, suffix, preferredName
- **pronouns**: Inclusive pronoun options (he/him, she/her, they/them, etc.)
- **nametag**: Conference nametag preferences (preferredSalutation, displayName)
- **userType**: 'student', 'academic', or 'other'
- **studentLevel**: 'undergraduate', 'graduate', or 'doctorate' (for students)
- **role**: System role ('user', 'reviewer', 'committee', 'admin')
- **affiliation**: Organization, college, department, jobTitle, position
- **contact**: Phone, website, LinkedIn, ORCID
- **preferences**: Dietary restrictions, accessibility needs, communication preferences
- **authentication**: Email/password or magic link options
- **security**: Account locking, login attempts tracking, email verification

### Features:
- **Soft Delete**: Users are marked as inactive instead of being removed
- **Email Validation**: Proper email format validation
- **Indexing**: Optimized queries with email and createdAt indexes
- **Schema Validation**: Built-in Mongoose validation

## Next Steps

This boilerplate provides a solid foundation. Consider adding:

- **JWT Authentication** with proper token verification and bcrypt password hashing
- **Input Validation** using libraries like Joi or express-validator
- **API Documentation** with Swagger/OpenAPI
- **File Upload** handling
- **Email Service** integration
- **Caching** with Redis
- **Monitoring** and logging improvements
- **Pagination** for large datasets
- **Search and Filtering** capabilities

## Testing

The project includes test examples using Jest and Supertest. Tests cover:

- Server health endpoints
- API route functionality
- Error handling
- User CRUD operations

Run tests with:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details.
