#!/bin/bash

# SOBIE 2023 Program Processing Script
# This script will process the PDF and identify platform gaps

BASE_URL="http://localhost:3000"
PDF_PATH="/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads/documents/2023/program/sobie-2023-program.pdf"

echo "🚀 SOBIE 2023 Program Processing & Gap Analysis"
echo "================================================"
echo ""

# Step 1: Create admin user
echo "1️⃣ Creating admin user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": { "first": "Admin", "last": "Parser" },
    "email": "admin.parser@sobie.org",
    "password": "AdminParser123!",
    "role": "admin"
  }')

echo "Registration response: $REGISTER_RESPONSE"

# Step 2: Login to get token
echo ""
echo "2️⃣ Getting admin token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin.parser@sobie.org",
    "password": "AdminParser123!"
  }')

echo "Login response: $LOGIN_RESPONSE"

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'data' in data and 'accessToken' in data['data']:
        print(data['data']['accessToken'])
    elif 'accessToken' in data:
        print(data['accessToken'])
    else:
        print('NO_TOKEN')
except:
    print('NO_TOKEN')
")

if [ "$TOKEN" = "NO_TOKEN" ] || [ -z "$TOKEN" ]; then
    echo "❌ Failed to get admin token. Response was:"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Got admin token: ${TOKEN:0:20}..."

# Step 3: Test available programs endpoint
echo ""
echo "3️⃣ Checking available programs..."
PROGRAMS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/available-programs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Available programs:"
echo "$PROGRAMS_RESPONSE" | python3 -m json.tool

# Step 4: Parse the PDF
echo ""
echo "4️⃣ Processing SOBIE 2023 Program PDF..."
echo "📄 File: $PDF_PATH"
echo ""

PARSE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/parse-program" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"filePath\": \"$PDF_PATH\",
    \"year\": 2023
  }")

echo "📊 Parsing Results:"
echo "=================="
echo "$PARSE_RESPONSE" | python3 -m json.tool

# Step 5: Get parsing history
echo ""
echo "5️⃣ Getting parsing history..."
HISTORY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/parsing-history" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "📈 Parsing History:"
echo "=================="
echo "$HISTORY_RESPONSE" | python3 -m json.tool

echo ""
echo "🔍 Analysis Complete!"
echo "===================="
echo "Review the extracted data above to identify:"
echo "- What data was successfully extracted"
echo "- What data types might need new platform features"
echo "- Any parsing errors or missing information"
echo "- Platform gaps that need to be addressed"
