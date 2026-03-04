// server/utils/googleSheetsHelper.js
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const stream = require('stream');

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

/**
 * Initialize Google Auth for both Sheets and Drive
 * Supports multiple authentication methods:
 * 1. Environment variables (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY)
 * 2. Base64 encoded credentials (GOOGLE_CREDENTIALS_BASE64)
 * 3. Service account file (fallback)
 */
const getGoogleAuth = async () => {
  try {
    if (!SPREADSHEET_ID) {
      console.error('❌ GOOGLE_SHEETS_ID not found in environment variables');
      return null;
    }

    let credentials = null;

    // Method 1: Try base64 encoded credentials first (most secure for production)
    if (process.env.GOOGLE_CREDENTIALS_BASE64) {
      try {
        console.log('🔑 Attempting to decode base64 credentials...');
        const decoded = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
        credentials = JSON.parse(decoded);
        console.log('✅ Successfully decoded base64 credentials');
      } catch (decodeError) {
        console.error('❌ Failed to decode base64 credentials:', decodeError.message);
      }
    }

    // Method 2: Try individual environment variables
    if (!credentials && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      console.log('🔑 Using individual environment variables for authentication...');
      
      // Handle private key - replace literal \n with actual newlines
      let privateKey = process.env.GOOGLE_PRIVATE_KEY;
      
      // If the key contains literal '\n' strings, replace them with actual newlines
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      // Also handle case where key might be wrapped in quotes
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      
      credentials = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey
      };
      console.log('✅ Using environment variables for authentication');
    }

    // Method 3: Try service account file (for local development)
    if (!credentials) {
      const keyFilePath = path.join(__dirname, '../config/google-service-account.json');
      console.log('🔍 Looking for service account file at:', keyFilePath);
      
      if (fs.existsSync(keyFilePath)) {
        try {
          const fileContent = fs.readFileSync(keyFilePath, 'utf8');
          credentials = JSON.parse(fileContent);
          console.log('✅ Service account file found and loaded');
        } catch (fileError) {
          console.error('❌ Error reading service account file:', fileError.message);
        }
      } else {
        console.log('ℹ️ No service account file found at:', keyFilePath);
      }
    }

    if (!credentials) {
      console.error('❌ No valid Google credentials found. Please check your environment variables.');
      console.error('   Required: GOOGLE_SHEETS_ID and either:');
      console.error('   - GOOGLE_CREDENTIALS_BASE64 (recommended)');
      console.error('   - GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY');
      console.error('   - google-service-account.json file');
      return null;
    }

    // Validate credentials have required fields
    if (!credentials.client_email || !credentials.private_key) {
      console.error('❌ Invalid credentials format: missing client_email or private_key');
      return null;
    }

    console.log('🔑 Creating JWT auth with email:', credentials.client_email);
    
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive'
      ]
    );
    
    // Test the authentication
    await auth.authorize();
    console.log('✅ Google Auth authenticated successfully');
    return auth;
  } catch (error) {
    console.error('❌ Google Auth failed:', error.message);
    console.error('❌ Full error details:', error);
    return null;
  }
};

/**
 * Get Google Sheets instance
 */
const getGoogleSheets = async () => {
  const auth = await getGoogleAuth();
  if (!auth) return null;
  return google.sheets({ version: 'v4', auth });
};

/**
 * Get Google Drive instance
 */
const getGoogleDrive = async () => {
  const auth = await getGoogleAuth();
  if (!auth) return null;
  return google.drive({ version: 'v3', auth });
};

/**
 * Upload screenshot to Google Drive and return viewable link
 */
const uploadScreenshotToDrive = async (screenshotData, fileName) => {
  try {
    const drive = await getGoogleDrive();
    if (!drive) {
      console.log('⚠️ Drive not available, skipping screenshot upload');
      return null;
    }

    // Convert base64 to buffer
    const base64Data = screenshotData.split(',')[1] || screenshotData;
    const buffer = Buffer.from(base64Data, 'base64');

    // Create a folder for screenshots if it doesn't exist
    let folderId = await getOrCreateScreenshotFolder(drive);

    // Upload file to Drive
    const fileMetadata = {
      name: fileName,
      parents: folderId !== 'root' ? [folderId] : []
    };

    const media = {
      mimeType: 'image/png',
      body: stream.Readable.from(buffer)
    };

    console.log('📤 Uploading screenshot to Drive...');
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    console.log('✅ Screenshot uploaded to Drive, File ID:', file.data.id);

    // Make file publicly viewable
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    // Get direct image link for embedding
    const directImageLink = `https://drive.google.com/uc?export=view&id=${file.data.id}`;
    const thumbnailLink = `https://drive.google.com/thumbnail?id=${file.data.id}&sz=w1000`;

    return {
      fileId: file.data.id,
      directLink: directImageLink,
      thumbnailLink: thumbnailLink,
      viewLink: file.data.webViewLink
    };

  } catch (error) {
    console.error('❌ Error uploading to Drive:', error.message);
    return null;
  }
};

/**
 * Get or create a folder for screenshots
 */
const getOrCreateScreenshotFolder = async (drive) => {
  try {
    // Check if folder already exists
    const response = await drive.files.list({
      q: "name='TriByte_Screenshots' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files.length > 0) {
      console.log('📁 Found existing screenshots folder');
      return response.data.files[0].id;
    }

    // Create new folder
    console.log('📁 Creating new screenshots folder...');
    const folder = await drive.files.create({
      resource: {
        name: 'TriByte_Screenshots',
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });

    console.log('✅ Created screenshots folder, ID:', folder.data.id);
    return folder.data.id;
  } catch (error) {
    console.error('❌ Error creating folder:', error.message);
    return 'root';
  }
};

/**
 * Ensure headers exist with your specified column order
 */
const ensureEventRegisterHeaders = async () => {
  try {
    const sheets = await getGoogleSheets();
    if (!sheets) {
      console.log('⚠️ Sheets not available, skipping header setup');
      return false;
    }

    // Check if Event Register sheet exists
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });

      const sheetsList = spreadsheet.data.sheets;
      const eventRegisterSheet = sheetsList.find(
        sheet => sheet.properties.title === 'Event Register'
      );

      if (!eventRegisterSheet) {
        console.log('📝 Creating Event Register sheet...');
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Event Register',
                  gridProperties: {
                    columnCount: 12,  // 12 columns (A to L)
                    rowCount: 1000
                  }
                }
              }
            }]
          }
        });
        console.log('✅ Event Register sheet created');
      } else {
        console.log('✅ Event Register sheet already exists');
      }
    } catch (error) {
      console.error('❌ Error accessing spreadsheet:', error.message);
      return false;
    }

    // Set headers with YOUR SPECIFIED ORDER
    const headerValues = [[
      'Timestamp',           // A
      'User Name',           // B
      'Event Name',          // C
      'College Name',        // D
      'Team Size',           // E
      'Team Name',           // F
      'Amount',              // G
      'Payment Status',      // H
      'Registration Status', // I
      'Participants Names',  // J
      'Participants Mobile', // K
      'Screenshot'           // L - Direct image view
    ]];

    console.log('📝 Setting up headers in Event Register sheet...');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Event Register!A1:L1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: headerValues },
    });

    // Format header row
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.2,
                    green: 0.2,
                    blue: 0.2
                  },
                  textFormat: {
                    foregroundColor: {
                      red: 1.0,
                      green: 0.84,
                      blue: 0.0
                    },
                    bold: true,
                    fontSize: 11
                  },
                  horizontalAlignment: 'CENTER'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
          }]
        }
      });

      // Set column widths
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [
            {
              updateDimensionProperties: {
                range: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 11, // Column L (0-based index)
                  endIndex: 12
                },
                properties: {
                  pixelSize: 300  // Make screenshot column wider
                },
                fields: 'pixelSize'
              }
            }
          ]
        }
      });
    } catch (formatError) {
      console.log('⚠️ Could not format headers (non-critical):', formatError.message);
    }

    console.log('✅ Headers added successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in ensureEventRegisterHeaders:', error.message);
    return false;
  }
};

/**
 * Save event registration with screenshot in Column L
 */
const saveEventRegisterToSheet = async (regData) => {
  try {
    const sheets = await getGoogleSheets();
    if (!sheets) {
      console.log('⚠️ Sheets not available, skipping save to Event Register');
      return false;
    }

    console.log('💾 Saving to Event Register sheet...');

    // Format participants data
    let participantsNames = '';
    let participantsMobileNumbers = '';
    
    if (regData.participants && regData.participants.length > 0) {
      participantsNames = regData.participants.map(p => p.name || '').join(', ');
      participantsMobileNumbers = regData.participants.map(p => p.mobileNumber || '').join(', ');
    }

    // Upload screenshot to Google Drive
    let screenshotFormula = '';
    
    if (regData.screenshot) {
      const fileName = `${regData.userName.replace(/[^a-zA-Z0-9]/g, '_')}_${regData.eventName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      console.log('📤 Uploading screenshot for:', fileName);
      const driveLinks = await uploadScreenshotToDrive(regData.screenshot, fileName);
      
      if (driveLinks) {
        // Use thumbnail for better performance in sheets
        screenshotFormula = `=IMAGE("${driveLinks.thumbnailLink}", 4, 200, 150)`;
        console.log('✅ Screenshot uploaded, will appear in Column L');
      } else {
        console.log('⚠️ Screenshot upload failed, saving without image');
      }
    }

    // Values in YOUR SPECIFIED ORDER
    const values = [[
      new Date().toLocaleString(),                    // A: Timestamp
      regData.userName || '',                          // B: User Name
      regData.eventName || '',                          // C: Event Name
      regData.collegeName || '',                        // D: College Name
      regData.timeSize || 1,                            // E: Team Size
      regData.teamName || 'Individual',                 // F: Team Name
      regData.amount || 0,                              // G: Amount
      regData.paymentStatus || 'verified',              // H: Payment Status
      regData.registrationStatus || 'confirmed',        // I: Registration Status
      participantsNames || '',                           // J: Participants Names
      participantsMobileNumbers || '',                   // K: Participants Mobile
      screenshotFormula                                  // L: Screenshot Image
    ]];

    // Append to sheet
    console.log('📝 Appending data to sheet...');
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Event Register!A:L',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values },
    });

    console.log('✅ Event registration saved. Range:', result.data.updates.updatedRange);
    return true;
  } catch (error) {
    console.error('❌ Google Sheets error:', error.message);
    console.error('❌ Full error:', error);
    return false;
  }
};

/**
 * Save transaction to sheet with screenshot
 */
const saveTransactionToSheet = async (transactionData) => {
  try {
    const sheets = await getGoogleSheets();
    if (!sheets) {
      console.log('⚠️ Sheets not available, skipping save to Transactions');
      return false;
    }

    console.log('💾 Saving to Transactions sheet...');

    // Check if Transactions sheet exists, create if not
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });

      const sheetsList = spreadsheet.data.sheets;
      const transactionsSheet = sheetsList.find(
        sheet => sheet.properties.title === 'Transactions'
      );

      if (!transactionsSheet) {
        console.log('📝 Creating Transactions sheet...');
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Transactions',
                  gridProperties: {
                    columnCount: 9,
                    rowCount: 1000
                  }
                }
              }
            }]
          }
        });

        // Add headers for Transactions sheet
        const headerValues = [[
          'Timestamp',
          'Transaction ID',
          'Amount',
          'User Email',
          'User Phone',
          'User Name',
          'Event Name',
          'Status',
          'Screenshot'
        ]];

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Transactions!A1:I1',
          valueInputOption: 'USER_ENTERED',
          resource: { values: headerValues },
        });

        console.log('✅ Transactions sheet created with headers');
      }
    } catch (error) {
      console.error('❌ Error checking Transactions sheet:', error.message);
    }

    // Upload screenshot to Drive
    let screenshotFormula = '';
    
    if (transactionData.screenshot) {
      const fileName = `TRANS_${transactionData.transactionId}_${Date.now()}.png`;
      console.log('📤 Uploading transaction screenshot for:', fileName);
      const driveLinks = await uploadScreenshotToDrive(transactionData.screenshot, fileName);
      
      if (driveLinks) {
        screenshotFormula = `=IMAGE("${driveLinks.thumbnailLink}", 4, 200, 100)`;
      }
    }

    const values = [[
      new Date().toLocaleString(),
      transactionData.transactionId,
      transactionData.amount,
      transactionData.userEmail,
      transactionData.userPhone,
      transactionData.userName,
      transactionData.eventName,
      'verified',
      screenshotFormula  // Column I - Screenshot
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Transactions!A:I',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values },
    });

    console.log('✅ Transaction saved with screenshot');
    return true;
  } catch (error) {
    console.error('❌ Error saving transaction:', error.message);
    return false;
  }
};

/**
 * Check if transaction exists in Google Sheets
 */
const checkTransactionInGoogleSheets = async (transactionId) => {
  try {
    const sheets = await getGoogleSheets();
    if (!sheets) return false;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Transactions!B:B',
    });

    const rows = response.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === transactionId) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.log('⚠️ Error checking Google Sheets:', error.message);
    return false;
  }
};

module.exports = {
  getGoogleSheets,
  ensureEventRegisterHeaders,
  checkTransactionInGoogleSheets,
  saveTransactionToSheet,
  saveEventRegisterToSheet,
  uploadScreenshotToDrive,
  getGoogleAuth,
  getGoogleDrive
};
