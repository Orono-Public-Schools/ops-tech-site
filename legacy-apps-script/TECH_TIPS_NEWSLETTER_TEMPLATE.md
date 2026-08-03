# Tech Tips Newsletter Template

This is a professional newsletter-style template for sending Tech Tips with featured articles, images, and multiple content sections.

---

## Template Structure

- **Header Section**: Date, "Tech Tips" title, Department name
- **Featured Article**: Main article with large image, title, blurb, and link
- **Two-Column Articles**: Side-by-side articles with images, titles, blurbs, and links
- **Call-to-Action**: "Ready to Learn More?" section with link to Digital Learning Hub
- **Footer**: Copyright and tagline

---

## Add to EmailTemplates Sheet

**Column A (TEMPLATE_NAME):**
```
Tech Tips Newsletter
```

**Column B (SUBJECT_TEMPLATE):**
```
Tech Tips: [Month Year] - [Main Topic]
```

**Column C (BODY_HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Lexend', Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 650px;
      margin: 20px auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    /* Header Section */
    .header {
      background: linear-gradient(135deg, #2d3f69 0%, #1d2a5d 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header-date {
      font-size: 0.9em;
      opacity: 0.9;
      margin-bottom: 10px;
    }
    .header-title {
      font-size: 2.5em;
      font-weight: 700;
      margin: 10px 0;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .header-department {
      font-size: 1.1em;
      opacity: 0.95;
      margin-top: 10px;
    }

    /* Featured Article Section */
    .featured-article {
      padding: 40px 30px;
      border-bottom: 3px solid #e0e0e0;
    }
    .featured-title {
      font-size: 2em;
      font-weight: 700;
      color: #1d2a5d;
      margin-bottom: 20px;
      line-height: 1.3;
    }
    .featured-image {
      width: 100%;
      height: auto;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .featured-blurb {
      font-size: 1.1em;
      line-height: 1.6;
      color: #333;
      margin-bottom: 20px;
    }
    .featured-link {
      display: inline-block;
      background: #ad2122;
      color: white;
      padding: 12px 28px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.3s;
    }
    .featured-link:hover {
      background: #7a1718;
    }

    /* Two Column Articles Section */
    .two-column-section {
      padding: 40px 30px;
      border-bottom: 3px solid #e0e0e0;
    }
    .columns {
      display: table;
      width: 100%;
      border-spacing: 20px 0;
    }
    .column {
      display: table-cell;
      width: 50%;
      vertical-align: top;
    }
    .column-title {
      font-size: 1.4em;
      font-weight: 700;
      color: #1d2a5d;
      margin-bottom: 15px;
      line-height: 1.3;
    }
    .column-image {
      width: 100%;
      height: auto;
      border-radius: 6px;
      margin-bottom: 15px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .column-blurb {
      font-size: 0.95em;
      line-height: 1.5;
      color: #555;
      margin-bottom: 15px;
    }
    .column-link {
      display: inline-block;
      color: #2d3f69;
      text-decoration: none;
      font-weight: 600;
      border-bottom: 2px solid #2d3f69;
      padding-bottom: 2px;
      transition: color 0.3s;
    }
    .column-link:hover {
      color: #ad2122;
      border-bottom-color: #ad2122;
    }

    /* Call to Action Section */
    .cta-section {
      background: linear-gradient(135deg, #e8f0fe 0%, #f0f4ff 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .cta-title {
      font-size: 1.8em;
      font-weight: 700;
      color: #1d2a5d;
      margin-bottom: 15px;
    }
    .cta-text {
      font-size: 1.1em;
      color: #555;
      margin-bottom: 20px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #2d3f69 0%, #1d2a5d 100%);
      color: white;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 1.1em;
      box-shadow: 0 4px 12px rgba(45, 63, 105, 0.3);
      transition: transform 0.3s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(45, 63, 105, 0.4);
    }

    /* Footer Section */
    .footer {
      background: #2d3f69;
      color: white;
      padding: 30px;
      text-align: center;
    }
    .footer-copyright {
      font-size: 0.95em;
      margin-bottom: 8px;
      opacity: 0.9;
    }
    .footer-tagline {
      font-size: 1.05em;
      font-weight: 500;
      font-style: italic;
      opacity: 0.95;
    }

    /* Mobile Responsive */
    @media only screen and (max-width: 600px) {
      .columns {
        display: block;
      }
      .column {
        display: block;
        width: 100%;
        margin-bottom: 30px;
      }
      .header-title {
        font-size: 2em;
      }
      .featured-title {
        font-size: 1.6em;
      }
      .cta-title {
        font-size: 1.5em;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">

    <!-- Header Section -->
    <div class="header">
      <div class="header-date">[INSERT DATE - e.g., January 2025]</div>
      <h1 class="header-title">Tech Tips</h1>
      <div class="header-department">[INSERT DEPARTMENT - e.g., Digital Learning Team]</div>
    </div>

    <!-- Featured Article Section -->
    <div class="featured-article">
      <h2 class="featured-title">[MAIN ARTICLE TITLE]</h2>
      <img src="[INSERT IMAGE URL]" alt="Featured Article" class="featured-image">
      <p class="featured-blurb">
        [Insert your main article blurb here. This should be 2-3 sentences that capture the essence of your tech tip or announcement. Make it engaging and informative.]
      </p>
      <a href="[INSERT LINK URL]" class="featured-link">Learn More →</a>
    </div>

    <!-- Two Column Articles Section -->
    <div class="two-column-section">
      <div class="columns">

        <!-- Column 1 -->
        <div class="column">
          <h3 class="column-title">[ARTICLE 1 TITLE]</h3>
          <img src="[INSERT IMAGE URL]" alt="Article 1" class="column-image">
          <p class="column-blurb">
            [Insert blurb for article 1. Keep it concise - 1-2 sentences that explain the tip or feature.]
          </p>
          <a href="[INSERT LINK URL]" class="column-link">Learn More →</a>
        </div>

        <!-- Column 2 -->
        <div class="column">
          <h3 class="column-title">[ARTICLE 2 TITLE]</h3>
          <img src="[INSERT IMAGE URL]" alt="Article 2" class="column-image">
          <p class="column-blurb">
            [Insert blurb for article 2. Keep it concise - 1-2 sentences that explain the tip or feature.]
          </p>
          <a href="[INSERT LINK URL]" class="column-link">Learn More →</a>
        </div>

      </div>
    </div>

    <!-- Call to Action Section -->
    <div class="cta-section">
      <h3 class="cta-title">Ready to Learn More?</h3>
      <p class="cta-text">
        Visit the Orono Technology Digital Learning Hub to learn more
      </p>
      <a href="https://sites.google.com/orono.k12.mn.us/digital-learning/home" class="cta-button">Visit Digital Learning Hub</a>
    </div>

    <!-- Footer Section -->
    <div class="footer">
      <div class="footer-copyright">© 2025 Orono Technology Digital Learning Hub</div>
      <div class="footer-tagline">Empowering Digital Learning and Innovation</div>
    </div>

  </div>
</body>
</html>
```

**Column D (DESCRIPTION):**
```
Full newsletter template for Tech Tips with featured article, two-column layout, images, and Digital Learning Hub CTA
```

---

## How to Use This Template

### Step 1: Add to EmailTemplates Sheet
Copy the content from each column above and paste it into a new row in your EmailTemplates sheet.

### Step 2: When Composing an Email
1. Select "Tech Tips Newsletter" from the template dropdown
2. The template will load into the visual editor
3. Replace all the bracketed placeholders:

**Header Section:**
- `[INSERT DATE - e.g., January 2025]` → Current month/year
- `[INSERT DEPARTMENT - e.g., Digital Learning Team]` → Your department name (Digital Learning, Technology, etc.)

**Featured Article:**
- `[MAIN ARTICLE TITLE]` → Your main article headline
- `[INSERT IMAGE URL]` → Full URL to your featured image (use Google Drive shared link)
- `[Insert your main article blurb...]` → 2-3 sentences about the main topic
- `[INSERT LINK URL]` → Link to full article or resource

**Two Column Articles:**
- `[ARTICLE 1 TITLE]` → Second article title
- `[INSERT IMAGE URL]` → Image URL for article 1
- `[Insert blurb for article 1...]` → 1-2 sentences
- `[INSERT LINK URL]` → Link for article 1
- (Repeat for Article 2)

### Step 3: Using Images
For images, you have a few options:

**Option 1: Google Drive Images**
1. Upload image to Google Drive
2. Right-click → Get link → Set to "Anyone with the link can view"
3. Extract the file ID from the link: `https://drive.google.com/file/d/[FILE_ID]/view`
4. Use this URL format: `https://lh3.googleusercontent.com/d/[FILE_ID]`

**Option 2: Direct Image URLs**
- Use any publicly accessible image URL (from your website, cloud storage, etc.)

**Option 3: Built-in Visual Editor**
- With the new TinyMCE visual editor, you can insert images directly using the toolbar!

---

## Tips for Great Newsletter Content

### Image Guidelines
- **Featured Image**: 650px wide (or larger), landscape orientation
- **Column Images**: 300px wide (or larger), square or landscape
- Use high-quality images that are relevant to the content
- Ensure images are compressed for faster email loading

### Writing Tips
- **Subject Line**: Be specific - "Tech Tips: January 2025 - AI Tools in the Classroom"
- **Featured Article**: Your most important or exciting tip goes here
- **Column Articles**: Supporting tips or related content
- **Blurbs**: Keep them short and action-oriented

### Department Names You Can Use
- Digital Learning Team
- Technology Department
- Educational Technology
- Instructional Technology
- Tech Support Team

---

## Example Newsletter Content

Here's a sample of what your filled-in content might look like:

**Header:**
- Date: January 2025
- Department: Digital Learning Team

**Featured Article:**
- Title: "Master Google Classroom: 5 Time-Saving Features"
- Blurb: "Discover powerful Google Classroom features that can save you hours every week. From auto-grading quizzes to scheduled posts, these tools will transform your workflow."
- Link: Link to full article on your Digital Learning Hub

**Column 1:**
- Title: "Quick Tip: Keyboard Shortcuts"
- Blurb: "Learn essential keyboard shortcuts for Windows and Mac that every teacher should know."
- Link: Link to shortcuts guide

**Column 2:**
- Title: "New Resource: AI Writing Tools"
- Blurb: "Explore how AI can help with lesson planning, email drafts, and feedback - ethically and effectively."
- Link: Link to AI tools guide

---

## Using the Visual Editor

With the visual editor enabled on the Compose page:

1. **Load the template** - Select it from dropdown
2. **Click to edit** - Just click on any text and start typing
3. **Replace images** - Use the image button in toolbar or paste image URLs
4. **Format easily** - Bold, colors, alignment - all point-and-click
5. **Preview** - Switch to HTML view to see the code if needed

No HTML knowledge required! The visual editor makes it as easy as editing a Word document.

---

## Need Help?

If you need to make design changes to the template:
- Colors are defined in the `<style>` section at the top
- Current brand colors: #2d3f69 (navy), #1d2a5d (dark navy), #ad2122 (red)
- The layout uses email-safe HTML tables for the two-column section (ensures compatibility across email clients)
