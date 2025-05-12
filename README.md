# GDrive.ts – Google Drive/Calendar/Sheets Integration Utility

`npm i gapi_util_wrapper` or just bring GDrive.ts into your local project as it runs standalone.

## Overview
**GDrive.ts** provides a TypeScript module to handle Google Drive file operations, Google Sheets updates, and Google Calendar events through the Google API client. It encapsulates authentication (using Google OAuth2 **TokenClient** from Google Identity Services) and offers a high-level API to manage files (upload, download, search, share), spreadsheets (create or append data), and calendar events (create, list, delete, share). 

The module is intended to simplify browser usage (it interacts with the DOM for file downloads, UI, and localStorage for token persistence) and expects Google API scripts to be loaded as script tags (the class will self-load them and await window.gapi/window.google). There is a lot of boilerplate required so we just went ahead and generated a ton of it for typical clerical needs with drive, sheets, and calendars. It's decently well tested and up to date with the latest api requirements (client Id only!)


This single-file utility centralizes Google Drive, Sheets, and Calendar operations—plus a test interactive file browser class—so you can bootstrap integration rapidly, with minimal boilerplate and clear method APIs for programmatic or AI-driven workflows.  

## Usage Examples

### 1. Initialize & Sign In
```ts
import { GFileBrowser } from './GDrive';

// Instantiate with your OAuth client ID
const clientId = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const gdrive = new GFileBrowser(clientId, { directory: 'AppData', persistToken: true });

// Trigger sign-in (e.g. on button click)
document.getElementById('auth-button')!.addEventListener('click', async () => {
  await gdrive.handleUserSignIn();
  console.log('Signed in, token:', gdrive.tokenResponse.access_token);
});
```

### 2. Upload a File to Drive

```ts
// Upload a Blob or string as a CSV into your root AppData folder
const csvData = 'col1,col2\nfoo,123\nbar,456';
await gdrive.uploadFileToGoogleDrive(
  csvData,
  'example.csv',
  'text/csv',
  gdrive.directoryId,
  undefined, // no progress callback
  /* overwrite= */ true
);
console.log('Uploaded example.csv');
```

### 3. Download or Export a Sheet

```ts
// Download a Google Sheet tab as CSV without auto-saving to disk
const blob = await gdrive.downloadFileByName(
  'MonthlyReport',
  'text/csv',
  undefined,
  /* saveToDisk= */ false,
  gdrive.directoryId
);
const csvText = await blob.text();
console.log('Sheet CSV contents:', csvText);
```

### 4. Append Data to a Sheet (auto-create if needed)

```ts
// Appends rows to “Sales” sheet inside “Analytics.xlsx” spreadsheet (creates sheet if missing)
await gdrive.appendToGoogleSheetOrCreateTab(
  'Analytics.xlsx',
  'Sales',
  [
    ['2025-05-12', 'Q2 Launch', 2500],
    ['2025-05-13', 'Q2 Follow-up', 1800],
  ],
  'USER_ENTERED',
  gdrive.directory
);
console.log('Appended 2 rows to Sales tab');
```

### 5. Create a Calendar Event

```ts
// Create a one-off meeting in the “Work” calendar
const calendars = await gdrive.listAllCalendars();
const workCal = calendars.find(c => c.summary === 'Work')!;
await gdrive.createEvent(workCal.id, {
  summary: 'Project Sync',
  location: 'Zoom',
  description: 'Weekly status update',
  start: { dateTime: new Date().toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  end:   { dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  sendUpdates: 'none'
});
console.log('Event created in Work calendar');
```

### 6. Embed a File Browser UI

```ts
// Inject a full test file-browser into your page
await gdrive.createFileBrowser('#file-browser-container');
// Now users can navigate, upload, download and share files via the UI
```

---



## GDrive Class
**GDrive** is the core class providing methods for Google API interactions. It maintains OAuth2 state and a default Drive folder (by default named `"AppData"`, configurable via the constructor). Key features and methods include:

### Static Methods
- `parseFileId(url: string): string | null` — Extracts the file ID from common Google Drive/Sheets URL patterns (e.g. `/d/<id>/`, `/file/d/<id>/`, `open?id=<id>`, `uc?export=download&id=<id>`).
- `fetchPublicFile(urlOrId: string, opts?: { exportMime?: string; gid?: number }): Promise<{ data: string \| Blob; metadata: { contentType: string; fileName?: string; size?: number } }>`  
  Fetches a public Google Sheet (exports as CSV when `opts.exportMime='text/csv'` and `opts.gid` specifies the tab) or any public Drive file via a simple `fetch` (no OAuth required).

### Authentication
- `initGapi(clientId: string, discoveryDocs?: string[], scope?: string): Promise<boolean>`  
  Loads Google API scripts and Discovery Docs (Drive, Calendar, Sheets, OAuth2), initializes the gapi client, and sets up a `TokenClient`.  
- `handleUserSignIn(): Promise<google.accounts.oauth2.TokenResponse>`  
  Triggers OAuth consent to obtain an access token.  
- `attemptRestoreSignIn(tokenResponse?: { access_token: string; expires_in?: number }): Promise<google.accounts.oauth2.TokenResponse>`  
  Restores a previously stored token from localStorage (if `persistToken` is true).  
- `signOut(): Promise<boolean>`  
  Revokes the access token and clears session state.

### Folder & File Management
- `checkFolder(nameOrId: string, onResponse?: Function, useId?: boolean, parentFolderId?: string): Promise<any>`  
  Ensures a Drive folder exists (creates if missing).  
- `createDriveFolder(name: string, parentFolderId?: string): Promise<gapi.client.drive.File>`  
  Creates a new Drive folder.  
- `listFolders(folderId?: string, parentField?: string): Promise<gapi.client.drive.File[]>`  
  Lists sub-folders.  
- `listDriveFiles(folderId?: string, pageSize?: number, onload?: Function, pageToken?: string, parentFolder?: string): Promise<{ files: any[]; nextPageToken?: string }>`  
  Lists files with pagination.  
- `getFileMetadata(fileId: string): Promise<gapi.client.drive.File>`  
  Retrieves metadata for a Drive file by ID.  
- `getFileMetadataByName(name: string, parentFolder?: string): Promise<gapi.client.drive.File \| undefined>`  
  Finds metadata by file name.  
- `deleteFile(fileId: string): void`  
  Deletes a Drive file.

### Search & Sharing
- `searchDrive(query: string, pageSize?: number, pageToken?: string, parentFolderId?: string, trashed?: boolean): Promise<{ files: any[]; nextPageToken?: string }>`  
  Searches Drive by name or query.  
- `getSharableLink(fileId: string): Promise<string>`  
  Ensures “anyone with link” permission, returns a shareable URL.  
- `shareFile(fileId: string, email: string, role?: Role, options?: SharingOptions): Promise<Permission>`  
  Grants access to a Drive file.  
- `revokeFileAccess(fileId: string, email: string): Promise<void>`  
  Revokes a user’s permission on a file.

### Upload & Download
- `uploadFileToGoogleDrive(data: Blob \| string, fileName: string, mimeType?: string, parentFolder?: string \| string[], onProgress?: Function, overwrite?: boolean): Promise<any>`  
  Uploads or overwrites a file via multipart.  
- `uploadFiles(files: UploadFile[], folderId?: string, uploadProgressElement?: HTMLProgressElement \| HTMLMeterElement \| string, overwrite?: boolean): Promise<void>`  
  Batch uploads with progress feedback.  
- `updateFile(fileId: string, data: Blob \| string, mimeType: string, onProgress?: Function): Promise<any>`  
  Replaces file content with a PATCH.  
- `downloadFile(fileId: string, exportMimeType?: string, fileNameOverride?: string, saveToDisk?: boolean): Promise<Blob>`  
  Downloads binary or exports native Docs/Sheets.  
- `downloadFileByName(fileName: string, exportMimeType?: string, downloadAs?: string, saveToDisk?: boolean, parentFolder?: string): Promise<Blob>`  
  Finds by name then downloads.

### Google Sheets Utilities
- `createSpreadsheet(title: string, parentFolderId: string, accessToken: string): Promise<any>`  
  Creates a new Google Sheet.  
- `findSpreadsheet(name: string, parentFolderId: string, accessToken: string): Promise<any>`  
  Finds an existing Sheet by name.  
- `createTab(spreadsheetId: string, sheetName: string, accessToken: string): Promise<any>`  
  Adds a worksheet tab.  
- `getSheetData(spreadsheetId: string, range?: string, accessToken: string): Promise<any>`  
  Fetches sheet data; if `range` is omitted or empty returns the full spreadsheet with grid data (`includeGridData=true`), otherwise returns values for the specified A1-notation range (`majorDimension=ROWS`).  
- `setSheetData(spreadsheetId: string, sheetName: string, accessToken: string, range: Range, valueInputOption?: 'RAW' \| 'USER_ENTERED', body?: { values: (string \| number)[][] }): Promise<any>`  
  Writes or appends to a range.  
- `appendData(spreadsheetId: string, sheetName: string, accessToken: string, valueInputOption?: 'RAW' \| 'USER_ENTERED', data?: { values: (string \| number)[][] }): Promise<any>`  
  Appends rows.  
- `appendToGoogleSheetOrCreateTab(fileName: string, sheetName: string, values: (string \| number)[][], valueInputOption?: 'RAW' \| 'USER_ENTERED', parentFolder?: string): Promise<void>`  
  Ensures sheet & tab exist, then appends rows.

### Google Calendar Utilities
- `createCalendar(name: string): Promise<Calendar>`  
  Creates a Google Calendar.  
- `listAllCalendars(): Promise<Calendar[]>`  
  Lists all calendars.  
- `findCalendarByName(name: string): Promise<Calendar \| undefined>`  
  Finds a calendar by title.  
- `createEvent(calendarId: string, eventObj: Event): Promise<Event>`  
  Inserts a calendar event.  
- `createEventByCalendarName(name: string, eventObj: Event): Promise<Event>`  
  Inserts an event by calendar name.  
- `listEvents(calendarId: string, timeMin: string, timeMax: string): Promise<Event[]>`  
  Lists events in a date range.  
- `listEventsByCalendarName(name: string, timeMin: string, timeMax: string): Promise<Event[]>`  
  Lists by calendar name.  
- `deleteEvent(calendarId: string, eventId: string): Promise<void>`  
  Deletes an event.  
- `deleteEventByCalendarAndEventNames(calName: string, eventName: string): Promise<void>`  
  Deletes by names.  
- `createRecurringEvent(calendarId: string, event: Event): Promise<Event>`  
  Inserts recurring events.  
- `createRecurringEventByCalendarName(name: string, event: Event): Promise<Event>`  
  Recurring by name.  
- `shareCalendar(calendarId: string, email: string, role?: Role, options?: SharingOptions): Promise<Permission>`  
  Adds ACL entries.  
- `shareCalendarByName(name: string, email: string, role?: Role, options?: SharingOptions): Promise<Permission>`  
  Shares by name.  
- `deleteCalendar(calendarId: string): Promise<void>`  
  Deletes a calendar.  
- `deleteCalendarByName(name: string): Promise<void>`  
  Deletes by name.

## GFileBrowser Class
Extends **GDrive** to provide a browser-based file explorer UI:

- `createFileBrowser(container: HTMLElement | string, folderName?: string, nextPageToken?: string, parentFolder?: string, options?: FileBrowserOptions): Promise<void>` — Injects upload controls, search bar, drag-and-drop, path navigation, file list, and pagination.  
- `createFileUploader(container: HTMLElement | string, folderId?: string, nextPageToken?: string, parentFolder?: string): Promise<void>` — Renders upload-only UI with “Create Folder” button.  
- `updateFileList(currentFolderId?: string, pageToken?: string, parentFolder?: string, container?: HTMLElement): Promise<void>` — Fetches and displays current folder.  
- `searchFiles(query: string, container: HTMLElement): Promise<void>` — Filters by name.  
- `goBackToParentFolder(container: HTMLElement): Promise<void>` — Navigates up one level.  

UI Helpers:  
- `setupUploadButton(...)`, `setupDragAndDrop(...)`, `setupCreateFolderButton(...)` — File upload wiring.  
- `setupPaginationButtons(...)` — Next/Prev.  
- `setupFileItemClick(...)` — Open/download or navigate.  
- `setupShareFileClick(...)`, `setupDeleteFileClick(...)` — Share & delete.  
- `getFileTypeIcon(file: FileMetadata): string` — Emoji or thumbnail.  
- `showExportMenu(...)` / `removeExportMenus()` — Export format menu.

## Constants & Types
- **`nativeExportOptions`** — Mapping of Google-native MIME types to export formats (e.g., Sheets → CSV, XLSX, PDF).  
- **Defaults**  
  - Working folder: `"AppData"` (`directory` / `directoryId`).  
  - Token persistence: `localStorage[_gdr_tok_25v1]` if `persistToken` (configurable via constructor: `directory`, `persistToken`, `storageKey`).  

- **Type Definitions**  
  - `Calendar`, `Event`, `Attendee`, `User`, `Permission`, `Role`, `FileMetadata`, `UploadFile`, `SharingOptions`, `Range` — Mirror Google API structures for Drive, Sheets, and Calendar.

## Setup & Dependencies
- **Scripts**: Loads `https://apis.google.com/js/api.js` and GIS script (`https://accounts.google.com/gsi/client`) dynamically via `initGapi`.  
- **OAuth2 Client ID & Scopes**: Supply your Web app Client ID and desired scopes (default covers Drive, Calendar, Sheets, and user info).  
- **Browser Environment**: Uses `document`, `window.localStorage`, `XMLHttpRequest`/`fetch`, and triggers downloads via DOM. No Node.js dependencies.  
- **Configuration Options** (in constructor or `initGapi`):  
  - `directory`: custom Drive folder name/ID.  
  - `persistToken`: enable/disable localStorage.  
  - `storageKey`: change token storage key.  
  - `discoveryDocs` & `scope`: customize APIs and OAuth scopes.

---


## CSV.ts – Dependency-Free Browser CSV/TSV Utility

### Overview

**CSV.ts** is a zero-dependency TypeScript module for robust, standards-compliant CSV/TSV handling in the browser. It supports:

* RFC-4180-compliant quoting and parsing (commas, tabs, line breaks, escaped quotes)
* Automatic delimiter sniffing (`,`, `\t`, `;`, `|`)
* Optional UTF-8 BOM for Excel compatibility
* Flexible header row generation
* Per-row “notes” appended as an extra column
* Safe filename sanitization and extension auto-add
* Both parsed and raw file-open APIs (multi-line fields preserved)
* Simple TSV mode via a flag

Ideal for client-side exports/imports, prototyping, or interactive UIs—no libraries required.

---

## API

All methods are static—there’s no more constructor or instance state. You can call them directly or wire them up to your buttons/inputs.

### Notes

* `CSV.addNote(idx: number, text: string)`
  Register a “note” to be appended at row `idx` when serializing.
* `CSV.clearNotes()`
  Remove all registered notes.

---

### Serialization

```ts
// Build a CSV/TSV string from rows
CSV.processArraysForCSV(
  data: Array<string | any[]>,
  delimiter: string = ",",       // or "\t" for TSV
  header: string[] = [],         // optional column names
  includeNotes: boolean = false  // whether to append notes column
): string
```

* **Returns** fully-quoted CSV/TSV text (with header row if provided).

```ts
// Download CSV/TSV text as a file
CSV.saveCSV(
  csvText: string,
  filename?: string             // auto-appends “.csv” if needed
): void
```

---

### File-Open

```ts
// Prompt user to pick a .csv/.tsv, parse into rows
CSV.openCSV(
  delimiter?: string,                   
  onOpen?: (data: string[][], header: string[], filename: string) => void
): Promise<{ data: string[][]; header: string[]; filename: string }>
```

* **Auto-detects** delimiter if you pass `","` (default).
* **Parses** quoted fields and multiline cells.

```ts
// Prompt user and get raw file text
CSV.openCSVRaw(
  onOpen?: (text: string, filename: string) => void
): Promise<{ data: string; filename: string }>
```

* **Returns** entire file content—no parsing.

---

### Utilities

* `CSV.parseLine(line: string, delim: string): string[]`
  Parse a single CSV line with full quote-escaping logic.
* `CSV.quoteRow(fields: string[], delim: string): string`
  Quote and join fields into one CSV row.
* `CSV.detectDelimiter(raw: string, fallback: string): string`
  Sniff the most-common of `","`, `"\t"`, or `";"` in the first KB.
* `CSV.splitLines(raw: string): string[]`
  Normalize CRLF/LF and drop empty lines.
* `CSV.detectEncoding(filename: string): string`
  Chooses `"utf-8"` (with BOM for `.csv`/`.tsv`).
* `toISOLocal(d: Date|string): string`
  Produce a local-time ISO timestamp with `(UTC±HH:MM)`.

---

### Structured Data Export

```ts
CSV.processDataForCSV(options: ProcessOptions): ProcessResult | undefined
```

* **`ProcessOptions`**

  ```ts
  {
    filename?: string;      // without “.csv”
    save?: boolean;         // triggers download if true
    header?: string[];      // column order override
    data: Record<string, any[]> | Record<string, any[]>[];
  }
  ```
* **`ProcessResult`**

  ```ts
  {
    filename?: string;
    header: string;   // comma-joined header + "\n"
    body:   string;   // row data (no header)
  }
  ```

Handles:

* Arrays of arrays or objects with array-valued columns
* Automatic “localized” timestamp column if you include `timestamp`
* Fully quoted output and optional immediate download

---

### Quick Start

1. **Import module**

   ```ts
   import { CSV, parseCSVData, toISOLocal } from "./csv-utils";
   ```
2. **Generate CSV text**

   ```ts
   const rows = [["Alice", 30], ["Bob", 25]];
   const header = ["Name","Age"];
   const csvText = CSV.processArraysForCSV(rows, ",", header);
   CSV.saveCSV(csvText, "users.csv");
   ```
3. **Open & parse**

   ```ts
   CSV.openCSV().then(({data, header, filename}) => {
     console.log("Loaded", filename, header, data);
   });
   ```
4. **Raw read**

   ```ts
   CSV.openCSVRaw((text, name) => {
     console.log("Raw content of", name, text);
   });
   ```
5. **Add notes**

   ```ts
   CSV.addNote(1, "Review this entry"); //row to add note to
   const csvWithNotes = CSV.processArraysForCSV(rows, ",", header, true);
   CSV.clearNotes(); //clear backed up notes after writing
   ```

No build step needed—just bundle or drop into your TS project and you’re done.
