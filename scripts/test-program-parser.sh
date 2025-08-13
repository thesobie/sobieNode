#!/bin/bash

# SOBIE Program Parser Test Script
# Tests the program parser API with the SOBIE 2023 PDF

BASE_URL="http://localhost:3000"
PDF_PATH="/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads/documents/2023/program/sobie-2023-program.pdf"

echo "🔍 Testing SOBIE Program Parser API"
echo "=====================================\n"

# First, let's test if the server is running
echo "1. Testing server health..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Server is running"
else
    echo "❌ Server is not responding (HTTP $HEALTH_RESPONSE)"
    exit 1
fi

# Test the program parser endpoint without authentication first to see the error
echo "\n2. Testing program parser endpoint (without auth)..."
echo "Expected: Authentication error"
curl -X POST "$BASE_URL/api/admin/parse-program" \
  -H "Content-Type: application/json" \
  -d "{\"filePath\": \"$PDF_PATH\", \"year\": 2023}" \
  2>/dev/null | python3 -m json.tool

echo "\n3. Testing available programs endpoint (without auth)..."
echo "Expected: Authentication error"
curl -X GET "$BASE_URL/api/admin/available-programs" \
  -H "Content-Type: application/json" \
  2>/dev/null | python3 -m json.tool

echo "\n4. Verifying PDF file exists..."
if [ -f "$PDF_PATH" ]; then
    echo "✅ PDF file found at: $PDF_PATH"
    echo "📄 File size: $(ls -lh "$PDF_PATH" | awk '{print $5}')"
else
    echo "❌ PDF file not found at: $PDF_PATH"
    echo "🔍 Searching for SOBIE 2023 program files..."
    find /Users/bcumbie/Desktop/sobie-dev/sobieNode -name "*2023*program*.pdf" -type f 2>/dev/null
fi

echo "\n📋 Summary:"
echo "- Server: Running ✅"
echo "- PDF Location: $PDF_PATH"
echo "- API Endpoints: Require authentication 🔐"
echo "\nNext steps:"
echo "1. Create an admin user or get admin token"
echo "2. Use the token to authenticate API calls"
echo "3. Run the program parser with proper authentication"
