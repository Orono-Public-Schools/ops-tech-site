# Quick Setup Steps for Linking Your Existing Project

Follow these steps to connect this local folder to your existing Apps Script project.

## Step 1: Install Clasp

Open PowerShell or Command Prompt and run:

```bash
npm install -g @google/clasp
```

## Step 2: Login to Google

```bash
clasp login
```

This will open a browser window. Sign in with your Orono Google account.

## Step 3: Get Your Script ID

1. Open your Apps Script project in the browser
2. Go to **Project Settings** (gear icon on the left)
3. Scroll down and copy the **Script ID**
   - It looks like: `AKfycbwBiJzbG-3yHqH_t0UecdM2iUoUbNzp8v5WpXaWQv1rzAeATJgqALPa0pGl-lAjJ21Ipw`

## Step 4: Create .clasp.json File

1. Copy the `.clasp.json.template` file
2. Rename it to `.clasp.json`
3. Replace `YOUR_SCRIPT_ID_HERE` with your actual Script ID

The file should look like:
```json
{
  "scriptId": "YOUR_ACTUAL_SCRIPT_ID",
  "rootDir": "."
}
```

## Step 5: Test the Connection

Open PowerShell/Command Prompt in this folder and run:

```bash
clasp open
```

This should open your Apps Script project in the browser. If it works, you're connected!

## Step 6: Push Your Local Files

To upload all your local files to the Apps Script project:

```bash
clasp push
```

**WARNING:** This will overwrite all files in your online project with your local versions. Make sure your local files are up-to-date first!

If you want to see what will be pushed without actually pushing:

```bash
clasp push --dry-run
```

## Step 7: Install npm Dependencies (Optional)

To use the npm scripts from package.json:

```bash
npm install
```

Then you can use shortcuts like:
- `npm run push` instead of `clasp push`
- `npm run pull` instead of `clasp pull`
- `npm run open` instead of `clasp open`

## You're Done!

Now you can edit files locally and push changes with `clasp push` or `npm run push`.

## Common Commands

- `clasp pull` - Download latest from Google (do this before editing locally!)
- `clasp push` - Upload your local changes to Google
- `clasp open` - Open project in browser
- `clasp logs` - View execution logs
- `clasp deploy` - Create a new deployment

## Troubleshooting

If `clasp push` fails:
1. Make sure you ran `clasp login` first
2. Check that your `.clasp.json` has the correct Script ID
3. Make sure you have edit access to the Apps Script project

If you get "Manifest file has been updated":
- Run `clasp pull` first to get the latest manifest
- Then try `clasp push` again
