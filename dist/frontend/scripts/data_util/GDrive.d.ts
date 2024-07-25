export type Calendar = {
    kind: string;
    etag: string;
    id: string;
    summary: string;
    description?: string;
    location?: string;
    timeZone?: string;
    conferenceProperties?: {
        allowedConferenceSolutionTypes: [
            string
        ];
    };
};
export type Role = 'reader' | 'writer' | 'owner';
export type User = {
    displayName: string;
    kind: string;
    me: boolean;
    permissionId: string;
    emailAddress: string;
    photoLink: string;
};
export type Permission = {
    id: string;
    displayName: string;
    type: string;
    kind: string;
    permissionDetails: [
        {
            permissionType: string;
            inheritedFrom: string;
            role: string;
            inherited: boolean;
        }
    ];
    photoLink: string;
    emailAddress: string;
    role: string;
    allowFileDiscovery: boolean;
    domain: string;
    expirationTime: string;
    teamDrivePermissionDetails: [
        {
            teamDrivePermissionType: string;
            inheritedFrom: string;
            role: string;
            inherited: boolean;
        }
    ];
    deleted: boolean;
    view: string;
    pendingOwner: boolean;
};
export type FileMetadata = {
    id: string;
    name: string;
    mimeType: string;
    parents?: string[];
    webViewLink?: string;
    iconLink?: string;
    thumbnailLink?: string;
    size?: string;
    createdTime?: string;
    modifiedTime?: string;
    shared?: boolean;
    owners?: Array<User>;
    permissions?: Array<Permission>;
};
export type UploadFile = {
    name: string;
    mimeType: string;
    data: File;
};
export type SharingOptions = {
    emailMessage?: string;
    moveToNewOwnersRoot?: boolean;
    sendNotificationEmail?: boolean;
    supportsAllDrives?: boolean;
    transferOwnership?: boolean;
    useDomainAdminAccess?: boolean;
};
export type Attendee = {
    email: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
    resource?: boolean;
    optional?: boolean;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
};
export type Event = {
    summary: string;
    location?: string;
    description?: string;
    colorId?: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    recurrence?: string[];
    attendees?: Attendee[];
    reminders?: {
        useDefault: boolean;
        overrides: {
            method: 'email' | 'popup';
            minutes: number;
        }[];
    };
    status?: 'confirmed' | 'tentative' | 'cancelled';
    visibility?: 'default' | 'public' | 'private' | 'confidential';
    supportsAttachments?: boolean;
    guestsCanSeeOtherGuests?: boolean;
    guestsCanModify?: boolean;
    guestsCanInviteOthers?: boolean;
    sendUpdates?: 'all' | 'externalOnly' | 'none';
    source?: {
        title: string;
        url: string;
    };
    id: string;
    [key: string]: any;
};
type SheetName = string;
type Cell = `${string}${number}`;
export type Range = `${SheetName}!${Cell}:${Cell}` | `${Cell}:${Cell}` | `${Cell}`;
export declare class GDrive {
    google: any;
    gapi: any;
    tokenClient: any;
    gapiInited: boolean;
    gsiInited: boolean;
    isLoggedIn: boolean;
    container: any;
    userId: string;
    directory: string;
    directoryId: string;
    constructor(apiKey?: any, googleClientId?: any, directory?: any, discoverydocs?: string[], scope?: string);
    initGapi: (apiKey: string, googleClientID: string, DISCOVERY_DOCS?: string[], SCOPE?: string) => Promise<unknown>;
    restoreSignIn: () => Promise<unknown>;
    handleUserSignIn: () => Promise<any>;
    signOut(): Promise<boolean>;
    loadScript: (scriptId: any, src: any, onload: any) => Promise<unknown>;
    deinit: () => void;
    searchDrive(query: string, pageSize?: number, pageToken?: string | null, parentFolderId?: string, trashed?: boolean): Promise<{
        files: any;
        nextPageToken: any;
    }>;
    checkFolder: (nameOrId?: string, onResponse?: (result: any) => void, useId?: boolean, parentFolderId?: string) => Promise<unknown>;
    createDriveFolder: (name?: string, parentFolderId?: string) => Promise<unknown>;
    listFolders(folderId?: string, parent?: string | string[]): Promise<any>;
    getSharableLink(fileId: string): Promise<string | undefined>;
    getFileMetadata(fileId: string): Promise<FileMetadata>;
    getFolderId(folderName: any, parentFolder?: string): Promise<any>;
    downloadFile(fileId: any, mimeType: any, fileName: any): Promise<void>;
    uploadFileToGoogleDrive(data: Blob | string, fileName: string, mimeType: string | undefined, parentFolder: string | string[] | undefined, onProgress: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | undefined, overwrite?: boolean): Promise<unknown>;
    uploadFiles(files: {
        name: string;
        mimeType: string;
        data: Blob | string;
        parents?: string;
    }[], folderId?: string, uploadProgress?: HTMLProgressElement | HTMLMeterElement | string, overwrite?: boolean): Promise<void>;
    updateFile(fileId: string, data: Blob | string, mimeType: string, onProgress?: (this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any): Promise<unknown>;
    listDriveFiles(folderId?: string, pageSize?: number, onload?: (files: any) => {}, pageToken?: string | null, parentFolder?: string): Promise<{
        files: any;
        nextPageToken: any;
    }>;
    deleteFile(fileId: string): void;
    getFileMetadataByName(fileName: string, parentFolder?: string): Promise<FileMetadata | null>;
    shareFileByName(fileName: string, email: string, role?: Role, options?: SharingOptions): Promise<Permission>;
    shareFile(fileId: string, email: string, role?: Role, options?: SharingOptions): Promise<Permission>;
    revokeFileAccess(fileId: string, email: string): Promise<void>;
    createSpreadsheet(fileName: any, parentFolder: any, accessToken: any): Promise<unknown>;
    findSpreadsheet(fileName: any, parentFolder: any, accessToken: any): Promise<any>;
    createTab(spreadsheetId: any, sheetName: any, accessToken: any): Promise<unknown>;
    setSheetData(spreadsheetId: string, sheetName: string, accessToken: string, range: Range, valueInputOption: 'RAW' | 'USER_ENTERED', body: {
        values: (string | number)[][];
    }): Promise<any>;
    appendData(spreadsheetId: string, sheetName: string, accessToken: string, valueInputOption: 'RAW' | 'USER_ENTERED', data: {
        values: (string | number)[][];
    }): Promise<unknown>;
    appendToGoogleSheetOrCreateTab(fileName: string, sheetName: string, //tab
    values: (string | number)[][], valueInputOption?: 'RAW' | 'USER_ENTERED', parentFolder?: string): Promise<void>;
    createCalendar(calendarName: string): Promise<Calendar>;
    findCalendarByName(calendarName: string): Promise<Calendar | null>;
    findEventByName(calendarId: string, eventName: string): Promise<Event | null>;
    listAllCalendars(): Promise<Calendar[]>;
    listEventsByCalendarName(calendarName: string, timeMin: string, timeMax: string): Promise<Event[]>;
    listEvents(calendarId: string, timeMin: string, timeMax: string): Promise<Event[]>;
    deleteCalendarByName(calendarName: string): Promise<void>;
    deleteCalendar(calendarId: string): Promise<void>;
    shareCalendarByName(calendarName: string, email: string, role?: Role, options?: SharingOptions): Promise<Permission>;
    shareCalendar(calendarId: string, email: string, role?: Role, options?: SharingOptions): Promise<Permission>;
    createEventByCalendarName(calendarName: string, event: Event): Promise<Event>;
    createEvent(calendarId: string, event: Event): Promise<Event>;
    deleteEventByCalendarAndEventNames(calendarName: string, eventName: string): Promise<void>;
    deleteEvent(calendarId: string, eventId: string): Promise<void>;
    createRecurringEventByCalendarName(calendarName: string, event: Event): Promise<Event>;
    createRecurringEvent(calendarId: string, event: Event): Promise<Event>;
    updateEventByCalendarAndEventNames(calendarName: string, eventName: string, updatedEvent: Event): Promise<Event>;
    updateEvent(calendarId: string, eventId: string, updatedEvent: Event): Promise<Event>;
    revokeCalendarAccess(calendarId: string, email: string): Promise<void>;
    revokeEventAttendee(calendarId: string, eventId: string, email: string, sendUpdates?: 'all' | 'externalOnly' | 'none'): Promise<Event>;
}
type FileBrowserOptions = {
    onFileClick?: (fileData: FileMetadata) => void;
};
export declare class GFileBrowser extends GDrive {
    previousPageToken?: string;
    nextPageToken?: string;
    options: FileBrowserOptions;
    overwrite: boolean;
    currentFolderId: string;
    currentFolderMetadata?: FileMetadata;
    files: FileMetadata[];
    createFileBrowser(container: HTMLElement | string, folderName?: string, nextPageToken?: string, parentFolder?: string, options?: FileBrowserOptions): Promise<void>;
    createFileUploader(container: HTMLElement | string, folderId: string, nextPageToken: string | undefined, parentFolder: string | undefined): Promise<void>;
    setupCreateFolderButton(folderId: string, container: HTMLElement): void;
    setupUploadButton(folderId: string, nextPageToken: string | undefined, parentFolder: string | undefined, container: HTMLElement): void;
    setupDragAndDrop(currentFolderId: string, nextPageToken: string | undefined, parentFolder: string | undefined, container: HTMLElement): void;
    updateFileList(currentFolderId: string, pageToken: string | null, parentFolder: string | undefined, container: HTMLElement): Promise<void>;
    searchFiles(query: string, container: HTMLElement): Promise<void>;
    renderFileList(files: FileMetadata[], currentFolderId: string, parentFolder: string | undefined, container: HTMLElement): void;
    setupShareFileClick(container: HTMLElement): void;
    setupDeleteFileClick(container: HTMLElement): void;
    getFileTypeIcon(file: FileMetadata): string;
    setupFileItemClick(parentFolder: string | undefined, container: HTMLElement): void;
    setupPaginationButtons(folderId: string, parentFolder: string | undefined, container: HTMLElement): void;
    goBackToParentFolder(container: HTMLElement): Promise<void>;
}
export {};
