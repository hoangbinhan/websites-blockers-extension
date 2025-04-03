# Website Blocker Chrome Extension

A Chrome extension that allows you to block specific websites and schedule blocking times.

## Features

- Block specific websites by entering their URLs
- Schedule blocking times for different days
- Support for weekdays, weekends, or all days
- Clean and intuitive user interface
- Persistent storage of blocked sites and schedules

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon in your Chrome toolbar
2. To block a website:
   - Enter the website URL (e.g., "facebook.com")
   - Click "Add Site"
3. To set up a schedule:
   - Select the start time
   - Select the end time
   - Choose the days (All Days, Weekdays, or Weekends)
   - Click "Save Schedule"

## Files

- `manifest.json`: Extension configuration
- `popup.html`: Extension popup interface
- `popup.js`: Popup logic and user interactions
- `background.js`: Website blocking and scheduling logic
- `blocked.html`: Page shown when a site is blocked
- `styles.css`: Extension styling

## Note

You'll need to add icon files (16x16, 48x48, and 128x128 pixels) in an `icons` directory for the extension to work properly. 