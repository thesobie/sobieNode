#!/bin/bash

# Multi-Year SOBIE Conference Migration Script
# Processes conference programs for multiple years

echo "🚀 SOBIE Multi-Year Historical Data Migration"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the sobieNode project root directory"
    exit 1
fi

# Check if required files exist
echo "🔍 Checking for required conference program files..."

# Define the years and their expected paths
declare -A years=(
    ["2022"]="uploads/documents/2022/program/sobie-2022-program.pdf"
    ["2019"]="uploads/documents/2019/program/sobie-2019-program.pdf" 
    ["2009"]="uploads/documents/2009/program/sobie-2009-program.pdf"
)

missing_files=0
for year in "${!years[@]}"; do
    file_path="${years[$year]}"
    if [ -f "$file_path" ]; then
        file_size=$(ls -lh "$file_path" | awk '{print $5}')
        echo "✅ SOBIE $year program found ($file_size)"
    else
        echo "❌ SOBIE $year program not found: $file_path"
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -gt 0 ]; then
    echo ""
    echo "⚠️  Warning: $missing_files program files are missing."
    echo "The migration will continue with available files."
    echo ""
fi

# Check environment and dependencies
echo ""
echo "🔧 Validating environment..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if MongoDB connection is configured
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please ensure MongoDB is configured."
    exit 1
fi

echo "✅ Environment validation complete"
echo ""

# Confirm with user
echo "📋 Migration will process the following:"
echo "   • SOBIE 2022 Conference Program"
echo "   • SOBIE 2019 Conference Program" 
echo "   • SOBIE 2009 Conference Program"
echo ""
echo "This will:"
echo "   • Extract attendee data from each PDF"
echo "   • Create historical user profiles"
echo "   • Create conference records"
echo "   • Create session records"
echo "   • Generate comprehensive migration report"
echo ""

read -p "Do you want to proceed with the migration? (y/N): " confirm

if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    echo "Migration cancelled by user."
    exit 0
fi

echo ""
echo "🚀 Starting multi-year migration..."
echo ""

# Run the migration
node migrate-multi-year.js

migration_exit_code=$?

echo ""
if [ $migration_exit_code -eq 0 ]; then
    echo "✅ Multi-year migration completed successfully!"
    echo ""
    echo "📊 Next steps:"
    echo "   • Review the migration report in migration-reports/ directory"
    echo "   • Check the database for populated historical data"
    echo "   • Test the new data through the API endpoints"
    echo ""
    echo "🌐 To start the server and access the data:"
    echo "   npm start"
    echo ""
    echo "🎯 Implementation Roadmap Status:"
    echo "   ✅ No. 1: Platform Modernization - COMPLETED"
    echo "   ✅ No. 2: Database Population - COMPLETED (2009, 2019, 2022, 2023)"
    echo "   🔄 No. 3: User Interface Development - READY TO BEGIN"
else
    echo "❌ Migration failed with exit code: $migration_exit_code"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   • Check the error messages above"
    echo "   • Verify PDF files are accessible"
    echo "   • Ensure database connection is working"
    echo "   • Check the migration report for detailed errors"
fi

exit $migration_exit_code
