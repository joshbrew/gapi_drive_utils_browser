# GDrive.ts – Google Drive/Calendar/Sheets Integration Utility

## Overview
**GDrive.ts** provides a TypeScript module to handle Google Drive file operations, Google Sheets updates, and Google Calendar events through the Google API client. It encapsulates authentication (using Google OAuth2 **TokenClient** from Google Identity Services) and offers a high-level API to manage files (upload, download, search, share), spreadsheets (create or append data), and calendar events (create, list, delete, share). 

The module is intended to simplify browser usage (it interacts with the DOM for file downloads, UI, and localStorage for token persistence) and expects Google API scripts to be loaded as script tags (the class will self-load them and await window.gapi/window.google). There is a lot of boilerplate required so we just went ahead and generated a ton of it for typical clerical needs with drive, sheets, and calendars. It's decently well tested and up to date with the latest api requirements (client Id only!)

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

This single-file utility centralizes Google Drive, Sheets, and Calendar operations—plus a test interactive file browser class—so you can bootstrap integration rapidly, with minimal boilerplate and clear method APIs for programmatic or AI-driven workflows.  


# CSV.ts – Dependency-Free Browser CSV/TSV Utility

## Overview

**CSV.ts** is a TypeScript module for robust, standards-compliant CSV/TSV handling in the browser, with zero external dependencies. It provides:

* RFC-4180-compliant quoting and parsing (handles commas, tabs, line breaks, and escaped quotes)
* Automatic delimiter detection (`,`, `\t`, `;`, `|`)
* Optional UTF-8 BOM for Excel compatibility
* Flexible header generation when missing
* Per-row “notes” appended as comment columns
* Safe filename sanitization and extension auto-switching
* Raw and structured file‐open APIs (multi-line field support)
* Tab-delimited (TSV) mode via a single flag

Ideal for client-side data export/import, quick prototyping, or interactive UIs without pulling in any packages.

## CSV Class

**CSV** is the central class exposing instance- and static-level I/O and processing methods. It lets you wire up `<input type="file">` or `<button>` elements, attach a callback for when a file’s read, and produce fully-escaped CSV/TSV strings for download.

### Constructor

```ts
constructor(
  onOpen?: (data: string[][], header: string[], path: string) => void,
  saveButtonId?: string,
  openButtonId?: string
)
```

* `onOpen(data, header, path)` — called after parsing a user-selected file
* `saveButtonId` — ID of a button that triggers `CSV.saveCSV()`
* `openButtonId` — ID of a button that triggers `CSV.openCSV()`

### Instance Methods

* `addNote(idx: number, text: string)`
  Registers a note to append as an extra column on row `idx`.
* `processArraysForCSV(data, delimiter, header, saveNotes)` → `string`
  Build a CSV/TSV string from an array of arrays or pre-joined strings.

  * `data`: `string[]` or `any[][]`
  * `delimiter`: `","` or `"\t"`
  * `header`: optional array of column names; auto-generates `col1`, `col2`,… if omitted
  * `saveNotes`: include registered notes as a trailing column

### Static I/O Methods

* `static saveCSV(csvText: string, name?: string): void`
  Kicks off a download of the given CSV/TSV text (auto-prepends BOM for Excel).
* `static openCSV(delimiter?: string, onOpen?): Promise<{ data:string[][]; header:string[]; filename:string }>`
  Opens a file picker for `.csv`/`.tsv`, auto-detects delimiter if omitted, parses into a 2D string array.
* `static openCSVRaw(onOpen?): Promise<{ data:string; filename:string }>`
  Opens a file picker and returns the unparsed file content (multi-line fields preserved).

## Utility Functions

* **`parseLine(line: string, delim: string): string[]`**
  Low-level parser for a single line with quoted fields.
* **`quoteRow(row: string[], delim: string): string`**
  Quotes any fields containing delimiters, quotes, or line breaks.
* **`detectDelimiter(raw: string, fallback: string): string`**
  Simple sniff on the first 1 KB to pick the most frequent of `,`, `\t`, or `;`.
* **`splitLines(raw: string): string[]`**
  Normalizes CRLF/LF and splits into non-empty lines.
* **`detectEncoding(filename: string): string`**
  Returns `"utf-8"` (with BOM for `.csv`/`.tsv`).
* **`toISOLocal(d: Date | string): string`**
  Formats a date into a local-time ISO string plus `(UTC±HH:MM)`.

## Structured Data Processing

**`static processDataForCSV(options: ProcessOptions): ProcessResult | undefined`**
Turn an object or array of objects into CSV rows, handling:

* Multiple columns, including nested arrays for multi-column FFT-style data
* Automatic insertion of a localized timestamp column when `timestamp` is present
* Consistent quoting and optional direct download via `options.save`

### `ProcessOptions` fields

```ts
{
  filename?: string;       // resulting filename (no extension required)
  save?: boolean;          // auto‐trigger download
  header?: string[];       // override column order/names
  data: Record<string, any[]> | Record<string, any[]>[]; 
}
```

### `ProcessResult`

```ts
{
  filename?: string;
  header: string; // comma-joined column row + "\n"
  body:   string; // newline-joined CSV body without header
}
```

## Setup & Usage

1. **Import & instantiate**

   ```ts
   import { CSV } from "./csv-utils";
   const csvUtil = new CSV((data, header, name) => {
     console.log("Loaded:", name, header, data);
   }, "saveBtnId", "openBtnId");
   ```
2. **Add notes** (optional)

   ```ts
   csvUtil.addNote(2, "Check this row!");
   ```
3. **Process arrays**

   ```ts
   const csvText = csvUtil.processArraysForCSV(
     [["Alice", 30], ["Bob", 25]],
     ",",
     ["Name","Age"],
     true
   );
   CSV.saveCSV(csvText, "users.csv");
   ```
4. **Open & parse a file**

   ```ts
   CSV.openCSV().then(({ data, header, filename }) => {
     // data: string[][], header: string[], filename: string
   });
   ```
5. **Raw read**

   ```ts
   CSV.openCSVRaw((text, name) => {
     console.log("Raw content of", name, text);
   });
   ```

No build step required—just include in your TypeScript project, bundle however you like, and you’re ready to handle CSV/TSV in-browser without a hitch.
