# Communications Portal Setup Guide

## Overview
The Communications Portal allows you to send tech tips and announcements via email, using templates and Google Groups, with automatic archiving of sent messages.

## Spreadsheet Setup

You need to add **3 new sheets** to your existing spreadsheet:

---

## 1. Communications Sheet

**Purpose:** Archives all sent emails for display in the post grid

**Sheet Name:** `Communications`

**Columns (A-F):**

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | TIMESTAMP | When email was sent | 2025-01-15 14:30:00 |
| B | SUBJECT | Email subject line | "Tech Tip: Keyboard Shortcuts" |
| C | RECIPIENTS | Who received it (groups/emails) | "All Staff, Teachers" |
| D | TEMPLATE_USED | Template name (if any) | "Tech Tip Template" |
| E | PREVIEW_TEXT | First 200 chars of email body | "Did you know you can..." |
| F | FULL_BODY_HTML | Complete HTML email body | `<html>...` |

**Initial Setup:**
1. Create a new sheet named `Communications`
2. Add headers in row 1 (A1-F1)
3. Leave row 2 blank (data will be added when emails are sent)

---

## 2. EmailTemplates Sheet

**Purpose:** Store reusable email templates

**Sheet Name:** `EmailTemplates`

**Columns (A-D):**

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | TEMPLATE_NAME | Display name | "Tech Tip Template" |
| B | SUBJECT_TEMPLATE | Subject with placeholders | "Tech Tip: {TOPIC}" |
| C | BODY_HTML | HTML email body | `<html><body>...</body></html>` |
| D | DESCRIPTION | What this template is for | "Weekly tech tips for staff" |

**Sample Template to Add (Row 2):**

```
A2: Tech Tip Template
B2: Tech Tip: {TOPIC}
C2: <html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #2d3f69 0%, #1d2a5d 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; line-height: 1.6; color: #333; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💡 Tech Tip</h1>
    </div>
    <div class="content">
      <h2>{TOPIC}</h2>
      <p>{CONTENT}</p>
    </div>
    <div class="footer">
      <p>Orono Tech Department | Questions? Reply to this email</p>
    </div>
  </div>
</body>
</html>
D2: Use for weekly tech tips - replace {TOPIC} and {CONTENT} when sending
```

**Placeholders you can use:**
- `{TOPIC}` - Will be replaced when composing
- `{CONTENT}` - Main message content
- `{DATE}` - Current date
- Any custom placeholders you define

---

## 3. EmailGroups Sheet

**Purpose:** Store email groups for quick recipient selection

**Sheet Name:** `EmailGroups`

**Columns (A-C):**

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | GROUP_NAME | Display name | "All Staff" |
| B | GROUP_EMAIL | Google Group email or list | "staff@orono.org" |
| C | DESCRIPTION | What this group is | "All district staff members" |

**Sample Groups to Add:**

```
Row 2:
A2: All Staff
B2: staff@orono.org
C2: All district staff members

Row 3:
A3: Teachers
B3: teachers@orono.org
C3: All teachers

Row 4:
A4: Administrators
B4: admins@orono.org
C4: District administrators

Row 5:
A5: Tech Team
B5: tech@orono.org
C5: Technology department staff
```

**Notes:**
- GROUP_EMAIL can be:
  - Google Group email (e.g., `staff@orono.org`)
  - Multiple emails separated by commas (e.g., `email1@orono.org, email2@orono.org`)
  - Individual email addresses

---

## Quick Setup Checklist

- [ ] Open your spreadsheet: "Tech Dept Link Directory"
- [ ] Create new sheet: `Communications`
- [ ] Add headers: TIMESTAMP, SUBJECT, RECIPIENTS, TEMPLATE_USED, PREVIEW_TEXT, FULL_BODY_HTML
- [ ] Create new sheet: `EmailTemplates`
- [ ] Add headers: TEMPLATE_NAME, SUBJECT_TEMPLATE, BODY_HTML, DESCRIPTION
- [ ] Add at least one template (sample above)
- [ ] Create new sheet: `EmailGroups`
- [ ] Add headers: GROUP_NAME, GROUP_EMAIL, DESCRIPTION
- [ ] Add your email groups (samples above)
- [ ] Save the spreadsheet

---

## Email Sending Limits

**Google Apps Script Email Quotas:**
- **Free Gmail account:** 100 emails per day
- **Google Workspace account:** 1,500 emails per day

**Best Practices:**
- Use Google Groups to send to many people with one email
- Each Google Group counts as 1 email, regardless of members
- Test with your own email first before sending to groups

---

## Next Steps

After setting up the sheets:
1. We'll add the Communications page route to Code.gs
2. Create the Communications.html page to view sent emails
3. Create the Compose.html page to send new emails
4. Add "Communications" link to the site header
5. Deploy and test!

---

## Features You'll Get

✅ **Compose Page:**
- Template selector (dropdown of templates from sheet)
- Group selector (multi-select checkboxes)
- Rich text editor for email body
- Subject line editor
- Preview before sending
- Send button

✅ **Communications Archive Page:**
- Grid/card view of all sent emails
- Shows subject, recipients, date sent, preview
- Click to view full email
- Search/filter capabilities
- Newest first

✅ **Automatic Archiving:**
- Every sent email automatically saved to Communications sheet
- Includes timestamp, recipients, template used, full content
