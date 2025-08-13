#!/bin/bash

# SOBIE 2023 Database Population Script
# Runs the migration to populate database with extracted PDF data

echo "🚀 SOBIE 2023 Database Population"
echo "=================================="
echo ""

# Check if PDF file exists
PDF_PATH="/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads/documents/2023/program/sobie-2023-program.pdf"

if [ ! -f "$PDF_PATH" ]; then
    echo "❌ PDF file not found at: $PDF_PATH"
    echo "Please ensure the SOBIE 2023 program PDF is in the correct location."
    exit 1
fi

echo "✅ PDF file found: $PDF_PATH"
echo "📄 File size: $(ls -lh "$PDF_PATH" | awk '{print $5}')"
echo ""

# Check if Node.js and dependencies are available
echo "🔍 Checking dependencies..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Dependencies ready"
echo ""

# Check database connection
echo "🔌 Checking database connection..."
if [ -z "$MONGODB_URI" ]; then
    echo "⚠️  MONGODB_URI not set in environment, using default local connection"
fi

# Run the migration
echo "🔄 Starting database population..."
echo "This will:"
echo "  1. Extract data from SOBIE 2023 PDF"
echo "  2. Create conference record"
echo "  3. Create user profiles for attendees"
echo "  4. Create conference registrations"
echo "  5. Create session records"
echo "  6. Create research submissions"
echo "  7. Generate migration report"
echo ""

read -p "Continue with migration? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Running migration..."
    node migrate-sobie-2023.js
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migration completed successfully!"
        echo ""
        echo "📊 Next steps:"
        echo "  - Review the migration report in migration-reports/ directory"
        echo "  - Start the server to access the populated data"
        echo "  - Test the new data through the API endpoints"
        echo ""
        echo "🌐 To start the server:"
        echo "  npm start"
    else
        echo ""
        echo "❌ Migration failed. Check the error messages above."
        echo "Common issues:"
        echo "  - Database connection problems"
        echo "  - PDF file access issues"
        echo "  - Missing dependencies"
    fi
else
    echo "❌ Migration cancelled."
fi
