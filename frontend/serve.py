#!/usr/bin/env python3
"""
Simple HTTP server for SOBIE Frontend
Serves the frontend files with proper CORS headers for backend integration
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse, parse_qs

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for backend integration
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Handle routing for SPA-like behavior
        if self.path == '/' or self.path == '/index.html':
            self.path = '/index.html'
        elif self.path.startswith('/public/') and not os.path.exists(self.path[1:]):
            # If a public route doesn't exist, serve index.html for client-side routing
            self.path = '/index.html'
        elif self.path.startswith('/user/') and not os.path.exists(self.path[1:]):
            # If a user route doesn't exist, serve index.html for client-side routing
            self.path = '/index.html'
        elif self.path.startswith('/admin/') and not os.path.exists(self.path[1:]):
            # If an admin route doesn't exist, serve index.html for client-side routing
            self.path = '/index.html'
        
        return super().do_GET()

def main():
    PORT = 8080
    
    # Change to frontend directory
    frontend_dir = '/Users/bcumbie/Desktop/sobie-dev/sobieNode/frontend'
    
    if not os.path.exists(frontend_dir):
        print(f"❌ Frontend directory not found: {frontend_dir}")
        sys.exit(1)
    
    os.chdir(frontend_dir)
    print(f"📁 Serving from: {frontend_dir}")
    
    try:
        with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
            print(f"🚀 SOBIE Frontend Server running at http://localhost:{PORT}")
            print(f"🔗 Backend API: http://localhost:3000")
            print(f"🧪 Test connection: http://localhost:{PORT}/test-connection.html")
            print("\n🎯 Frontend Features Available:")
            print(f"   • Main App: http://localhost:{PORT}/")
            print(f"   • Research Papers: http://localhost:{PORT}/public/research.html")
            print(f"   • Login: http://localhost:{PORT}/public/login.html")
            print(f"   • User Dashboard: http://localhost:{PORT}/user/dashboard.html")
            print(f"   • Connection Test: http://localhost:{PORT}/test-connection.html")
            print("\n⚠️  Make sure backend is running on http://localhost:3000")
            print("   Run: npm start (in the sobieNode directory)")
            print("\n🛑 Press Ctrl+C to stop the server")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n👋 Frontend server stopped")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} is already in use")
            print("   Try a different port or stop the existing server")
        else:
            print(f"❌ Server error: {e}")

if __name__ == '__main__':
    main()
