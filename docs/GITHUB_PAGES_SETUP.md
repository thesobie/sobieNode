---
layout: default
title: GitHub Pages Setup
nav_order: 11
description: "Guide for setting up and deploying documentation to GitHub Pages"
---

# Setting Up GitHub Pages for SOBIE Documentation
{: .fs-8 }

## 🚀 Quick Setup Guide

This documentation site is configured to automatically deploy to GitHub Pages using Jekyll.

### 1. Enable GitHub Pages

1. Go to your repository settings on GitHub
2. Navigate to **Pages** section
3. Under **Source**, select **GitHub Actions**
4. The workflow will automatically deploy when you push changes to the `docs/` folder

### 2. Access Your Documentation

Once deployed, your documentation will be available at:
```
https://thesobie.github.io/sobieNode/
```

### 3. Local Development (Optional)

To preview the site locally:

```bash
# Navigate to docs directory
cd docs/

# Install dependencies (first time only)
bundle install

# Serve the site locally
bundle exec jekyll serve

# View at http://localhost:4000
```

### 4. Automatic Deployment

The site automatically rebuilds and deploys when:
- Changes are pushed to the `main` branch
- Files in the `docs/` directory are modified
- Manual trigger via GitHub Actions

### 5. Site Features

✅ **Responsive Design**: Works on all devices  
✅ **Search Engine Optimized**: SEO meta tags included  
✅ **Professional Navigation**: Easy document discovery  
✅ **GitHub Integration**: Direct repository links  
✅ **Auto-generated Sitemap**: For better indexing  

### 6. Troubleshooting

If the site doesn't deploy:
1. Check the **Actions** tab for build errors
2. Ensure GitHub Pages is enabled in repository settings
3. Verify the `docs/` folder contains valid Jekyll files

---

*The documentation is now production-ready for GitHub Pages! 🎉*
