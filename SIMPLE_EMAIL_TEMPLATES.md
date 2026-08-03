# Simple Email Templates for OPSTech Site

These are ultra-simple templates that are easy to customize. Just copy and paste into your EmailTemplates sheet.

---

## Template 1: Simple Announcement

**Add to Row 2 (or next available row) in EmailTemplates sheet:**

```
Column A (TEMPLATE_NAME):
Simple Announcement

Column B (SUBJECT_TEMPLATE):
[Your Subject Here]

Column C (BODY_HTML):
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Lexend', Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #2d3f69 0%, #1d2a5d 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .content {
      padding: 30px;
      line-height: 1.6;
      color: #333;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 0.9em;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>[YOUR TITLE HERE]</h1>
    </div>
    <div class="content">
      <p>[Replace this with your message. You can add multiple paragraphs, just wrap each one in &lt;p&gt; tags.]</p>

      <p>[Add more paragraphs as needed.]</p>
    </div>
    <div class="footer">
      <p>Orono Tech Department | Questions? Reply to this email</p>
    </div>
  </div>
</body>
</html>

Column D (DESCRIPTION):
Basic announcement template - just replace [YOUR TITLE HERE] and the message paragraphs
```

---

## Template 2: Tech Tip

**Add to next row in EmailTemplates sheet:**

```
Column A (TEMPLATE_NAME):
Tech Tip

Column B (SUBJECT_TEMPLATE):
Tech Tip: [Topic Name]

Column C (BODY_HTML):
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Lexend', Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #2d3f69 0%, #1d2a5d 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .content {
      padding: 30px;
      line-height: 1.6;
      color: #333;
    }
    .tip-box {
      background: #e8f0fe;
      border-left: 4px solid #1967d2;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 0.9em;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💡 Tech Tip</h1>
      <p style="margin: 0; font-size: 1.2em;">[Topic Name]</p>
    </div>
    <div class="content">
      <p>[Brief introduction about this tip]</p>

      <div class="tip-box">
        <strong>Quick Tip:</strong> [Main tip or shortcut goes here]
      </div>

      <p>[Additional explanation or instructions]</p>
    </div>
    <div class="footer">
      <p>Orono Tech Department | Questions? Reply to this email</p>
    </div>
  </div>
</body>
</html>

Column D (DESCRIPTION):
Tech tip template with highlighted tip box - replace [Topic Name] and fill in the sections
```

---

## Template 3: Quick Update

**Add to next row in EmailTemplates sheet:**

```
Column A (TEMPLATE_NAME):
Quick Update

Column B (SUBJECT_TEMPLATE):
Quick Update: [What's New]

Column C (BODY_HTML):
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Lexend', Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: #ad2122;
      color: white;
      padding: 20px 30px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .content {
      padding: 30px;
      line-height: 1.6;
      color: #333;
    }
    .content ul {
      padding-left: 20px;
    }
    .content li {
      margin-bottom: 10px;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 0.9em;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">⚡ Quick Update</h2>
    </div>
    <div class="content">
      <h3>[Update Title]</h3>
      <p>[Brief description of the update]</p>

      <ul>
        <li>[Key point 1]</li>
        <li>[Key point 2]</li>
        <li>[Key point 3]</li>
      </ul>

      <p>[Any additional information or next steps]</p>
    </div>
    <div class="footer">
      <p>Orono Tech Department | Questions? Reply to this email</p>
    </div>
  </div>
</body>
</html>

Column D (DESCRIPTION):
Quick update template with bullet points - replace [Update Title] and list items
```

---

## How to Use These Templates

1. **Copy the template data** from above (all 4 columns for each template)
2. **Open your spreadsheet** and go to the EmailTemplates sheet
3. **Paste into the next available row** (start at row 2 if empty)
4. **Replace the bracketed placeholders** when composing emails:
   - `[YOUR TITLE HERE]` → Your actual title
   - `[Your message]` → Your actual content
   - `[Topic Name]` → Specific topic
   - etc.

## Tips for Customization

- **Bold text:** Wrap in `<strong>` tags: `<strong>Important!</strong>`
- **New paragraph:** Wrap in `<p>` tags: `<p>Your text here</p>`
- **Bullet list:** Use `<ul><li>Item 1</li><li>Item 2</li></ul>`
- **Link:** Use `<a href="URL">Link text</a>`
- **Line break:** Use `<br>`

## Using the Visual Editor

With the new visual editor on the Compose page, you don't need to know HTML! Just:
1. Select a template
2. Click in the editor
3. Type and format like a normal document
4. The HTML is created automatically

You can switch to "HTML Code" view anytime if you want to edit the raw HTML directly.
