/**
 * Code.gs - Google Apps Script Backend
 *
 * This script fetches link data from a Google Sheet and serves it
 * through a web app interface using HTML templating.
 */

// Cache settings for performance optimization
var CACHE_DURATION = 1800; // 30 minutes in seconds

/**
 * getAllDataBatch() - Fetches ALL sheet data in one batch operation
 * This is much faster than reading sheets individually
 *
 * @return {Object} Object containing all data: {links, documentation, home, communications}
 */
function getAllDataBatch() {
  try {
    var cache = CacheService.getScriptCache();
    var cachedData = cache.get('allDataBatch');

    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        Logger.log('Batch cache parse failed: ' + e.toString());
      }
    }

    // Read all sheets in one operation
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var allData = {
      links: [],
      documentation: [],
      home: [],
      communications: []
    };

    // Get Links sheet
    var linksSheet = spreadsheet.getSheetByName('Links');
    if (linksSheet && linksSheet.getLastRow() >= 2) {
      var linksValues = linksSheet.getDataRange().getValues();
      for (var i = 1; i < linksValues.length; i++) {
        var row = linksValues[i];
        if (row[0]) {
          allData.links.push({
            TOOL_NAME: row[0],
            TOOL_URL: row[1],
            DESCRIPTION: row[2],
            ICON_CLASS: row[3],
            IMAGE_URL: row[4],
            CATEGORY: row[5]
          });
        }
      }
    }

    // Get Documentation sheet
    var docSheet = spreadsheet.getSheetByName('Documentation');
    if (docSheet && docSheet.getLastRow() >= 2) {
      var docValues = docSheet.getDataRange().getValues();
      for (var i = 1; i < docValues.length; i++) {
        var row = docValues[i];
        if (row[0]) {
          allData.documentation.push({
            DOCUMENTATION_TITLE: row[0],
            DOCUMENTATION_URL: row[1],
            DESCRIPTION: row[2],
            ICON_CLASS: row[3],
            IMAGE_URL: row[4],
            CATEGORY: row[5]
          });
        }
      }
    }

    // Get Home sheet
    var homeSheet = spreadsheet.getSheetByName('Home');
    if (homeSheet && homeSheet.getLastRow() >= 2) {
      var homeValues = homeSheet.getDataRange().getValues();
      for (var i = 1; i < homeValues.length; i++) {
        var row = homeValues[i];
        if (row[0]) {
          allData.home.push({
            PAGE_NAME: row[0],
            PAGE_URL: row[1],
            DESCRIPTION: row[2],
            ICON_CLASS: row[3],
            IMAGE_URL: row[4]
          });
        }
      }
    }

    // Get local Communications sheet
    var commSheet = spreadsheet.getSheetByName('Communications');
    if (commSheet && commSheet.getLastRow() >= 2) {
      var commValues = commSheet.getDataRange().getValues();
      for (var i = 1; i < commValues.length; i++) {
        var row = commValues[i];
        if (row[0]) {
          allData.communications.push({
            TIMESTAMP: row[0],
            SUBJECT: row[1],
            RECIPIENTS: row[2],
            TEMPLATE_USED: row[3],
            PREVIEW_TEXT: row[4],
            FULL_BODY_HTML: row[5]
          });
        }
      }
    }

    // Cache for 30 minutes
    try {
      cache.put('allDataBatch', JSON.stringify(allData), CACHE_DURATION);
    } catch (e) {
      Logger.log('Batch cache put failed: ' + e.toString());
    }

    return allData;

  } catch (error) {
    Logger.log('Error in getAllDataBatch: ' + error.toString());
    return {links: [], documentation: [], home: [], communications: []};
  }
}

/**
 * doGet() - Main entry point for the web app
 *
 * This function is automatically called when the web app URL is accessed.
 * Routes to different pages based on URL parameters.
 *
 * @param {Object} e - Event parameter containing query string parameters
 * @return {HtmlOutput} The rendered HTML page
 */
function doGet(e) {
  // ============================================================
  // The OPS Tech site moved to Firebase Hosting on 2026-07-23.
  // This web app now only redirects there; all routing below is
  // legacy and unreachable. New site: https://ops-tech.web.app
  // ============================================================
  return HtmlService.createHtmlOutput(
    '<script>window.top.location.href = "https://ops-tech.web.app";</script>' +
    '<html><head><style>' +
    'body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #2d3f69 0%, #1d2a5d 100%); }' +
    '.container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); text-align: center; max-width: 500px; }' +
    'h1 { color: #2d3f69; margin-bottom: 16px; } p { color: #666; line-height: 1.6; }' +
    'a { color: #ad2122; font-weight: bold; }' +
    '</style></head><body>' +
    '<div class="container">' +
    '<h1>We\'ve moved!</h1>' +
    '<p>The OPS Technology site now lives at</p>' +
    '<p><a href="https://ops-tech.web.app" target="_top">ops-tech.web.app</a></p>' +
    '<p>Redirecting you now&hellip; please update your bookmarks.</p>' +
    '</div></body></html>'
  ).setTitle('OPS Technology has moved')
   .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  // ---- Legacy routing below (unreachable since the redirect above) ----
  // Check if user has access to the web app
  if (!checkAccess()) {
    return HtmlService.createHtmlOutput(
      '<html><head><style>' +
      'body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #2d3f69 0%, #1d2a5d 100%); }' +
      '.container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); text-align: center; max-width: 500px; }' +
      'h1 { color: #2d3f69; margin-bottom: 20px; }' +
      'p { color: #666; line-height: 1.6; }' +
      '.material-icons { font-size: 64px; color: #ad2122; margin-bottom: 20px; }' +
      '</style>' +
      '<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">' +
      '</head><body>' +
      '<div class="container">' +
      '<span class="material-icons">lock</span>' +
      '<h1>Access Denied</h1>' +
      '<p>You do not have permission to access this application.</p>' +
      '<p>Please contact your administrator if you believe this is an error.</p>' +
      '</div></body></html>'
    ).setTitle('Access Denied');
  }

  // Check for page parameter in URL (e.g., ?page=documentation or ?page=links)
  var page = e.parameter.page || 'home';

  var template;

  if (page === 'home') {
    // Default: Create Home page template
    template = HtmlService.createTemplateFromFile('Home');

    // Fetch home page data from Google Sheet and pass to template
    template.homeData = getHomeData();
    template.currentPage = 'home';
    template.baseUrl = ScriptApp.getService().getUrl();
    template.userEmail = getCurrentUserEmail();

    // Evaluate and return the home page
    return template.evaluate()
      .setTitle('Orono Tech Department')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  } else if (page === 'documentation') {
    // Create Documentation page template
    template = HtmlService.createTemplateFromFile('Documentation');

    // Fetch documentation data from Google Sheet and pass to template
    template.documentationData = getDocumentationData();
    template.currentPage = 'documentation';
    template.baseUrl = ScriptApp.getService().getUrl();
    template.userEmail = getCurrentUserEmail();

    // Evaluate and return the documentation page
    return template.evaluate()
      .setTitle('Documentation')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  } else if (page === 'links') {
    // Create Tech Department Links page template
    template = HtmlService.createTemplateFromFile('Index');

    // Fetch link data from Google Sheet and pass to template
    template.linkData = getLinkData();
    template.currentPage = 'links';
    template.baseUrl = ScriptApp.getService().getUrl();
    template.userEmail = getCurrentUserEmail();

    // Evaluate and return the links page
    return template.evaluate()
      .setTitle('Tech Department Links')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  } else if (page === 'communications') {
    // Create Communications page template
    template = HtmlService.createTemplateFromFile('Communications');

    // Fetch communications data from Google Sheet and pass to template
    template.communicationsData = getCommunicationsData();
    template.currentPage = 'communications';
    template.baseUrl = ScriptApp.getService().getUrl();
    template.userEmail = getCurrentUserEmail();

    // Evaluate and return the communications page
    return template.evaluate()
      .setTitle('Communications')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  } else if (page === 'compose') {
    // Create Email Compose page template
    template = HtmlService.createTemplateFromFile('Compose');

    // Fetch email templates and groups
    template.emailTemplates = getEmailTemplates();
    template.emailGroups = getEmailGroups();
    template.currentPage = 'compose';
    template.baseUrl = ScriptApp.getService().getUrl();
    template.userEmail = getCurrentUserEmail();
    template.draftId = e.parameter.draftId || '';

    // Evaluate and return the compose page
    return template.evaluate()
      .setTitle('Compose Email')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  } else if (page === 'image-library') {
    // Create Image Library page template
    template = HtmlService.createTemplateFromFile('ImageLibrary');

    // Fetch images data
    template.imagesData = getImageList();
    template.currentPage = 'image-library';
    template.baseUrl = ScriptApp.getService().getUrl();
    template.userEmail = getCurrentUserEmail();

    // Evaluate and return the image library page
    return template.evaluate()
      .setTitle('Image Library')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  } else if (page === 'status') {
    // Create System Status page template
    template = HtmlService.createTemplateFromFile('Status');

    template.currentPage = 'status';
    template.baseUrl = ScriptApp.getService().getUrl();
    template.userEmail = getCurrentUserEmail();

    // Evaluate and return the status page
    return template.evaluate()
      .setTitle('System Status')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  } else {
    // If unknown page parameter, redirect to home
    template = HtmlService.createTemplateFromFile('Home');
    template.homeData = getHomeData();
    template.currentPage = 'home';
    template.baseUrl = ScriptApp.getService().getUrl();
    template.userEmail = getCurrentUserEmail();
    return template.evaluate()
      .setTitle('Orono Tech Department')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
}

/**
 * getCurrentUserEmail() - Gets the current user's email address
 *
 * @return {string} The user's email address
 */
function getCurrentUserEmail() {
  try {
    return Session.getActiveUser().getEmail();
  } catch (error) {
    Logger.log('Error getting user email: ' + error.toString());
    return 'Unknown User';
  }
}

/**
 * getLinkData() - Fetches and structures data from Google Sheet
 *
 * Reads data from the 'Links' sheet in 'Tech Dept Link Directory' spreadsheet
 * and converts it into an array of objects for easy template rendering.
 *
 * CONFIGURATION OPTIONS (Choose ONE):
 * 1. Use SPREADSHEET_ID if you know the spreadsheet ID
 * 2. Use SPREADSHEET_NAME if the script is NOT bound to the spreadsheet
 * 3. Use SpreadsheetApp.getActiveSpreadsheet() if the script IS bound to the spreadsheet
 *
 * @return {Array<Object>} Array of link objects with properties:
 *   - TOOL_NAME: Name of the tool/resource
 *   - TOOL_URL: Web app or resource URL
 *   - DESCRIPTION: Brief description of the tool
 *   - ICON_CLASS: Material Icons class name
 *   - IMAGE_URL: Custom image URL (overrides ICON_CLASS if provided)
 *   - CATEGORY: Category classification
 */
function getLinkData() {
  try {
    // Use batch data fetch for better performance (reads all sheets at once)
    var allData = getAllDataBatch();
    return allData.links;
  } catch (error) {
    Logger.log('Error fetching link data: ' + error.toString());
    return [];
  }
}

/**
 * getDocumentationData() - Fetches and structures documentation data from Google Sheet
 *
 * Reads data from the 'Documentation' sheet and converts it into an array of objects
 * for easy template rendering.
 *
 * @return {Array<Object>} Array of documentation objects with properties:
 *   - DOCUMENTATION_TITLE: Name of the document/resource
 *   - DOCUMENTATION_URL: Document URL (Google Doc, Slide, Sheet, PDF, etc.)
 *   - DESCRIPTION: Brief description of the document
 *   - ICON_CLASS: Material Icons class name (description, slideshow, grid_on, picture_as_pdf, etc.)
 *   - IMAGE_URL: Custom image URL (overrides ICON_CLASS if provided)
 *   - CATEGORY: Category classification
 */
function getDocumentationData() {
  try {
    // Use batch data fetch for better performance
    var allData = getAllDataBatch();
    return allData.documentation;
  } catch (error) {
    Logger.log('Error fetching documentation data: ' + error.toString());
    return [];
  }
}

/**
 * getHomeData() - Fetches and structures home page data from Google Sheet
 *
 * Reads data from the 'Home' sheet and converts it into an array of objects
 * for easy template rendering.
 *
 * @return {Array<Object>} Array of page objects with properties:
 *   - PAGE_NAME: Name of the page/section
 *   - PAGE_URL: URL to the page (can be ?page=links, ?page=documentation, or external URL)
 *   - DESCRIPTION: Brief description of the page
 *   - ICON_CLASS: Material Icons class name
 *   - IMAGE_URL: Custom image URL (overrides ICON_CLASS if provided)
 */
function getHomeData() {
  try {
    // Use batch data fetch for better performance
    var allData = getAllDataBatch();
    return allData.home;
  } catch (error) {
    Logger.log('Error fetching home data: ' + error.toString());
    return [];
  }
}

/**
 * getCommunicationsData() - Fetches sent email archive from Google Sheet
 *
 * Reads data from the 'Communications' sheet and converts it into an array of objects.
 *
 * @return {Array<Object>} Array of communication objects with properties:
 *   - TIMESTAMP: When email was sent
 *   - SUBJECT: Email subject line
 *   - RECIPIENTS: Who received it
 *   - TEMPLATE_USED: Template name (if any)
 *   - PREVIEW_TEXT: Preview of email content
 *   - FULL_BODY_HTML: Complete email HTML
 */
function getCommunicationsData() {
  try {
    // Try to get cached data first
    var cache = CacheService.getScriptCache();
    var cachedData = cache.get('communicationsData');

    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        // If parsing fails, continue to fetch fresh data
      }
    }

    // Get local communications
    var localComms = getLocalCommunicationsData();

    // Get newsletters from external sheet
    var newsletters = getNewsletterData();

    // Merge both arrays
    var communicationsArray = localComms.concat(newsletters);

    // Sort by timestamp, newest first
    communicationsArray.sort(function(a, b) {
      var dateA = new Date(a.TIMESTAMP);
      var dateB = new Date(b.TIMESTAMP);
      return dateB - dateA;
    });

    // Cache the data
    try {
      cache.put('communicationsData', JSON.stringify(communicationsArray), CACHE_DURATION);
    } catch (e) {
      Logger.log('Cache put failed: ' + e.toString());
    }

    return communicationsArray;

  } catch (error) {
    Logger.log('Error fetching communications data: ' + error.toString());
    return [];
  }
}

/**
 * getLocalCommunicationsData() - Fetches sent email archive from local Communications sheet
 *
 * @return {Array<Object>} Array of communication objects
 */
function getLocalCommunicationsData() {
  try {
    // Use batch data fetch for better performance
    var allData = getAllDataBatch();
    return allData.communications;
  } catch (error) {
    Logger.log('Error fetching local communications data: ' + error.toString());
    return [];
  }
}

/**
 * getNewsletterData() - Fetches newsletters from external sheet
 *
 * @return {Array<Object>} Array of newsletter objects formatted as communications
 */
function getNewsletterData() {
  try {
    // Try to get cached newsletter data first (cache for 60 minutes since newsletters change less frequently)
    var cache = CacheService.getScriptCache();
    var cachedData = cache.get('newsletterData');

    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        Logger.log('Newsletter cache parse failed: ' + e.toString());
      }
    }

    var NEWSLETTER_SHEET_ID = '1TZegmAUGXNUy6VIDAFWB2kWAhn8Ej0mjHAIvhfbp6_o';
    var externalSheet = SpreadsheetApp.openById(NEWSLETTER_SHEET_ID);
    var sheet = externalSheet.getSheets()[0];

    if (!sheet) {
      Logger.log('Info: External newsletter sheet not found.');
      return [];
    }

    var newslettersArray = [];

    // Read columns B through F (5 newsletters)
    var columns = ['B', 'C', 'D', 'E', 'F'];

    for (var c = 0; c < columns.length; c++) {
      var column = columns[c];
      var range = sheet.getRange(column + '1:' + column + '23');
      var values = range.getValues();

      // Extract newsletter data
      var date = values[0][0];
      var title = values[1][0];
      var subtitle = values[2][0];
      var recipients = values[19][0];
      var layoutStyle = values[22][0];

      // Skip if no date or title
      if (!date || !title) {
        continue;
      }

      // Convert date to ISO string for proper serialization
      var dateObj = (date instanceof Date) ? date : new Date(date);
      var timestamp = dateObj.toISOString();

      // Create preview text from subtitle and topic titles
      var previewParts = [];
      if (subtitle) previewParts.push(subtitle);
      if (values[3][0]) previewParts.push(values[3][0]);
      var previewText = previewParts.join(' • ');

      var newsletterObject = {
        TIMESTAMP: timestamp,
        SUBJECT: title,
        RECIPIENTS: recipients || 'Newsletter Recipients',
        TEMPLATE_USED: (layoutStyle || 'Offset') + ' Layout',
        PREVIEW_TEXT: previewText,
        FULL_BODY_HTML: '', // Will generate HTML on demand when viewing
        IS_NEWSLETTER: true,
        NEWSLETTER_COLUMN: column
      };

      newslettersArray.push(newsletterObject);
    }

    // Cache newsletter data for 60 minutes (3600 seconds) - newsletters change less frequently
    try {
      cache.put('newsletterData', JSON.stringify(newslettersArray), 3600);
    } catch (e) {
      Logger.log('Newsletter cache put failed: ' + e.toString());
    }

    return newslettersArray;

  } catch (error) {
    Logger.log('Error fetching newsletter data: ' + error.toString());
    return [];
  }
}

/**
 * generateNewsletterHTML() - Generates HTML for a newsletter from the external sheet
 *
 * @param {string} column - Column letter (B, C, D, E, or F)
 * @return {string} Generated newsletter HTML
 */
function generateNewsletterHTML(column) {
  try {
    // Strip any quotes from the column parameter
    var cleanColumn = String(column).replace(/['"]/g, '').trim().toUpperCase();

    Logger.log('Generating newsletter HTML for column: ' + cleanColumn + ' (original: ' + column + ')');

    var NEWSLETTER_SHEET_ID = '1TZegmAUGXNUy6VIDAFWB2kWAhn8Ej0mjHAIvhfbp6_o';

    Logger.log('Attempting to open external sheet with ID: ' + NEWSLETTER_SHEET_ID);
    var externalSheet = SpreadsheetApp.openById(NEWSLETTER_SHEET_ID);

    if (!externalSheet) {
      throw new Error('Could not open external spreadsheet');
    }

    var sheet = externalSheet.getSheets()[0];

    if (!sheet) {
      throw new Error('No sheets found in external spreadsheet');
    }

    Logger.log('Successfully accessed sheet: ' + sheet.getName());

    // Read the column data (rows 1-23)
    var rangeNotation = cleanColumn + '1:' + cleanColumn + '23';
    Logger.log('Reading range: ' + rangeNotation);
    var range = sheet.getRange(rangeNotation);
    var values = range.getValues();

    Logger.log('Successfully read ' + values.length + ' rows from column ' + cleanColumn);

    // Extract all the newsletter fields
    var data = {
      date: values[0][0],
      title: values[1][0],
      subtitle: values[2][0],
      topic1: {
        title: values[3][0],
        url: values[4][0],
        description: values[5][0],
        buttonText: values[6][0],
        buttonUrl: values[7][0]
      },
      topic2: {
        title: values[8][0],
        url: values[9][0],
        description: values[10][0],
        buttonText: values[11][0],
        buttonUrl: values[12][0]
      },
      topic3: {
        title: values[13][0],
        url: values[14][0],
        description: values[15][0],
        buttonText: values[16][0],
        buttonUrl: values[17][0]
      },
      finalButtonUrl: values[18][0],
      to: values[19][0],
      cc: values[20][0],
      bcc: values[21][0],
      layoutStyle: values[22][0] || 'offset'
    };

    // Generate a simple HTML representation of the newsletter
    var html = '<div style="font-family: Roboto, Arial, sans-serif; max-width: 800px; margin: 0 auto;">';
    html += '<div style="background: linear-gradient(135deg, #2d3f89 0%, #4356a0 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">';

    if (data.date) {
      html += '<div style="opacity: 0.9; font-size: 14px; margin-bottom: 12px;">' + Utilities.formatDate(new Date(data.date), Session.getScriptTimeZone(), 'MMMM d, yyyy') + '</div>';
    }

    if (data.title) {
      html += '<h1 style="font-size: 32px; margin: 0 0 12px 0;">' + data.title + '</h1>';
    }

    if (data.subtitle) {
      html += '<p style="font-size: 18px; margin: 0; opacity: 0.9;">' + data.subtitle + '</p>';
    }

    html += '</div>';

    // Add topics
    var topics = [data.topic1, data.topic2, data.topic3].filter(function(t) {
      return t.title && (t.url || t.description);
    });

    for (var i = 0; i < topics.length; i++) {
      var topic = topics[i];
      html += '<div style="background: white; padding: 30px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">';
      html += '<h2 style="color: #2d3f89; font-size: 24px; margin: 0 0 16px 0;">' + topic.title + '</h2>';

      if (topic.url) {
        html += '<img src="' + convertDriveImageUrl(topic.url) + '" alt="' + topic.title + '" style="max-width: 100%; height: auto; border-radius: 6px; margin-bottom: 16px;">';
      }

      if (topic.description) {
        html += '<div style="color: #4a4a4a; line-height: 1.6; margin-bottom: 16px;">' + topic.description + '</div>';
      }

      if (topic.buttonText && topic.buttonUrl) {
        html += '<a href="' + topic.buttonUrl + '" style="display: inline-block; background: #2d3f89; color: white; padding: 10px 22px; border-radius: 4px; text-decoration: none; font-weight: 600;">' + topic.buttonText + '</a>';
      }

      html += '</div>';
    }

    if (data.finalButtonUrl) {
      html += '<div style="background: white; padding: 40px; text-align: center; margin: 20px 0; border-radius: 8px; border-top: 4px solid #ad2122;">';
      html += '<h3 style="color: #2d3f89; margin: 0 0 20px 0;">Ready to Learn More?</h3>';
      html += '<a href="' + data.finalButtonUrl + '" style="display: inline-block; background: #ad2122; color: white; padding: 10px 22px; border-radius: 4px; text-decoration: none; font-weight: 600;">Visit the OPS Digital Learning Hub</a>';
      html += '</div>';
    }

    html += '</div>';

    return html;

  } catch (error) {
    Logger.log('Error generating newsletter HTML: ' + error.toString());
    Logger.log('Error stack: ' + error.stack);
    return '<div style="padding: 40px; text-align: center;"><h3 style="color: #ad2122;">Error Loading Newsletter</h3><p style="color: #666; margin-top: 10px;">' + error.toString() + '</p><p style="color: #999; font-size: 12px; margin-top: 10px;">Check the execution log for more details.</p></div>';
  }
}

/**
 * convertDriveImageUrl() - Converts Google Drive share URL to direct image URL
 *
 * @param {string} url - Google Drive URL
 * @return {string} Direct image URL
 */
function convertDriveImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  var match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? 'https://drive.google.com/uc?export=view&id=' + match[1] : url;
}

/**
 * getEmailTemplates() - Returns 3 newsletter layout templates (Hero, Stacked, Offset)
 *
 * @return {Array<Object>} Array of 3 layout template objects with placeholder HTML
 */
function getEmailTemplates() {
  // Check cache first - templates are static so cache for longer
  var cache = CacheService.getScriptCache();
  var cachedData = cache.get('emailTemplates');

  if (cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch (e) {
      Logger.log('Email templates cache parse error: ' + e.toString());
    }
  }

  var BRAND_COLORS = {
    primaryBlue: '#2d3f89',
    primaryRed: '#ad2122',
    primaryGray: '#4a4a4a'
  };

  var templatesArray = [
    {
      TEMPLATE_NAME: 'Hero Layout',
      SUBJECT_TEMPLATE: 'Newsletter Update',
      DESCRIPTION: 'Large hero topic at top, then two side-by-side topics below',
      BODY_HTML: '<div style="font-family: Roboto, Arial, sans-serif; max-width: 800px; margin: 0 auto; background: #f0f2f5; padding: 20px;"><div style="background: linear-gradient(135deg, ' + BRAND_COLORS.primaryBlue + ' 0%, #4356a0 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="font-size: 32px; margin: 0 0 12px 0;">Newsletter Title</h1><p style="font-size: 18px; margin: 0; opacity: 0.9;">Brief subtitle goes here</p></div><div style="background: white; padding: 30px; margin: 20px 0; border-radius: 8px; border-top: 4px solid ' + BRAND_COLORS.primaryRed + ';"><h2 style="color: ' + BRAND_COLORS.primaryBlue + '; font-size: 26px; margin: 0 0 16px 0; text-align: center;">Main Topic Title</h2><p style="color: ' + BRAND_COLORS.primaryGray + '; line-height: 1.6; text-align: center;">Add your main topic description here. This is your featured content.</p><div style="text-align: center; margin-top: 25px;"><a href="#" style="display: inline-block; background: ' + BRAND_COLORS.primaryBlue + '; color: white; padding: 10px 22px; border-radius: 4px; text-decoration: none; font-weight: 600;">LEARN MORE</a></div></div><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="48%" valign="top"><div style="background: white; padding: 25px; border-radius: 8px; border-top: 4px solid ' + BRAND_COLORS.primaryBlue + ';"><h2 style="color: ' + BRAND_COLORS.primaryBlue + '; font-size: 20px; margin: 0 0 14px 0;">Topic 2</h2><p style="color: ' + BRAND_COLORS.primaryGray + '; font-size: 15px; line-height: 1.5;">Description for second topic.</p></div></td><td width="4%"></td><td width="48%" valign="top"><div style="background: white; padding: 25px; border-radius: 8px; border-top: 4px solid ' + BRAND_COLORS.primaryBlue + ';"><h2 style="color: ' + BRAND_COLORS.primaryBlue + '; font-size: 20px; margin: 0 0 14px 0;">Topic 3</h2><p style="color: ' + BRAND_COLORS.primaryGray + '; font-size: 15px; line-height: 1.5;">Description for third topic.</p></div></td></tr></table></div>'
    },
    {
      TEMPLATE_NAME: 'Stacked Layout',
      SUBJECT_TEMPLATE: 'Newsletter Update',
      DESCRIPTION: 'Full-width topics stacked vertically, one after another',
      BODY_HTML: '<div style="font-family: Roboto, Arial, sans-serif; max-width: 800px; margin: 0 auto; background: #f0f2f5; padding: 20px;"><div style="background: linear-gradient(135deg, ' + BRAND_COLORS.primaryBlue + ' 0%, #4356a0 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="font-size: 32px; margin: 0 0 12px 0;">Newsletter Title</h1><p style="font-size: 18px; margin: 0; opacity: 0.9;">Brief subtitle goes here</p></div><div style="background: white; padding: 30px; margin: 20px 0; border-radius: 8px; border-top: 4px solid ' + BRAND_COLORS.primaryBlue + ';"><h2 style="color: ' + BRAND_COLORS.primaryBlue + '; font-size: 24px; margin: 0 0 16px 0;">Topic 1 Title</h2><p style="color: ' + BRAND_COLORS.primaryGray + '; line-height: 1.6; margin-bottom: 16px;">Add your topic 1 description here.</p><a href="#" style="display: inline-block; background: ' + BRAND_COLORS.primaryBlue + '; color: white; padding: 10px 22px; border-radius: 4px; text-decoration: none; font-weight: 600;">LEARN MORE</a></div><div style="background: white; padding: 30px; margin: 20px 0; border-radius: 8px; border-top: 4px solid ' + BRAND_COLORS.primaryBlue + ';"><h2 style="color: ' + BRAND_COLORS.primaryBlue + '; font-size: 24px; margin: 0 0 16px 0;">Topic 2 Title</h2><p style="color: ' + BRAND_COLORS.primaryGray + '; line-height: 1.6; margin-bottom: 16px;">Add your topic 2 description here.</p><a href="#" style="display: inline-block; background: ' + BRAND_COLORS.primaryBlue + '; color: white; padding: 10px 22px; border-radius: 4px; text-decoration: none; font-weight: 600;">LEARN MORE</a></div><div style="background: white; padding: 30px; margin: 20px 0; border-radius: 8px; border-top: 4px solid ' + BRAND_COLORS.primaryBlue + ';"><h2 style="color: ' + BRAND_COLORS.primaryBlue + '; font-size: 24px; margin: 0 0 16px 0;">Topic 3 Title</h2><p style="color: ' + BRAND_COLORS.primaryGray + '; line-height: 1.6; margin-bottom: 16px;">Add your topic 3 description here.</p><a href="#" style="display: inline-block; background: ' + BRAND_COLORS.primaryBlue + '; color: white; padding: 10px 22px; border-radius: 4px; text-decoration: none; font-weight: 600;">LEARN MORE</a></div></div>'
    },
    {
      TEMPLATE_NAME: 'Offset Layout',
      SUBJECT_TEMPLATE: 'Newsletter Update',
      DESCRIPTION: 'Alternating image-left and image-right for visual variety',
      BODY_HTML: '<div style="font-family: Roboto, Arial, sans-serif; max-width: 800px; margin: 0 auto; background: #f0f2f5; padding: 20px;"><div style="background: linear-gradient(135deg, ' + BRAND_COLORS.primaryBlue + ' 0%, #4356a0 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="font-size: 32px; margin: 0 0 12px 0;">Newsletter Title</h1><p style="font-size: 18px; margin: 0; opacity: 0.9;">Brief subtitle goes here</p></div><div style="background: white; padding: 30px; margin: 20px 0; border-radius: 8px; border-top: 4px solid ' + BRAND_COLORS.primaryBlue + ';"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="220" style="padding-right: 30px; vertical-align: top;"><div style="width: 220px; height: 150px; background: #e0e0e0; border-radius: 6px;"></div></td><td style="vertical-align: top;"><h2 style="color: ' + BRAND_COLORS.primaryBlue + '; font-size: 22px; margin: 0 0 12px 0;">Topic 1 Title</h2><p style="color: ' + BRAND_COLORS.primaryGray + '; line-height: 1.6;">Add your topic 1 description here.</p><div style="margin-top: 18px;"><a href="#" style="display: inline-block; background: ' + BRAND_COLORS.primaryBlue + '; color: white; padding: 10px 22px; border-radius: 4px; text-decoration: none; font-weight: 600;">LEARN MORE</a></div></td></tr></table></div><div style="background: white; padding: 30px; margin: 20px 0; border-radius: 8px; border-top: 4px solid ' + BRAND_COLORS.primaryBlue + ';"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="vertical-align: top;"><h2 style="color: ' + BRAND_COLORS.primaryBlue + '; font-size: 22px; margin: 0 0 12px 0;">Topic 2 Title</h2><p style="color: ' + BRAND_COLORS.primaryGray + '; line-height: 1.6;">Add your topic 2 description here.</p><div style="margin-top: 18px;"><a href="#" style="display: inline-block; background: ' + BRAND_COLORS.primaryBlue + '; color: white; padding: 10px 22px; border-radius: 4px; text-decoration: none; font-weight: 600;">LEARN MORE</a></div></td><td width="220" style="padding-left: 30px; vertical-align: top;"><div style="width: 220px; height: 150px; background: #e0e0e0; border-radius: 6px;"></div></td></tr></table></div><div style="background: white; padding: 30px; margin: 20px 0; border-radius: 8px; border-top: 4px solid ' + BRAND_COLORS.primaryBlue + ';"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="220" style="padding-right: 30px; vertical-align: top;"><div style="width: 220px; height: 150px; background: #e0e0e0; border-radius: 6px;"></div></td><td style="vertical-align: top;"><h2 style="color: ' + BRAND_COLORS.primaryBlue + '; font-size: 22px; margin: 0 0 12px 0;">Topic 3 Title</h2><p style="color: ' + BRAND_COLORS.primaryGray + '; line-height: 1.6;">Add your topic 3 description here.</p><div style="margin-top: 18px;"><a href="#" style="display: inline-block; background: ' + BRAND_COLORS.primaryBlue + '; color: white; padding: 10px 22px; border-radius: 4px; text-decoration: none; font-weight: 600;">LEARN MORE</a></div></td></tr></table></div></div>'
    }
  ];

  // Cache for 6 hours since templates are static
  try {
    cache.put('emailTemplates', JSON.stringify(templatesArray), 21600);
  } catch (e) {
    Logger.log('Failed to cache email templates: ' + e.toString());
  }

  return templatesArray;
}

/**
 * getEmailGroups() - Fetches email groups from Google Sheet
 *
 * @return {Array<Object>} Array of group objects
 */
function getEmailGroups() {
  try {
    // Check cache first
    var cache = CacheService.getScriptCache();
    var cachedData = cache.get('emailGroups');

    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        Logger.log('Email groups cache parse error: ' + e.toString());
      }
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('EmailGroups');

    if (!sheet) {
      Logger.log('Error: Sheet named "EmailGroups" not found.');
      return [];
    }

    var lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return [];
    }

    var dataRange = sheet.getRange('A2:C' + lastRow);
    var values = dataRange.getValues();

    var groupsArray = [];

    for (var i = 0; i < values.length; i++) {
      var row = values[i];

      if (row[0] === '' || row[0] == null) {
        continue;
      }

      var groupObject = {
        GROUP_NAME: row[0],
        GROUP_EMAIL: row[1],
        DESCRIPTION: row[2]
      };

      groupsArray.push(groupObject);
    }

    // Cache the result
    try {
      cache.put('emailGroups', JSON.stringify(groupsArray), CACHE_DURATION);
    } catch (e) {
      Logger.log('Failed to cache email groups: ' + e.toString());
    }

    return groupsArray;

  } catch (error) {
    Logger.log('Error fetching email groups: ' + error.toString());
    return [];
  }
}

/**
 * sendCommunicationEmail() - Sends an email and archives it
 *
 * @param {string} subject - Email subject
 * @param {string} bodyHtml - HTML email body
 * @param {Array<string>} selectedGroups - Array of group names
 * @param {string} templateUsed - Name of template used (optional)
 * @return {Object} Success/failure result
 */
function sendCommunicationEmail(subject, bodyHtml, selectedGroups, templateUsed, individualRecipients) {
  try {
    // Get email groups to resolve names to emails
    var allGroups = getEmailGroups();
    var toEmails = [];
    var ccEmails = [];
    var bccEmails = [];
    var recipientNames = [];

    // Build recipient list from selected groups (add to TO field)
    for (var i = 0; i < selectedGroups.length; i++) {
      var groupName = selectedGroups[i];
      recipientNames.push(groupName);

      // Find the group email
      for (var j = 0; j < allGroups.length; j++) {
        if (allGroups[j].GROUP_NAME === groupName) {
          toEmails.push(allGroups[j].GROUP_EMAIL);
          break;
        }
      }
    }

    // Add individual recipients if provided
    if (individualRecipients) {
      if (individualRecipients.to && individualRecipients.to.length > 0) {
        toEmails = toEmails.concat(individualRecipients.to);
        recipientNames.push(individualRecipients.to.join(', '));
      }
      if (individualRecipients.cc && individualRecipients.cc.length > 0) {
        ccEmails = individualRecipients.cc;
        recipientNames.push('Cc: ' + individualRecipients.cc.join(', '));
      }
      if (individualRecipients.bcc && individualRecipients.bcc.length > 0) {
        bccEmails = individualRecipients.bcc;
        recipientNames.push('Bcc: ' + individualRecipients.bcc.join(', '));
      }
    }

    // Validate: must have at least one recipient
    if (toEmails.length === 0 && ccEmails.length === 0 && bccEmails.length === 0) {
      return { success: false, message: 'No valid recipients selected.' };
    }

    // Get sender configuration from Config sheet
    var senderEmail = getConfigValue('SENDER_EMAIL');
    var senderName = getConfigValue('SENDER_NAME') || 'Orono Tech Department';

    // Build email options
    var emailOptions = {
      htmlBody: bodyHtml,
      name: senderName
    };

    if (ccEmails.length > 0) {
      emailOptions.cc = ccEmails.join(', ');
    }
    if (bccEmails.length > 0) {
      emailOptions.bcc = bccEmails.join(', ');
    }

    // If a sender email is configured, use it with the 'from' option
    if (senderEmail && senderEmail !== '') {
      emailOptions.from = senderEmail;
    }

    // Send email
    var toRecipientsString = toEmails.length > 0 ? toEmails.join(', ') : ccEmails[0];

    GmailApp.sendEmail(
      toRecipientsString,
      subject,
      'This email requires HTML support.',
      emailOptions
    );

    // Archive to Communications sheet
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Communications');

    if (sheet) {
      var timestamp = new Date();
      var previewText = bodyHtml.replace(/<[^>]*>/g, '').substring(0, 200); // Strip HTML tags for preview

      sheet.appendRow([
        timestamp,
        subject,
        recipientNames.join(', '),
        templateUsed || 'Custom',
        previewText,
        bodyHtml
      ]);
    }

    // Clear cache so new communication appears immediately
    var cache = CacheService.getScriptCache();
    cache.remove('communicationsData');

    return {
      success: true,
      message: 'Email sent successfully!'
    };

  } catch (error) {
    Logger.log('Error sending email: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * sendPreviewEmail() - Sends a preview email to the current user only
 *
 * @param {string} subject - Email subject line
 * @param {string} bodyHtml - HTML body content
 * @param {string} templateUsed - Template name used
 * @return {Object} Result object with success status and message
 */
function sendPreviewEmail(subject, bodyHtml, templateUsed) {
  try {
    var userEmail = getCurrentUserEmail();

    // Get sender configuration from Config sheet
    var senderName = getConfigValue('SENDER_NAME') || 'Orono Tech Department';

    // Build email options
    var emailOptions = {
      htmlBody: bodyHtml,
      name: senderName
    };

    // Send preview email to current user only
    GmailApp.sendEmail(
      userEmail,
      subject,
      'This email requires HTML support.',
      emailOptions
    );

    return {
      success: true,
      message: 'Preview email sent to ' + userEmail + '!'
    };

  } catch (error) {
    Logger.log('Error sending preview email: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * saveDraft() - Saves an email draft for the current user
 *
 * @param {Object} draftData - Draft data object with template, subject, subheading, and topics
 * @param {string} draftId - Optional draft ID for updating existing draft
 * @return {Object} Result object with success status, message, and draftId
 */
function saveDraft(draftData, draftId) {
  try {
    var userProperties = PropertiesService.getUserProperties();

    // Get existing drafts
    var draftsJson = userProperties.getProperty('emailDrafts');
    var drafts = draftsJson ? JSON.parse(draftsJson) : [];

    // Generate or use existing draft ID
    var id = draftId || 'draft_' + new Date().getTime();
    var timestamp = new Date().toISOString();

    // Create draft object with preview
    var draft = {
      id: id,
      template: draftData.template,
      subject: draftData.subject,
      subheading: draftData.subheading,
      intro: draftData.intro || '',
      outro: draftData.outro || '',
      headerIcon: draftData.headerIcon || {},
      topics: draftData.topics,
      timestamp: timestamp,
      preview: (draftData.subject || 'Untitled Draft')
    };

    // Update existing draft or add new one
    var existingIndex = drafts.findIndex(function(d) { return d.id === id; });
    if (existingIndex >= 0) {
      drafts[existingIndex] = draft;
    } else {
      drafts.push(draft);
    }

    // Keep only last 10 drafts
    if (drafts.length > 10) {
      drafts.sort(function(a, b) {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      drafts = drafts.slice(0, 10);
    }

    // Save updated drafts
    userProperties.setProperty('emailDrafts', JSON.stringify(drafts));

    return {
      success: true,
      message: 'Draft saved successfully',
      draftId: id
    };

  } catch (error) {
    Logger.log('Error saving draft: ' + error.toString());
    return {
      success: false,
      message: 'Error saving draft: ' + error.toString()
    };
  }
}

/**
 * getAllDrafts() - Gets all saved drafts for the current user
 *
 * @return {Array<Object>} Array of draft objects
 */
function getAllDrafts() {
  try {
    var userProperties = PropertiesService.getUserProperties();
    var draftsJson = userProperties.getProperty('emailDrafts');

    if (!draftsJson) {
      return [];
    }

    var drafts = JSON.parse(draftsJson);

    // Sort by timestamp, newest first
    drafts.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return drafts;

  } catch (error) {
    Logger.log('Error getting all drafts: ' + error.toString());
    return [];
  }
}

/**
 * loadDraft() - Loads a specific draft by ID
 *
 * @param {string} draftId - The ID of the draft to load
 * @return {Object} Draft data object or null if not found
 */
function loadDraft(draftId) {
  try {
    var userProperties = PropertiesService.getUserProperties();
    var draftsJson = userProperties.getProperty('emailDrafts');

    if (!draftsJson) {
      return null;
    }

    var drafts = JSON.parse(draftsJson);
    var draft = drafts.find(function(d) { return d.id === draftId; });

    return draft || null;

  } catch (error) {
    Logger.log('Error loading draft: ' + error.toString());
    return null;
  }
}

/**
 * deleteDraft() - Deletes a specific draft by ID
 *
 * @param {string} draftId - The ID of the draft to delete
 * @return {Object} Result object with success status
 */
function deleteDraft(draftId) {
  try {
    var userProperties = PropertiesService.getUserProperties();
    var draftsJson = userProperties.getProperty('emailDrafts');

    if (!draftsJson) {
      return {
        success: true,
        message: 'No drafts to delete'
      };
    }

    var drafts = JSON.parse(draftsJson);

    // Filter out the draft to delete
    var updatedDrafts = drafts.filter(function(d) { return d.id !== draftId; });

    // Save updated drafts
    if (updatedDrafts.length > 0) {
      userProperties.setProperty('emailDrafts', JSON.stringify(updatedDrafts));
    } else {
      userProperties.deleteProperty('emailDrafts');
    }

    return {
      success: true,
      message: 'Draft deleted'
    };

  } catch (error) {
    Logger.log('Error deleting draft: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * archiveManualEmail() - Archives an email that was sent manually from Gmail
 *
 * @param {string} subject - Email subject line
 * @param {string} bodyHtml - HTML body content
 * @param {string} templateUsed - Template name used
 * @return {Object} Result object with success status and message
 */
function archiveManualEmail(subject, bodyHtml, templateUsed) {
  try {
    // Archive to Communications sheet
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Communications');

    if (!sheet) {
      return {
        success: false,
        message: 'Communications sheet not found'
      };
    }

    var timestamp = new Date();
    var previewText = bodyHtml.replace(/<[^>]*>/g, '').substring(0, 200); // Strip HTML tags for preview

    sheet.appendRow([
      timestamp,
      subject,
      'Sent manually from Gmail',
      templateUsed || 'Custom',
      previewText,
      bodyHtml
    ]);

    // Clear cache so new communication appears immediately
    var cache = CacheService.getScriptCache();
    cache.remove('communicationsData');

    return {
      success: true,
      message: 'Email archived to Communications sheet!'
    };

  } catch (error) {
    Logger.log('Error archiving manual email: ' + error.toString());
    return {
      success: false,
      message: 'Error: ' + error.toString()
    };
  }
}

/**
 * include() - Helper function to include other HTML files (if needed)
 *
 * This allows you to modularize your HTML/CSS/JS into separate files.
 * Usage in template: <?!= include('Stylesheet') ?>
 *
 * @param {string} filename - Name of the HTML file to include (without .html)
 * @param {Object} data - Optional data object to pass to the template
 * @return {string} Content of the file
 */
function include(filename, data) {
  var template = HtmlService.createTemplateFromFile(filename);

  // If data is provided, assign all properties to the template
  if (data) {
    for (var key in data) {
      template[key] = data[key];
    }
  }

  return template.evaluate().getContent();
}

/**
 * clearCache() - Clears all cached data
 *
 * Call this function after making changes to your sheets to ensure
 * the web app displays updated data immediately.
 */
function clearCache() {
  try {
    var cache = CacheService.getScriptCache();
    cache.removeAll(['linkData', 'documentationData', 'homeData', 'communicationsData']);
    Logger.log('Cache cleared successfully');
    SpreadsheetApp.getUi().alert('Cache cleared! Your changes will appear immediately on the web app.');
  } catch (error) {
    Logger.log('Error clearing cache: ' + error.toString());
  }
}

/**
 * getSpreadsheetUrl() - Returns the URL of the active spreadsheet
 *
 * @return {string} The spreadsheet URL
 */
function getSpreadsheetUrl() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet().getUrl();
  } catch (error) {
    Logger.log('Error getting spreadsheet URL: ' + error.toString());
    return '';
  }
}

/**
 * onOpen() - Adds custom menu to spreadsheet when opened
 *
 * This function automatically runs when the spreadsheet is opened
 * and adds a custom menu with image management options.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Tech Dept Manager')
    .addSubMenu(ui.createMenu('Add New')
      .addItem('Add Page (Home)', 'showAddPageDialog')
      .addItem('Add Link', 'showAddLinkDialog')
      .addItem('Add Documentation', 'showAddDocumentationDialog')
      .addSeparator()
      .addItem('Add Image', 'showAddImageDialog'))
    .addSeparator()
    .addItem('View All Images', 'showImageList')
    .addSeparator()
    .addItem('Clear Cache', 'clearCache')
    .addSeparator()
    .addSubMenu(ui.createMenu('Settings')
      .addItem('Create Config Sheet', 'createConfigSheet')
      .addItem('Create Monitored Systems Sheet', 'createMonitoredSystemsSheet'))
    .addToUi();
}

/**
 * showAddImageDialog() - Shows dialog to add new image
 *
 * Opens a dialog box where user can enter image description and Google Drive link.
 * The link is automatically converted to the proper lh3.googleusercontent.com format.
 */
function showAddImageDialog() {
  var html = HtmlService.createHtmlOutputFromFile('AddImageDialog')
    .setWidth(500)
    .setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add New Image');
}

/**
 * extractDriveId() - Extracts file ID from Google Drive URL
 *
 * @param {string} driveUrl - Google Drive URL in any format
 * @return {string} File ID or empty string if not found
 */
function extractDriveId(driveUrl) {
  // Handle various Google Drive URL formats:
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/open?id=FILE_ID
  // https://drive.google.com/uc?id=FILE_ID
  // https://lh3.googleusercontent.com/d/FILE_ID (already converted)

  try {
    // Check if already in lh3 format
    if (driveUrl.includes('lh3.googleusercontent.com/d/')) {
      var parts = driveUrl.split('/d/');
      if (parts.length > 1) {
        return parts[1].split('?')[0].split('/')[0];
      }
    }

    // Extract from /file/d/ format
    if (driveUrl.includes('/file/d/')) {
      var parts = driveUrl.split('/file/d/');
      if (parts.length > 1) {
        return parts[1].split('/')[0];
      }
    }

    // Extract from ?id= format
    if (driveUrl.includes('?id=') || driveUrl.includes('&id=')) {
      var match = driveUrl.match(/[?&]id=([^&]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // If it's just the ID itself
    if (driveUrl.length > 20 && driveUrl.length < 50 && !driveUrl.includes('/') && !driveUrl.includes('?')) {
      return driveUrl;
    }

    return '';
  } catch (error) {
    Logger.log('Error extracting Drive ID: ' + error.toString());
    return '';
  }
}

/**
 * addImageToSheet() - Adds new image to Image_URLS sheet
 *
 * @param {string} description - Description of the image
 * @param {string} imageUrl - Google Drive URL or any direct image URL
 * @param {string} category - Category for the image (optional, defaults to 'Uncategorized')
 * @return {Object} Result object with success status and message
 */
function addImageToSheet(description, imageUrl, category) {
  try {
    // Validate inputs
    if (!description || description.trim() === '') {
      return {
        success: false,
        message: 'Please enter an image description.'
      };
    }

    if (!imageUrl || imageUrl.trim() === '') {
      return {
        success: false,
        message: 'Please enter an image URL.'
      };
    }

    var finalUrl;
    var urlTrimmed = imageUrl.trim();

    // Try to extract Google Drive ID
    var fileId = extractDriveId(urlTrimmed);

    if (fileId !== '') {
      // It's a Google Drive URL - convert to lh3 format
      finalUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
    } else {
      // Not a Google Drive URL - use as-is (direct image URL)
      // Validate it looks like a URL
      if (!urlTrimmed.startsWith('http://') && !urlTrimmed.startsWith('https://')) {
        return {
          success: false,
          message: 'URL must start with http:// or https://, or be a valid Google Drive URL.'
        };
      }
      finalUrl = urlTrimmed;
    }

    // Access the Image_URLS sheet
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Image_URLS');

    // Check if sheet exists, create if not
    if (!sheet) {
      sheet = spreadsheet.insertSheet('Image_URLS');
      // Add headers
      sheet.getRange('A1').setValue('Image Description');
      sheet.getRange('B1').setValue('Image URL');
      sheet.getRange('C1').setValue('Category');
      sheet.getRange('A1:C1').setFontWeight('bold');
    }

    // Find next empty row
    var lastRow = sheet.getLastRow();
    var nextRow = lastRow + 1;

    // Add data - batch write for better performance
    var rowData = [description.trim(), finalUrl, category || 'Uncategorized'];
    sheet.getRange(nextRow, 1, 1, 3).setValues([rowData]);

    // Clear relevant cache
    try {
      var cache = CacheService.getScriptCache();
      cache.remove('imageList');
    } catch (e) {
      // Cache clear failed, continue
    }

    return {
      success: true,
      message: 'Image added successfully!\n\nDescription: ' + description + '\nURL: ' + finalUrl,
      url: finalUrl
    };

  } catch (error) {
    return {
      success: false,
      message: 'Error adding image: ' + error.toString()
    };
  }
}

/**
 * Add multiple images to the Image_URLS sheet
 * @param {Array} bulkImages - Array of {description, url, category} objects
 * @return {Object} Result object with success status and message
 */
function addBulkImagesToSheet(bulkImages) {
  try {
    if (!bulkImages || !Array.isArray(bulkImages) || bulkImages.length === 0) {
      return {
        success: false,
        message: 'No images provided.'
      };
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Image_URLS');

    // Check if sheet exists, create if not
    if (!sheet) {
      sheet = spreadsheet.insertSheet('Image_URLS');
      // Add headers
      sheet.getRange('A1').setValue('Image Description');
      sheet.getRange('B1').setValue('Image URL');
      sheet.getRange('C1').setValue('Category');
      sheet.getRange('A1:C1').setFontWeight('bold');
    }

    var lastRow = sheet.getLastRow();
    var rowsToAdd = [];
    var processedCount = 0;
    var errors = [];

    // Process each image
    for (var i = 0; i < bulkImages.length; i++) {
      var image = bulkImages[i];
      var description = String(image.description || '').trim();
      var imageUrl = String(image.url || '').trim();
      var category = String(image.category || 'Uncategorized').trim();

      // Validate
      if (!description || !imageUrl) {
        errors.push('Row ' + (i + 1) + ': Missing description or URL');
        continue;
      }

      var finalUrl;
      var fileId = extractDriveId(imageUrl);

      if (fileId !== '') {
        // It's a Google Drive URL - convert to lh3 format
        finalUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
      } else {
        // Not a Google Drive URL - validate and use as-is
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          errors.push('Row ' + (i + 1) + ': URL must start with http:// or https://');
          continue;
        }
        finalUrl = imageUrl;
      }

      // Add to rows array
      rowsToAdd.push([description, finalUrl, category]);
      processedCount++;
    }

    // Write all rows at once for better performance
    if (rowsToAdd.length > 0) {
      var startRow = lastRow + 1;
      sheet.getRange(startRow, 1, rowsToAdd.length, 3).setValues(rowsToAdd);
    }

    // Clear cache
    try {
      var cache = CacheService.getScriptCache();
      cache.remove('imageList');
    } catch (e) {
      // Cache clear failed, continue
    }

    var message = 'Successfully added ' + processedCount + ' image' + (processedCount !== 1 ? 's' : '') + '!';
    if (errors.length > 0) {
      message += '\n\nWarnings:\n' + errors.join('\n');
    }

    return {
      success: true,
      message: message
    };

  } catch (error) {
    return {
      success: false,
      message: 'Error adding images: ' + error.toString()
    };
  }
}

/**
 * showImageList() - Shows list of all images in Image_URLS sheet
 *
 * Opens a sidebar showing all images with their descriptions and URLs
 * for easy reference and copy/paste.
 */
function showImageList() {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Image_URLS');

    if (!sheet) {
      SpreadsheetApp.getUi().alert('No Image_URLS sheet found. Add an image first to create the sheet.');
      return;
    }

    var html = HtmlService.createHtmlOutputFromFile('ImageListDialog')
      .setWidth(600)
      .setHeight(500);
    SpreadsheetApp.getUi().showSidebar(html);

  } catch (error) {
    SpreadsheetApp.getUi().alert('Error loading images: ' + error.toString());
  }
}

/**
 * getImageList() - Returns all images from Image_URLS sheet
 *
 * @return {Array<Object>} Array of image objects with description and url
 */
function getImageList() {
  try {
    // Check cache first
    var cache = CacheService.getScriptCache();
    var cachedData = cache.get('imageList');

    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        Logger.log('Image list cache parse error: ' + e.toString());
      }
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Image_URLS');

    if (!sheet) {
      return [];
    }

    var lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return [];
    }

    var dataRange = sheet.getRange('A2:C' + lastRow);
    var values = dataRange.getValues();

    var imageArray = [];

    for (var i = 0; i < values.length; i++) {
      var row = values[i];

      if (row[0] === '' || row[0] == null) {
        continue;
      }

      // Clean URL - remove leading/trailing quotes and trim whitespace
      var rawUrl = String(row[1] || '').trim();

      // Log first URL for debugging
      if (i === 0) {
        Logger.log('Raw URL from sheet: ' + rawUrl);
      }

      // Remove leading and trailing quotes (can be multiple layers)
      var cleanUrl = rawUrl.replace(/^["']+|["']+$/g, '');

      // Also remove any URL-encoded quotes
      cleanUrl = cleanUrl.replace(/%22/g, '').replace(/%27/g, '');

      // Log cleaned URL for debugging
      if (i === 0) {
        Logger.log('Cleaned URL: ' + cleanUrl);
      }

      imageArray.push({
        description: String(row[0] || '').trim(),
        url: cleanUrl,
        category: String(row[2] || 'Uncategorized').trim()
      });
    }

    // Cache the result
    try {
      cache.put('imageList', JSON.stringify(imageArray), CACHE_DURATION);
    } catch (e) {
      Logger.log('Failed to cache image list: ' + e.toString());
    }

    return imageArray;

  } catch (error) {
    Logger.log('Error getting image list: ' + error.toString());
    return [];
  }
}

/**
 * Update the category of an image by its URL
 */
function updateImageCategory(imageUrl, newCategory) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Image_URLS');

    if (!sheet) {
      return {
        success: false,
        message: 'Image_URLS sheet not found.'
      };
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return {
        success: false,
        message: 'No images found in the sheet.'
      };
    }

    // Find the row with matching URL
    var urlRange = sheet.getRange('B2:B' + lastRow);
    var urls = urlRange.getValues();

    for (var i = 0; i < urls.length; i++) {
      if (urls[i][0] === imageUrl) {
        // Found the matching row - update category in column C
        var rowNumber = i + 2; // +2 because we started at row 2
        sheet.getRange(rowNumber, 3).setValue(newCategory);

        return {
          success: true,
          message: 'Category updated successfully.'
        };
      }
    }

    return {
      success: false,
      message: 'Image not found in the sheet.'
    };

  } catch (error) {
    Logger.log('Error updating image category: ' + error.message);
    return {
      success: false,
      message: 'Error: ' + error.message
    };
  }
}

/**
 * Save the new order of images to the sheet
 * @param {Array} images - Array of image objects in the new order
 * @return {Object} Result object with success status
 */
function saveImageOrder(images) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Image_URLS');

    if (!sheet) {
      return {
        success: false,
        message: 'Image_URLS sheet not found.'
      };
    }

    // Clear existing data (except header)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 3).clear();
    }

    // Write the images in the new order
    if (images && images.length > 0) {
      var dataToWrite = images.map(function(img) {
        return [
          String(img.description || ''),
          String(img.url || ''),
          String(img.category || 'Uncategorized')
        ];
      });

      sheet.getRange(2, 1, dataToWrite.length, 3).setValues(dataToWrite);
    }

    // Clear cache
    try {
      var cache = CacheService.getScriptCache();
      cache.remove('imageList');
    } catch (e) {
      // Cache clear failed, continue
    }

    return {
      success: true,
      message: 'Image order saved successfully.'
    };

  } catch (error) {
    Logger.log('Error saving image order: ' + error.message);
    return {
      success: false,
      message: 'Error: ' + error.message
    };
  }
}

/**
 * saveDocumentationOrder() - Save reordered documentation items
 */
function saveDocumentationOrder(docs) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Documentation');

    if (!sheet) {
      return {
        success: false,
        message: 'Documentation sheet not found.'
      };
    }

    // Clear existing data (except header)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 6).clear();
    }

    // Write the docs in the new order
    if (docs && docs.length > 0) {
      var dataToWrite = docs.map(function(doc) {
        return [
          String(doc.title || ''),
          String(doc.url || ''),
          String(doc.description || ''),
          String(doc.iconClass || ''),
          String(doc.imageUrl || ''),
          String(doc.category || 'Uncategorized')
        ];
      });

      sheet.getRange(2, 1, dataToWrite.length, 6).setValues(dataToWrite);
    }

    return {
      success: true,
      message: 'Documentation order saved successfully.'
    };

  } catch (error) {
    Logger.log('Error saving documentation order: ' + error.message);
    return {
      success: false,
      message: 'Error: ' + error.message
    };
  }
}

/**
 * saveLinkOrder() - Save reordered link items
 */
function saveLinkOrder(links) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Links');

    if (!sheet) {
      return {
        success: false,
        message: 'Links sheet not found.'
      };
    }

    // Clear existing data (except header)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 6).clear();
    }

    // Write the links in the new order
    if (links && links.length > 0) {
      var dataToWrite = links.map(function(link) {
        return [
          String(link.toolName || ''),
          String(link.url || ''),
          String(link.description || ''),
          String(link.iconClass || ''),
          String(link.imageUrl || ''),
          String(link.category || 'Uncategorized')
        ];
      });

      sheet.getRange(2, 1, dataToWrite.length, 6).setValues(dataToWrite);
    }

    return {
      success: true,
      message: 'Link order saved successfully.'
    };

  } catch (error) {
    Logger.log('Error saving link order: ' + error.message);
    return {
      success: false,
      message: 'Error: ' + error.message
    };
  }
}

/**
 * showAddPageDialog() - Shows dialog to add new page to Home sheet
 */
function showAddPageDialog() {
  var html = HtmlService.createHtmlOutputFromFile('AddPageDialog')
    .setWidth(550)
    .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add New Page (Home)');
}

/**
 * addRickrollEasterEgg() - Adds a temporary rickroll easter egg to the image library
 */
function addRickrollEasterEgg() {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Image_URLS');

    if (!sheet) {
      return { success: false, message: 'Image_URLS sheet not found.' };
    }

    var lastRow = sheet.getLastRow();

    // Add the rickroll image
    sheet.getRange(lastRow + 1, 1).setValue('Never Gonna Give You Up');
    sheet.getRange(lastRow + 1, 2).setValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    sheet.getRange(lastRow + 1, 3).setValue('Icons');

    return {
      success: true,
      message: 'Easter egg added! 🎉'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error: ' + error.message
    };
  }
}

/**
 * showAddLinkDialog() - Shows dialog to add new link to Links sheet
 */
function showAddLinkDialog() {
  var html = HtmlService.createHtmlOutputFromFile('AddLinkDialog')
    .setWidth(550)
    .setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add New Link');
}

/**
 * showAddDocumentationDialog() - Shows dialog to add new documentation to Documentation sheet
 */
function showAddDocumentationDialog() {
  var html = HtmlService.createHtmlOutputFromFile('AddDocumentationDialog')
    .setWidth(550)
    .setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add New Documentation');
}

/**
 * getCategories() - Returns unique categories from Links and Documentation sheets
 *
 * @param {string} sheetName - Name of sheet ('Links' or 'Documentation')
 * @return {Array<string>} Array of unique category names
 */
function getCategories(sheetName) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      return [];
    }

    var lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return [];
    }

    // Column F contains categories
    var dataRange = sheet.getRange('F2:F' + lastRow);
    var values = dataRange.getValues();

    var categories = [];
    var uniqueCategories = {};

    for (var i = 0; i < values.length; i++) {
      var category = values[i][0];

      if (category && category !== '' && !uniqueCategories[category]) {
        uniqueCategories[category] = true;
        categories.push(category);
      }
    }

    // Sort alphabetically
    categories.sort();

    return categories;

  } catch (error) {
    Logger.log('Error getting categories: ' + error.toString());
    return [];
  }
}

/**
 * getIconClasses() - Returns list of available Material Icons
 *
 * @return {Array<string>} Array of icon class names
 */
function getIconClasses() {
  // Return comprehensive list of Material Icons
  return [
    'link', 'description', 'folder', 'home', 'article', 'book', 'menu_book',
    'school', 'class', 'library_books', 'auto_stories', 'chrome_reader_mode',
    'apps', 'dashboard', 'widgets', 'extension', 'build', 'settings',
    'computer', 'laptop', 'phone_iphone', 'tablet', 'devices',
    'cloud', 'cloud_upload', 'cloud_download', 'cloud_done', 'backup',
    'storage', 'folder_open', 'folder_shared', 'create_new_folder',
    'edit', 'create', 'save', 'delete', 'add_circle', 'remove_circle',
    'check_circle', 'cancel', 'error', 'warning', 'info', 'help',
    'search', 'find_in_page', 'zoom_in', 'zoom_out', 'filter_list',
    'person', 'people', 'group', 'account_circle', 'supervisor_account',
    'email', 'chat', 'message', 'comment', 'forum', 'feedback',
    'notifications', 'calendar_today', 'event', 'schedule', 'alarm',
    'print', 'picture_as_pdf', 'slideshow', 'grid_on', 'table_chart',
    'insert_chart', 'pie_chart', 'bar_chart', 'analytics', 'assessment',
    'code', 'terminal', 'data_object', 'integration_instructions', 'api',
    'bug_report', 'security', 'lock', 'vpn_key', 'admin_panel_settings',
    'verified_user', 'gavel', 'account_balance', 'assignment', 'assignment_turned_in',
    'work', 'business', 'store', 'shopping_cart', 'payment',
    'lightbulb', 'stars', 'favorite', 'bookmark', 'flag',
    'visibility', 'language', 'translate', 'public', 'travel_explore',
    'map', 'place', 'navigation', 'explore', 'my_location',
    'video_library', 'videocam', 'movie', 'theaters', 'live_tv',
    'music_note', 'headset', 'mic', 'volume_up', 'speaker',
    'image', 'photo', 'photo_library', 'collections', 'camera_alt',
    'campaign', 'announcement', 'record_voice_over', 'support_agent', 'call'
  ];
}

/**
 * addPageToSheet() - Adds new page to Home sheet
 *
 * @param {Object} pageData - Object with page properties
 * @return {Object} Result object with success status and message
 */
function addPageToSheet(pageData) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Home');

    if (!sheet) {
      return {
        success: false,
        message: 'Home sheet not found.'
      };
    }

    var lastRow = sheet.getLastRow();
    var nextRow = lastRow + 1;

    // Add data: PAGE_NAME, PAGE_URL, DESCRIPTION, ICON_CLASS, IMAGE_URL
    sheet.getRange(nextRow, 1).setValue(pageData.pageName);
    sheet.getRange(nextRow, 2).setValue(pageData.pageUrl);
    sheet.getRange(nextRow, 3).setValue(pageData.description);
    sheet.getRange(nextRow, 4).setValue(pageData.iconClass);
    sheet.getRange(nextRow, 5).setValue(pageData.imageUrl || '');

    // Clear cache to show new data immediately
    try {
      var cache = CacheService.getScriptCache();
      cache.remove('homeData');
    } catch (e) {
      // Cache clear failed, continue
    }

    return {
      success: true,
      message: 'Page added successfully to Home sheet!'
    };

  } catch (error) {
    return {
      success: false,
      message: 'Error adding page: ' + error.toString()
    };
  }
}

/**
 * addLinkToSheet() - Adds new link to Links sheet
 *
 * @param {Object} linkData - Object with link properties
 * @return {Object} Result object with success status and message
 */
function addLinkToSheet(linkData) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Links');

    if (!sheet) {
      return {
        success: false,
        message: 'Links sheet not found.'
      };
    }

    var lastRow = sheet.getLastRow();
    var nextRow = lastRow + 1;

    // Add data: TOOL_NAME, TOOL_URL, DESCRIPTION, ICON_CLASS, IMAGE_URL, CATEGORY
    sheet.getRange(nextRow, 1).setValue(linkData.toolName);
    sheet.getRange(nextRow, 2).setValue(linkData.toolUrl);
    sheet.getRange(nextRow, 3).setValue(linkData.description);
    sheet.getRange(nextRow, 4).setValue(linkData.iconClass);
    sheet.getRange(nextRow, 5).setValue(linkData.imageUrl || '');
    sheet.getRange(nextRow, 6).setValue(linkData.category);

    // Clear cache to show new data immediately
    try {
      var cache = CacheService.getScriptCache();
      cache.remove('linkData');
    } catch (e) {
      // Cache clear failed, continue
    }

    return {
      success: true,
      message: 'Link added successfully to Links sheet!'
    };

  } catch (error) {
    return {
      success: false,
      message: 'Error adding link: ' + error.toString()
    };
  }
}

/**
 * addDocumentationToSheet() - Adds new documentation to Documentation sheet
 *
 * @param {Object} docData - Object with documentation properties
 * @return {Object} Result object with success status and message
 */
function addDocumentationToSheet(docData) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Documentation');

    if (!sheet) {
      return {
        success: false,
        message: 'Documentation sheet not found.'
      };
    }

    var lastRow = sheet.getLastRow();
    var nextRow = lastRow + 1;

    // Add data: DOCUMENTATION_TITLE, DOCUMENTATION_URL, DESCRIPTION, ICON_CLASS, IMAGE_URL, CATEGORY
    sheet.getRange(nextRow, 1).setValue(docData.documentationTitle);
    sheet.getRange(nextRow, 2).setValue(docData.documentationUrl);
    sheet.getRange(nextRow, 3).setValue(docData.description);
    sheet.getRange(nextRow, 4).setValue(docData.iconClass);
    sheet.getRange(nextRow, 5).setValue(docData.imageUrl || '');
    sheet.getRange(nextRow, 6).setValue(docData.category);

    // Clear cache to show new data immediately
    try {
      var cache = CacheService.getScriptCache();
      cache.remove('documentationData');
    } catch (e) {
      // Cache clear failed, continue
    }

    return {
      success: true,
      message: 'Documentation added successfully to Documentation sheet!'
    };

  } catch (error) {
    return {
      success: false,
      message: 'Error adding documentation: ' + error.toString()
    };
  }
}

/**
 * getConfigValue() - Gets a configuration value from the Config sheet
 *
 * @param {string} settingName - Name of the setting to retrieve
 * @return {string} The setting value, or empty string if not found
 */
function getConfigValue(settingName) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Config');

    if (!sheet) {
      Logger.log('Config sheet not found. Access control disabled.');
      return '';
    }

    var lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return '';
    }

    var dataRange = sheet.getRange('A2:B' + lastRow);
    var values = dataRange.getValues();

    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      if (row[0] === settingName) {
        return String(row[1] || '').trim();
      }
    }

    return '';

  } catch (error) {
    Logger.log('Error getting config value: ' + error.toString());
    return '';
  }
}

/**
 * checkAccess() - Checks if the current user has access to the web app
 *
 * Checks against allowed Google Group(s) configured in the Config sheet.
 * If no Config sheet exists or ACCESS_CONTROL is disabled, allows all access.
 *
 * @return {boolean} True if user has access, false otherwise
 */
function checkAccess() {
  try {
    var userEmail = Session.getActiveUser().getEmail();

    // Check if access control is enabled
    var accessControlEnabled = getConfigValue('ACCESS_CONTROL_ENABLED');

    if (accessControlEnabled !== 'TRUE') {
      // Access control is disabled, allow all users
      return true;
    }

    // Get the allowed Google Group email
    var allowedGroup = getConfigValue('ALLOWED_GROUP_EMAIL');

    if (!allowedGroup || allowedGroup === '') {
      // No group configured, allow all users
      Logger.log('No allowed group configured. Allowing access.');
      return true;
    }

    // Check if user is in the allowed group
    try {
      var group = GroupsApp.getGroupByEmail(allowedGroup);
      var hasAccess = group.hasUser(userEmail);

      if (hasAccess) {
        Logger.log('Access granted to: ' + userEmail);
      } else {
        Logger.log('Access denied to: ' + userEmail + ' (not in group: ' + allowedGroup + ')');
      }

      return hasAccess;
    } catch (groupError) {
      // Group not found or error checking membership
      Logger.log('Error checking group membership: ' + groupError.toString());
      Logger.log('Allowing access due to configuration error.');
      return true; // Fail open to avoid locking everyone out
    }

  } catch (error) {
    Logger.log('Error in checkAccess: ' + error.toString());
    return true; // Fail open to avoid locking everyone out
  }
}

/**
 * createConfigSheet() - Creates the Config sheet with default settings
 *
 * This function can be run manually to set up the Config sheet.
 * You can also call it from a custom menu.
 */
function createConfigSheet() {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Config');

    // Check if sheet already exists
    if (sheet) {
      SpreadsheetApp.getUi().alert('Config sheet already exists!');
      return;
    }

    // Create the Config sheet
    sheet = spreadsheet.insertSheet('Config');

    // Set up headers
    sheet.getRange('A1').setValue('Setting Name');
    sheet.getRange('B1').setValue('Setting Value');
    sheet.getRange('A1:B1').setFontWeight('bold');
    sheet.getRange('A1:B1').setBackground('#2d3f69');
    sheet.getRange('A1:B1').setFontColor('#ffffff');

    // Add default settings
    sheet.getRange('A2').setValue('ACCESS_CONTROL_ENABLED');
    sheet.getRange('B2').setValue('FALSE');
    sheet.getRange('C2').setValue('Set to TRUE to enable access control, FALSE to allow all users');

    sheet.getRange('A3').setValue('ALLOWED_GROUP_EMAIL');
    sheet.getRange('B3').setValue('');
    sheet.getRange('C3').setValue('Google Group email (e.g., tech-team@oronoschools.org)');

    sheet.getRange('A4').setValue('SENDER_EMAIL');
    sheet.getRange('B4').setValue('');
    sheet.getRange('C4').setValue('Email address to send from (leave blank to use current user). Requires "Send As" permission.');

    sheet.getRange('A5').setValue('SENDER_NAME');
    sheet.getRange('B5').setValue('Orono Tech Department');
    sheet.getRange('C5').setValue('Display name for outgoing emails');

    // Format columns
    sheet.setColumnWidth(1, 250);
    sheet.setColumnWidth(2, 300);
    sheet.setColumnWidth(3, 400);
    sheet.getRange('C2:C5').setFontStyle('italic');
    sheet.getRange('C2:C5').setFontColor('#666666');

    SpreadsheetApp.getUi().alert('Config sheet created successfully!\n\nTo enable access control:\n1. Set ACCESS_CONTROL_ENABLED to TRUE\n2. Enter your Google Group email in ALLOWED_GROUP_EMAIL');

  } catch (error) {
    SpreadsheetApp.getUi().alert('Error creating Config sheet: ' + error.toString());
  }
}

/**
 * createMonitoredSystemsSheet() - Creates the Monitored Systems sheet for status monitoring
 *
 * This function can be run manually to set up the Monitored Systems sheet.
 * You can also call it from a custom menu.
 */
function createMonitoredSystemsSheet() {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Monitored Systems');

    // Check if sheet already exists
    if (sheet) {
      SpreadsheetApp.getUi().alert('Monitored Systems sheet already exists!');
      return;
    }

    // Create the Monitored Systems sheet
    sheet = spreadsheet.insertSheet('Monitored Systems');

    // Set up headers
    sheet.getRange('A1').setValue('System Name');
    sheet.getRange('B1').setValue('URL');
    sheet.getRange('C1').setValue('Description');
    sheet.getRange('D1').setValue('Icon');
    sheet.getRange('E1').setValue('Enabled');
    sheet.getRange('F1').setValue('Category');
    sheet.getRange('A1:F1').setFontWeight('bold');
    sheet.getRange('A1:F1').setBackground('#2d3f69');
    sheet.getRange('A1:F1').setFontColor('#ffffff');

    // Add sample systems
    var sampleData = [
      ['Google Services', 'https://www.google.com', 'Primary internet and Google services', 'language', 'TRUE', 'Core Services'],
      ['Microsoft 365', 'https://www.office.com', 'Office 365 and OneDrive services', 'workspaces', 'TRUE', 'Core Services'],
      ['Canvas LMS', 'https://canvas.instructure.com', 'Learning Management System', 'school', 'TRUE', 'Education'],
      ['Google Workspace', 'INTERNAL', 'Gmail, Drive, Sheets core services', 'cloud', 'TRUE', 'Internal']
    ];

    // Insert sample data
    for (var i = 0; i < sampleData.length; i++) {
      sheet.getRange(i + 2, 1, 1, 6).setValues([sampleData[i]]);
    }

    // Format columns
    sheet.setColumnWidth(1, 200); // System Name
    sheet.setColumnWidth(2, 300); // URL
    sheet.setColumnWidth(3, 350); // Description
    sheet.setColumnWidth(4, 120); // Icon
    sheet.setColumnWidth(5, 80);  // Enabled
    sheet.setColumnWidth(6, 150); // Category

    // Add data validation for Enabled column
    var enabledRange = sheet.getRange('E2:E1000');
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['TRUE', 'FALSE'], true)
      .setAllowInvalid(false)
      .build();
    enabledRange.setDataValidation(rule);

    // Add notes for Icon column
    sheet.getRange('D1').setNote('Available icons: language, school, work, devices, computer, wifi, router, server, dns, cloud, security, workspaces, campaign, dashboard, link, description, photo_library, home');

    // Freeze header row
    sheet.setFrozenRows(1);

    SpreadsheetApp.getUi().alert(
      'Monitored Systems sheet created successfully!\n\n' +
      'Sample systems have been added. You can:\n' +
      '1. Edit existing systems\n' +
      '2. Add new systems by adding rows\n' +
      '3. Set Enabled to FALSE to temporarily disable monitoring\n' +
      '4. Use INTERNAL as URL for internal Google Workspace checks\n\n' +
      'Use the Status page to manage systems from the UI.'
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert('Error creating Monitored Systems sheet: ' + error.toString());
  }
}

/**
 * getMonitoredSystems() - Retrieves all monitored systems from the sheet
 *
 * @return {Array} Array of system objects with their properties
 */
function getMonitoredSystems() {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Monitored Systems');

    if (!sheet) {
      return [];
    }

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return [];
    }

    var data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    var systems = [];

    for (var i = 0; i < data.length; i++) {
      if (data[i][0]) { // Only include rows with a system name
        systems.push({
          rowIndex: i + 2,
          name: data[i][0],
          url: data[i][1],
          description: data[i][2],
          icon: data[i][3],
          enabled: data[i][4] === 'TRUE' || data[i][4] === true,
          category: data[i][5],
          statusOverride: data[i][6] || '',
          feedUrl: data[i][7] || ''
        });
      }
    }

    return systems;

  } catch (error) {
    Logger.log('Error getting monitored systems: ' + error.toString());
    return [];
  }
}

/**
 * addMonitoredSystem() - Adds a new monitored system to the sheet
 *
 * @param {Object} systemData - Object with system properties
 * @return {Object} Result object with success status and message
 */
function addMonitoredSystem(systemData) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Monitored Systems');

    if (!sheet) {
      return {
        success: false,
        message: 'Monitored Systems sheet not found. Please create it first.'
      };
    }

    var lastRow = sheet.getLastRow();
    var nextRow = lastRow + 1;

    // Add data: System Name, URL, Description, Icon, Enabled, Category, Status Override, Feed URL
    sheet.getRange(nextRow, 1).setValue(systemData.name);
    sheet.getRange(nextRow, 2).setValue(systemData.url);
    sheet.getRange(nextRow, 3).setValue(systemData.description);
    sheet.getRange(nextRow, 4).setValue(systemData.icon || 'language');
    sheet.getRange(nextRow, 5).setValue(systemData.enabled !== false ? 'TRUE' : 'FALSE');
    sheet.getRange(nextRow, 6).setValue(systemData.category || 'Uncategorized');
    sheet.getRange(nextRow, 7).setValue(systemData.statusOverride || '');
    sheet.getRange(nextRow, 8).setValue(systemData.feedUrl || '');

    return {
      success: true,
      message: 'System added successfully!'
    };

  } catch (error) {
    return {
      success: false,
      message: 'Error adding system: ' + error.toString()
    };
  }
}

/**
 * updateMonitoredSystem() - Updates an existing monitored system
 *
 * @param {number} rowIndex - Row number of the system to update
 * @param {Object} systemData - Object with updated system properties
 * @return {Object} Result object with success status and message
 */
function updateMonitoredSystem(rowIndex, systemData) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Monitored Systems');

    if (!sheet) {
      return {
        success: false,
        message: 'Monitored Systems sheet not found.'
      };
    }

    // Update data: System Name, URL, Description, Icon, Enabled, Category, Status Override, Feed URL
    sheet.getRange(rowIndex, 1).setValue(systemData.name);
    sheet.getRange(rowIndex, 2).setValue(systemData.url);
    sheet.getRange(rowIndex, 3).setValue(systemData.description);
    sheet.getRange(rowIndex, 4).setValue(systemData.icon || 'language');
    sheet.getRange(rowIndex, 5).setValue(systemData.enabled !== false ? 'TRUE' : 'FALSE');
    sheet.getRange(rowIndex, 6).setValue(systemData.category || 'Uncategorized');
    sheet.getRange(rowIndex, 7).setValue(systemData.statusOverride || '');
    sheet.getRange(rowIndex, 8).setValue(systemData.feedUrl || '');

    return {
      success: true,
      message: 'System updated successfully!'
    };

  } catch (error) {
    return {
      success: false,
      message: 'Error updating system: ' + error.toString()
    };
  }
}

/**
 * deleteMonitoredSystem() - Deletes a monitored system from the sheet
 *
 * @param {number} rowIndex - Row number of the system to delete
 * @return {Object} Result object with success status and message
 */
function deleteMonitoredSystem(rowIndex) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Monitored Systems');

    if (!sheet) {
      return {
        success: false,
        message: 'Monitored Systems sheet not found.'
      };
    }

    sheet.deleteRow(rowIndex);

    return {
      success: true,
      message: 'System deleted successfully!'
    };

  } catch (error) {
    return {
      success: false,
      message: 'Error deleting system: ' + error.toString()
    };
  }
}

/**
 * bulkImportSystems() - Imports multiple systems from a list
 *
 * @param {Array} systemsList - Array of system objects
 * @return {Object} Result object with success status and message
 */
function bulkImportSystems(systemsList) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Monitored Systems');

    if (!sheet) {
      return {
        success: false,
        message: 'Monitored Systems sheet not found. Please create it first.'
      };
    }

    var successCount = 0;
    var failCount = 0;

    for (var i = 0; i < systemsList.length; i++) {
      try {
        var result = addMonitoredSystem(systemsList[i]);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    return {
      success: true,
      message: 'Bulk import completed: ' + successCount + ' systems added, ' + failCount + ' failed.'
    };

  } catch (error) {
    return {
      success: false,
      message: 'Error during bulk import: ' + error.toString()
    };
  }
}

/**
 * checkSystemStatus() - Check the health of monitored systems from spreadsheet
 *
 * This function reads the list of systems from the 'Monitored Systems' sheet
 * and checks the status of each enabled system.
 *
 * @return {Array} Array of system status objects
 */
function checkSystemStatus() {
  var systems = [];

  try {
    // Get all monitored systems from the spreadsheet
    var monitoredSystems = getMonitoredSystems();

    // Filter to only enabled systems
    var enabledSystems = monitoredSystems.filter(function(system) {
      return system.enabled === true;
    });

    // Check each enabled system
    enabledSystems.forEach(function(system) {
      try {
        // Check if there's a status override
        if (system.statusOverride && system.statusOverride !== '') {
          // Use the manual status override
          systems.push({
            name: system.name,
            description: system.description,
            icon: system.icon,
            url: system.url,
            status: system.statusOverride,
            details: 'Status manually set to ' + system.statusOverride,
            rowIndex: system.rowIndex,
            category: system.category,
            feedUrl: system.feedUrl,
            enabled: system.enabled
          });
        } else if (system.url === 'INTERNAL') {
          // Special case: INTERNAL systems (Google Workspace checks)
          checkInternalSystem(system, systems);
        } else {
          // External URL-based system check
          checkExternalSystem(system, systems);
        }
      } catch (error) {
        systems.push({
          name: system.name,
          description: system.description,
          icon: system.icon,
          url: system.url,
          status: 'down',
          error: 'Error checking system: ' + error.message,
          rowIndex: system.rowIndex,
          category: system.category,
          feedUrl: system.feedUrl,
          statusOverride: system.statusOverride,
          enabled: system.enabled
        });
      }
    });

  } catch (error) {
    Logger.log('Error in checkSystemStatus: ' + error.toString());
    // If we can't read from sheet, return an error system
    systems.push({
      name: 'System Monitor',
      description: 'Status monitoring system',
      icon: 'error',
      status: 'down',
      error: 'Unable to load monitored systems from spreadsheet: ' + error.message
    });
  }

  return systems;
}

/**
 * Generic RSS/Atom feed status checker
 * Parses feeds and detects incident status based on content
 *
 * @param {string} feedUrl - The RSS/Atom feed URL to check
 * @return {Object} Status result with status and details
 */
function scrapeFeedStatus(feedUrl) {
  try {
    // Fetch the RSS/Atom feed
    var response = UrlFetchApp.fetch(feedUrl, {
      'method': 'get',
      'muteHttpExceptions': true,
      'validateHttpsCertificates': true,
      'timeout': 15,
      'followRedirects': true
    });

    if (response.getResponseCode() !== 200) {
      return {
        status: 'down',
        details: 'Unable to access status feed (HTTP ' + response.getResponseCode() + ')'
      };
    }

    var xml = response.getContentText();

    // Parse both RSS <item> tags and Atom <entry> tags
    var itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi);
    var entryMatches = xml.match(/<entry>[\s\S]*?<\/entry>/gi);
    var items = itemMatches || entryMatches;

    if (!items || items.length === 0) {
      // No items/entries means no incidents - all services operational
      return {
        status: 'operational',
        details: 'All services operational (no incidents in feed)'
      };
    }

    // Check the most recent items for active issues
    var hasActiveIssue = false;
    var hasPartialIssue = false;
    var hasDegradedService = false;
    var latestIssue = '';

    for (var i = 0; i < Math.min(items.length, 5); i++) {
      var item = items[i];

      // Extract title (try both CDATA and plain text formats)
      var titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i);
      if (!titleMatch) {
        titleMatch = item.match(/<title[^>]*>(.*?)<\/title>/i);
      }

      // Extract summary/description/content
      var summaryMatch = item.match(/<summary[^>]*>(.*?)<\/summary>/is);
      if (!summaryMatch) {
        summaryMatch = item.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>/is);
      }
      if (!summaryMatch) {
        summaryMatch = item.match(/<description[^>]*>(.*?)<\/description>/is);
      }
      if (!summaryMatch) {
        summaryMatch = item.match(/<content[^>]*>(.*?)<\/content>/is);
      }

      var title = titleMatch ? titleMatch[1] : '';
      var summary = summaryMatch ? summaryMatch[1] : '';

      // Check if incident is resolved
      var isResolved = summary.match(/ended\s+at\s+\d{4}-\d{2}-\d{2}/i) ||
                       summary.match(/issue\s+(has\s+been\s+)?resolved/i) ||
                       summary.match(/is\s+now\s+complete/i) ||
                       summary.match(/has\s+been\s+fixed/i) ||
                       summary.match(/resolved/i) ||
                       title.match(/resolved/i);

      // Skip resolved incidents
      if (isResolved) {
        continue;
      }

      // Extract date to check if recent (works for both RSS pubDate and Atom updated)
      var dateMatch = item.match(/<updated>(.*?)<\/updated>/i);
      if (!dateMatch) {
        dateMatch = item.match(/<published>(.*?)<\/published>/i);
      }
      if (!dateMatch) {
        dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);
      }

      if (dateMatch) {
        var itemDate = new Date(dateMatch[1]);
        var now = new Date();
        var hoursSinceUpdate = (now - itemDate) / (1000 * 60 * 60);

        // Only consider incidents updated in the last 48 hours as potentially active
        if (hoursSinceUpdate > 48) {
          continue;
        }
      }

      // Check for service disruption indicators in unresolved, recent incidents
      if (title.match(/service\s+(outage|disruption)/i) ||
          title.match(/not\s+available/i) ||
          title.match(/down/i) ||
          title.match(/major\s+(outage|incident)/i) ||
          summary.match(/service\s+(outage|disruption)/i)) {
        hasActiveIssue = true;
        if (!latestIssue) latestIssue = title.substring(0, 100);
      }

      // Check for partial outages
      if (title.match(/some\s+users/i) ||
          title.match(/limited\s+availability/i) ||
          title.match(/intermittent/i) ||
          title.match(/partial\s+(outage|disruption)/i) ||
          summary.match(/some\s+users/i)) {
        hasPartialIssue = true;
        if (!latestIssue) latestIssue = title.substring(0, 100);
      }

      // Check for degraded performance
      if (title.match(/degraded\s+performance/i) ||
          title.match(/slow/i) ||
          title.match(/delays/i) ||
          summary.match(/degraded\s+performance/i)) {
        hasDegradedService = true;
        if (!latestIssue) latestIssue = title.substring(0, 100);
      }

      // Check for maintenance
      if (title.match(/maintenance/i) ||
          title.match(/scheduled\s+work/i) ||
          summary.match(/maintenance/i)) {
        // Only count as maintenance if not already marked as something worse
        if (!hasActiveIssue && !hasPartialIssue && !hasDegradedService) {
          return {
            status: 'maintenance',
            details: 'Scheduled maintenance: ' + title.substring(0, 100)
          };
        }
      }
    }

    // Return status based on what we found (priority: down > partial > degraded)
    if (hasActiveIssue) {
      return {
        status: 'down',
        details: 'Service issue: ' + (latestIssue || 'Active incident reported')
      };
    }

    if (hasPartialIssue) {
      return {
        status: 'partial',
        details: 'Partial outage: ' + (latestIssue || 'Some users affected')
      };
    }

    if (hasDegradedService) {
      return {
        status: 'degraded',
        details: 'Degraded service: ' + (latestIssue || 'Performance issues reported')
      };
    }

    // No active issues found - all resolved or old
    return {
      status: 'operational',
      details: 'All services operational'
    };

  } catch (error) {
    return {
      status: 'down',
      details: 'Unable to check status feed: ' + error.toString()
    };
  }
}

/**
 * Scrapes Google Workspace Status using Atom feed
 * https://www.google.com/appsstatus/rss/en
 */
function scrapeGoogleWorkspaceStatus() {
  // Use generic feed parser
  return scrapeFeedStatus('https://www.google.com/appsstatus/rss/en');
}

/**
 * checkInternalSystem() - Checks internal Google Workspace system status
 *
 * @param {Object} system - System object from spreadsheet
 * @param {Array} systems - Array to push status results to
 */
function checkInternalSystem(system, systems) {
  try {
    // Check Google Workspace services based on system name
    if (system.name.toLowerCase().indexOf('workspace') >= 0 ||
        system.name.toLowerCase().indexOf('gmail') >= 0) {
      // Scrape Google Workspace Status Dashboard
      var statusResult = scrapeGoogleWorkspaceStatus();

      systems.push({
        name: system.name,
        description: system.description,
        icon: system.icon,
        url: 'https://www.google.com/appsstatus/dashboard/',
        status: statusResult.status,
        details: statusResult.details,
        rowIndex: system.rowIndex,
        category: system.category,
        feedUrl: system.feedUrl,
        statusOverride: system.statusOverride,
        enabled: system.enabled
      });
    } else if (system.name.toLowerCase().indexOf('drive') >= 0) {
      // Check Google Drive status
      var statusResult = scrapeGoogleWorkspaceStatus();
      systems.push({
        name: system.name,
        description: system.description,
        icon: system.icon,
        url: 'https://www.google.com/appsstatus/dashboard/',
        status: statusResult.status,
        details: statusResult.details,
        rowIndex: system.rowIndex,
        category: system.category,
        feedUrl: system.feedUrl,
        statusOverride: system.statusOverride,
        enabled: system.enabled
      });
    } else {
      // Generic internal check
      systems.push({
        name: system.name,
        description: system.description,
        icon: system.icon,
        url: system.url,
        status: 'operational',
        details: 'Internal system operational',
        rowIndex: system.rowIndex,
        category: system.category,
        feedUrl: system.feedUrl,
        statusOverride: system.statusOverride,
        enabled: system.enabled
      });
    }
  } catch (error) {
    systems.push({
      name: system.name,
      description: system.description,
      icon: system.icon,
      url: system.url,
      status: 'down',
      error: 'Unable to connect to internal service: ' + error.message,
      rowIndex: system.rowIndex,
      category: system.category,
      feedUrl: system.feedUrl,
      statusOverride: system.statusOverride,
      enabled: system.enabled
    });
  }
}

/**
 * checkExternalSystem() - Checks external URL-based system status
 *
 * @param {Object} system - System object from spreadsheet
 * @param {Array} systems - Array to push status results to
 */
/**
 * Scrapes a status page to determine operational status
 * Supports Statuspage.io and common status page formats
 */
function scrapeStatusPage(url) {
  try {
    var response = UrlFetchApp.fetch(url, {
      'method': 'get',
      'muteHttpExceptions': true,
      'validateHttpsCertificates': true,
      'timeout': 15,
      'followRedirects': true
    });

    if (response.getResponseCode() !== 200) {
      return {
        status: 'down',
        details: 'Status page unavailable (HTTP ' + response.getResponseCode() + ')',
        source: 'http_error'
      };
    }

    var html = response.getContentText();

    // Pattern 1: Statuspage.io - Check for "All Systems Operational" or similar
    if (html.match(/all\s+systems?\s+(operational|running|up)/i)) {
      return {
        status: 'operational',
        details: 'All systems operational',
        source: 'statuspage_headline'
      };
    }

    // Pattern 2: Statuspage.io - Check for status indicators
    if (html.match(/class="[^"]*status-red[^"]*"/i) || html.match(/class="[^"]*impact-critical[^"]*"/i)) {
      return {
        status: 'down',
        details: 'Major outage reported',
        source: 'statuspage_indicator'
      };
    }

    if (html.match(/class="[^"]*status-orange[^"]*"/i) || html.match(/class="[^"]*impact-major[^"]*"/i)) {
      return {
        status: 'partial',
        details: 'Partial outage reported',
        source: 'statuspage_indicator'
      };
    }

    if (html.match(/class="[^"]*status-yellow[^"]*"/i) || html.match(/class="[^"]*impact-minor[^"]*"/i)) {
      return {
        status: 'degraded',
        details: 'Performance issues reported',
        source: 'statuspage_indicator'
      };
    }

    if (html.match(/class="[^"]*status-blue[^"]*"/i) || html.match(/class="[^"]*maintenance[^"]*"/i)) {
      return {
        status: 'maintenance',
        details: 'Scheduled maintenance in progress',
        source: 'statuspage_indicator'
      };
    }

    // Pattern 3: Check for common operational phrases
    if (html.match(/currently\s+(operational|running|available)/i) ||
        html.match(/no\s+(known\s+)?issues/i) ||
        html.match(/everything\s+(is\s+)?(running|working)/i)) {
      return {
        status: 'operational',
        details: 'Service operational',
        source: 'text_pattern'
      };
    }

    // Pattern 4: Check for outage/incident keywords
    if (html.match(/major\s+(outage|incident)/i) ||
        html.match(/service\s+(outage|unavailable|down)/i)) {
      return {
        status: 'down',
        details: 'Service outage reported',
        source: 'text_pattern'
      };
    }

    if (html.match(/partial\s+outage/i) ||
        html.match(/some\s+services\s+(affected|unavailable)/i)) {
      return {
        status: 'partial',
        details: 'Partial outage reported',
        source: 'text_pattern'
      };
    }

    if (html.match(/degraded\s+(performance|service)/i) ||
        html.match(/investigating\s+(an\s+)?issue/i) ||
        html.match(/performance\s+issues/i)) {
      return {
        status: 'degraded',
        details: 'Service degradation reported',
        source: 'text_pattern'
      };
    }

    if (html.match(/scheduled\s+maintenance/i) ||
        html.match(/maintenance\s+(window|in\s+progress)/i) ||
        html.match(/under\s+maintenance/i)) {
      return {
        status: 'maintenance',
        details: 'Scheduled maintenance in progress',
        source: 'text_pattern'
      };
    }

    // Pattern 5: Statuspage.io - Check for green status (most reliable)
    if (html.match(/class="[^"]*status-green[^"]*"/i) || html.match(/class="[^"]*impact-none[^"]*"/i)) {
      return {
        status: 'operational',
        details: 'All components operational',
        source: 'statuspage_indicator'
      };
    }

    // If we can't determine status, assume operational but note uncertainty
    return {
      status: 'operational',
      details: 'Status page accessible (unable to parse status)',
      source: 'unknown'
    };

  } catch (error) {
    return {
      status: 'down',
      details: 'Unable to access status page: ' + error.toString(),
      source: 'error'
    };
  }
}

function checkExternalSystem(system, systems) {
  try {
    var startTime = new Date().getTime();

    // Check if feedUrl is provided - use feed parsing if available, otherwise scrape HTML
    var statusResult;
    if (system.feedUrl && system.feedUrl.trim() !== '') {
      statusResult = scrapeFeedStatus(system.feedUrl);
    } else {
      statusResult = scrapeStatusPage(system.url);
    }

    var endTime = new Date().getTime();
    var responseTime = endTime - startTime;

    systems.push({
      name: system.name,
      description: system.description,
      icon: system.icon,
      url: system.url,
      status: statusResult.status,
      details: statusResult.details,
      rowIndex: system.rowIndex,
      category: system.category,
      feedUrl: system.feedUrl,
      statusOverride: system.statusOverride,
      enabled: system.enabled
    });
  } catch (error) {
    systems.push({
      name: system.name,
      description: system.description,
      icon: system.icon,
      url: system.url,
      status: 'down',
      error: 'Error checking status: ' + error.toString(),
      rowIndex: system.rowIndex,
      category: system.category,
      feedUrl: system.feedUrl,
      statusOverride: system.statusOverride,
      enabled: system.enabled
    });
  }
}

/**
 * Helper function to count unique categories
 */
function getCategoryCount(linkData) {
  var categories = {};
  for (var i = 1; i < linkData.length; i++) {
    if (linkData[i][2]) { // Category column
      categories[linkData[i][2]] = true;
    }
  }
  return Object.keys(categories).length;
}
