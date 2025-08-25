# Permissions Explanation

## Required Permissions for Browsing Log Extension

This extension requests the minimum necessary permissions to fulfill its single purpose: **browsing activity tracking for personal productivity insights**.

### 1. `"storage"` Permission

**Why Required:**
- Store browsing history data locally on the user's device
- Save user preferences and settings
- Maintain visit timestamps and duration data
- Enable data export functionality

**What It Does:**
- Uses Chrome's IndexedDB API for local data storage
- No data is transmitted to external servers
- All data remains on the user's device

**Scope:**
- Limited to local browser storage only
- No access to external storage or cloud services

### 2. `"http://*/*"` and `"https://*/*"` Host Permissions

**Why Required:**
- Track website visits across all web pages
- Record page titles and URLs for analytics
- Measure time spent on different websites
- Enable comprehensive browsing pattern analysis

**What It Does:**
- Monitors page navigation events
- Records visit timestamps and duration
- Captures page titles for better identification

**Scope Limitations:**
- **Excluded URLs**: Chrome internal pages, extension pages, file URLs
- **No Content Access**: Does not read or modify page content
- **No Data Collection**: Only tracks navigation events, not page data

### 3. Content Scripts Configuration

**Matches:**
- `http://*/*` - HTTP websites
- `https://*/*` - HTTPS websites

**Excludes:**
- `chrome://*` - Chrome internal pages
- `chrome-extension://*` - Extension pages
- `moz-extension://*` - Firefox extension pages
- `edge://*` - Edge browser pages
- `about:*` - Browser about pages
- `file://*` - Local file URLs

### 4. Permissions NOT Requested

The extension deliberately **does not request** these permissions:

- ❌ `"activeTab"` - Not needed for background tracking
- ❌ `"tabs"` - No tab manipulation required
- ❌ `"bookmarks"` - No bookmark management
- ❌ `"history"` - No browser history access needed
- ❌ `"cookies"` - No cookie access required
- ❌ `"webRequest"` - No network request monitoring
- ❌ `"notifications"` - No push notifications
- ❌ `"geolocation"` - No location tracking
- ❌ `"microphone"` - No audio access
- ❌ `"camera"` - No video access

### 5. Privacy and Security

**Data Handling:**
- All data stored locally using IndexedDB
- No external API calls or data transmission
- No user account or login required
- No data sharing with third parties

**Access Control:**
- Limited to navigation events only
- No page content reading or modification
- No form data or personal information collection
- No cross-site tracking or correlation

### 6. Compliance with Chrome Web Store Policies

✅ **Minimal Permissions**: Only requests permissions essential for core functionality
✅ **Clear Purpose**: Each permission directly supports browsing activity tracking
✅ **No Overreach**: Does not request permissions for unrelated features
✅ **Privacy Respect**: Minimal data collection, local storage only
✅ **Transparency**: Clear explanation of why each permission is needed

### 7. User Control

Users can:
- **Review permissions** before installation
- **Disable the extension** at any time
- **Delete all data** through the options page
- **Export their data** before uninstalling
- **Understand exactly** what data is collected

This permission configuration ensures the extension can fulfill its single purpose while maintaining user privacy and security.
