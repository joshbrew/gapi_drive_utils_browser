
declare var window;

//browser google drive utility

//some types
export type Calendar = {
  kind: string,
  etag: string,
  id: string,
  summary: string,
  description?: string,
  location?: string,
  timeZone?: string,
  conferenceProperties?: {
    allowedConferenceSolutionTypes: [
      string
    ]
  }
}

export type Role = 'reader' | 'writer' | 'owner';

export type User = {
  displayName: string,
  kind: string,
  me: boolean,
  permissionId: string,
  emailAddress: string,
  photoLink: string
}

export type Permission = {
  id: string,
  displayName: string,
  type: string,
  kind: string,
  permissionDetails: [
    {
      permissionType: string,
      inheritedFrom: string,
      role: string,
      inherited: boolean
    }
  ],
  photoLink: string,
  emailAddress: string,
  role: string,
  allowFileDiscovery: boolean,
  domain: string,
  expirationTime: string,
  teamDrivePermissionDetails: [
    {
      teamDrivePermissionType: string,
      inheritedFrom: string,
      role: string,
      inherited: boolean
    }
  ],
  deleted: boolean,
  view: string,
  pendingOwner: boolean
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
}

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
  colorId?:string;
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
    useDefault: boolean,
    overrides: {method:'email'|'popup', minutes:number}[],
  };
  status?:'confirmed'|'tentative'|'cancelled';
  visibility?:'default'|'public'|'private'|'confidential';
  supportsAttachments?:boolean;
  guestsCanSeeOtherGuests?:boolean;
  guestsCanModify?:boolean;
  guestsCanInviteOthers?:boolean;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
  source?:{
    title:string;
    url:string;
  };
  id:string;
  [key: string]: any; // To support additional properties
};

// Type Definitions
type SheetName = string;
type Cell = `${string}${number}`; // Simple alias for cell notation, e.g., 'A1', 'B2'
export type Range = `${SheetName}!${Cell}:${Cell}` | `${Cell}:${Cell}` | `${Cell}`;


export class GDrive {
  //------------------------
  //-GOOGLE DRIVE FUNCTIONS-
  //------------------------

  google = (window as any).google;
  gapi = (window as any).gapi;
  tokenClient = (window as any).tokenClient;
  gapiInited = this.gapi !== undefined;
  gsiInited = this.google !== undefined;
  isLoggedIn = false;
  container: any;

  userId: string;

  directory = "AppData"; //our directory of choice
  directoryId: string; //the unique google id
  //fs = fs;

  constructor(apiKey?, googleClientId?, directory?, discoverydocs?:string[], scope?:string) {
    if (directory) this.directory = directory;
    if (apiKey && googleClientId)
      this.initGapi(apiKey, googleClientId, discoverydocs, scope);
  }

  //this is deprecated now?: https://developers.google.com/identity/gsi/web/guides/overview
  initGapi = async (
    apiKey: string,
    googleClientID: string,
    DISCOVERY_DOCS: string[] = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest', 'https://www.googleapis.com/discovery/v1/apis/oauth2/v2/rest', 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
    SCOPE: string = "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar"
  ) => {
    return new Promise(async (resolve, rej) => {
      this.gapiInited = false;
      this.gsiInited = false;

      // Load GAPI client
      const gapiScriptId = 'gapi-client-script';
      if (document.getElementById(gapiScriptId)) {
        // If the script already exists, deinitialize before reloading
        this.deinit();
      }
      await this.loadScript(gapiScriptId, "https://apis.google.com/js/api.js", () => {
        this.gapi = window.gapi;
        this.gapi.load('client', async () => {
          await this.gapi.client.init({
            apiKey: apiKey,
            discoveryDocs: DISCOVERY_DOCS,
          });
          this.gapiInited = true;
        });
      });

      // Load GSI client
      const gsiScriptId = 'gsi-client-script';

      await this.loadScript(gsiScriptId, "https://accounts.google.com/gsi/client", () => {
        this.google = window.google;
        this.tokenClient = this.google.accounts.oauth2.initTokenClient({
          client_id: googleClientID,
          scope: SCOPE,
          callback: '', // defined later
        });
        this.gsiInited = true;
      });

      resolve(true);
    });
  }

  restoreSignIn = () => {
    return new Promise((res, rej) => {
      if (!this.tokenClient) {
        console.error('Google API not found');
        return;
      }

      this.tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
          rej(resp);
        } else if (resp.access_token) {
          // Successful sign-in

          this.isLoggedIn = true;
          if (this.directory && !this.directoryId) { //this constrains the top level directory allowed in an application-specific folder we define by name, since we don't want to fully access the drive usually.
            await this.checkFolder(this.directory); 
          }
          res(resp);
        } else {
          console.error("Sign-in incomplete.")
          // Handle other scenarios, such as the user closing the consent dialog
          rej('Sign-in incomplete.');
        }
      };

      if (this.gapi.client.getToken()) {
        // Skip display of account chooser and consent dialog for an existing session.
        this.tokenClient.requestAccessToken({ prompt: '' });
      } else {
        rej("User not logged in!");
      }
    });
  }

  handleUserSignIn = (): Promise<any> => {
    return new Promise((res, rej) => {
      if (!this.tokenClient) {
        console.error('Google API not found');
        return;
      }

      this.tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
          rej(resp);
        } else if (resp.access_token) {
          // Successful sign-in

          this.isLoggedIn = true;
          if (this.directory && !this.directoryId) { //this constrains the top level directory allowed in an application-specific folder we define by name, since we don't want to fully access the drive usually.
            await this.checkFolder(this.directory); 
          }
          res(resp);
        } else {
          console.error("Sign-in incomplete.")
          // Handle other scenarios, such as the user closing the consent dialog
          rej('Sign-in incomplete.');
        }
      };

      if (this.gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {

        // Skip display of account chooser and consent dialog for an existing session.
        this.tokenClient.requestAccessToken({ prompt: '' });
      }
    });
  }

  async signOut() {
    if (this.gapi) {
      const token = this.gapi.client.getToken();
      await this.google.accounts.oauth2.revoke(token.access_token);
      this.gapi.client.setToken(null);
      return true;
    } return false;
  }

  loadScript = (scriptId, src, onload) => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.type = "text/javascript";
      script.src = src;
      script.async = true;
      script.defer = true;
      script.id = scriptId;
      script.onload = () => {
        onload();
        resolve(true);
      };
      document.head.appendChild(script);
    });
  }

  deinit = () => {

    // Properly handle the deinitialization of gapi client
    if (this.gapi && this.gapi.client) {
      // If there are specific cleanup tasks for gapi.client, perform them here
      // For now, we're just setting it to undefined
      this.gapi.client = undefined;
    }
    // Reset variables
    this.google = undefined;
    this.gapi = undefined;
    this.tokenClient = undefined;
    this.gapiInited = false;
    this.gsiInited = false;
    this.isLoggedIn = false;

    // Remove scripts tp reset state
    const removeScript = (scriptId) => {
      const script = document.getElementById(scriptId);
      if (script) {
        document.head.removeChild(script);
      }
    }

    removeScript('gapi-client-script');
    removeScript('gsi-client-script');


  }

  async searchDrive(query: string, pageSize = 100, pageToken: string | null = null, parentFolderId?: string, trashed=false) {
    try {
      let q = `name contains '${query}' and trashed=${trashed}`;
      if (parentFolderId) {
        q += ` and '${parentFolderId}' in parents`;
      }
  
      const response = await this.gapi.client.drive.files.list({
        q,
        pageSize,
        fields: 'nextPageToken, files(id, name, mimeType)',
        pageToken,
      });
  
      return {
        files: response.result.files,
        nextPageToken: response.result.nextPageToken,
      };
    } catch (error) {
      console.error('Error searching Drive:', error);
      throw error;
    }
  }

  //check folder found or create if not
  checkFolder = (
    nameOrId = this.directory,
    onResponse = (result) => { },
    useId = false,
    parentFolderId?: string
  ) => {
    return new Promise((res, rej) => {
      let q;
      if (useId) {
        // If querying by ID, check within the specified parentFolderId or don't specify parent
        q = `'${nameOrId}' in parents and mimeType='application/vnd.google-apps.folder'` + (parentFolderId ? ` and '${parentFolderId}' in parents` : '');
      } else {
        // If querying by name, include parentFolderId in query if provided
        // Query by name, potentially within a specific parent folder
        q = `name='${nameOrId}' and mimeType='application/vnd.google-apps.folder'`;
        if (parentFolderId) {
          // Add parentFolderId to the query if provided
          q += ` and '${parentFolderId}' in parents`;
        }
      }
      this.gapi.client.drive.files.list({
        q,
      }).then(async (response) => {
        //console.log(response);
        if (response.result.files.length === 0) {
          const result = await this.createDriveFolder(nameOrId, parentFolderId); if (typeof result !== 'object') throw new Error(`${result}`);
          if (onResponse) onResponse(result);
          if (!this.directoryId) this.directoryId = (result as any).id; // Make sure this is correctly set
          res(result);
        } else {
          if (onResponse) onResponse(response.result);
          if (!this.directoryId) this.directoryId = response.result.files[0].id; // Set the directory ID from the response
          res(response.result);
        }
      }).catch(error => {
        console.error('Error checking folder:', error);
        rej(error);
      });
    });
  }

  createDriveFolder = (
    name = this.directory,
    parentFolderId?: string
  ) => {
    return new Promise((res, rej) => {
      if (this.isLoggedIn) {
        let data = {} as any;
        data.name = name;
        data.mimeType = "application/vnd.google-apps.folder";
        if (parentFolderId) data.parents = [parentFolderId];
        this.gapi.client.drive.files.create({ 'resource': data }).then((response) => {
          //console.log("Created Folder:",response.result);
          res(response.result as any);
        });
      } else {
        console.error("Sign in with Google first!");
        this.handleUserSignIn().then(async (resp) => {
          if (this.isLoggedIn) {
            res(await this.createDriveFolder(name, parentFolderId)); //rerun
          }
        });
      }
    });
  }

  async listFolders(folderId = this.directoryId, parent: string | string[] = 'parents') {
    try {
      const response = await this.gapi.client.drive.files.list({
        q: `'${folderId}' in ${parent} and mimeType='application/vnd.google-apps.folder'`,
        fields: 'nextPageToken, files(id, name, mimeType)'
      });
      return response.result.files || [];
    } catch (error) {
      console.error('Error listing folders:', error);
      throw error;
    }
  }

  async getSharableLink(fileId: string): Promise<string|undefined> {
    try {
      // Check existing permissions
      const permissionsResponse = await this.gapi.client.drive.permissions.list({
        fileId,
        fields: 'permissions(id, role, type)',
      });
  
      const permissions = permissionsResponse.result.permissions;
      const anyonePermission = permissions.find(permission => permission.type === 'anyone' && permission.role === 'reader');
  
      // If 'anyone' permission doesn't exist, create it
      if (!anyonePermission) {
        await this.gapi.client.drive.permissions.create({
          fileId,
          resource: {
            role: 'reader',
            type: 'anyone',
          },
        });
      }
  
      // Fetch the file metadata to get the webViewLink
      const fileMetadata = await this.getFileMetadata(fileId);
      return fileMetadata.webViewLink;
    } catch (error) {
      console.error('Error getting sharable link:', error);
      throw error;
    }
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    try {
      const response = await this.gapi.client.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, parents, webViewLink, iconLink, thumbnailLink, size, createdTime, modifiedTime, shared, owners, permissions',
      });
      return response.result;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  async getFolderId(folderName, parentFolder = 'root') {
    try {
      const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' ${parentFolder ? `and '${parentFolder}' ` : ``}in parents and trashed=false`;
      const response = await this.gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        pageSize: 1
      });

      const folder = response.result.files && response.result.files[0];
      if (folder) {
        return folder.id;
      } else {
        console.error('Folder not found');
        return null;
      }
    } catch (error) {
      console.error('Error getting folder ID:', error);
      throw error;
    }
  }

  async downloadFile(fileId, mimeType, fileName) {
    try {
      const response = await this.gapi.client.drive.files.get({
        fileId,
        alt: 'media'
      }, { responseType: 'blob' });

      const blob = new Blob([response.body], { type: mimeType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName ? fileName : 'downloaded_file';
      //document.body.appendChild(link);
      link.click();
      //document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  //https://developers.google.com/drive/api/guides/manage-sharing todo: more perms
  async uploadFileToGoogleDrive(
    data: Blob | string = 'a,b,c,1,2,3\nd,e,f,4,5,6\n',
    fileName: string = `${new Date().toISOString()}.csv`,
    mimeType: string | undefined = 'application/vnd.google-apps.spreadsheet',
    parentFolder: string | string[] | undefined = this.directoryId,
    onProgress: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | undefined,
    overwrite: boolean = false
  ) {
    if (typeof data === 'string') {
      const type = fileName.endsWith('.csv') ? 'text/csv' : 'text/plain';
      data = new Blob([data], { type });
    }
  
    const metadata = {
      'name': fileName,
      'mimeType': mimeType,
      'parents': Array.isArray(parentFolder) ? parentFolder : [parentFolder], // upload to the current directory
    };
  
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', data);
  
    const token = this.gapi.auth.getToken().access_token;
    let xhr = new XMLHttpRequest();
  
    if (overwrite) {
      const existingFile = await this.getFileMetadataByName(fileName, Array.isArray(parentFolder) ? parentFolder[0] : parentFolder);
      if (existingFile) {
        // Update the existing file
        xhr.open('PATCH', `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`);
      } else {
        // Create a new file
        xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
      }
    } else {
      xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
    }
  
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  
    if (onProgress) xhr.upload.onprogress = onProgress;
  
    return new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(xhr.responseText);
        }
      };
      xhr.onerror = () => reject(xhr.statusText);
      xhr.send(form);
    });
  }

  // Add this method to your GDrive class
  async uploadFiles(
    files: { name: string, mimeType: string, data: Blob | string, parents?: string }[],
    folderId = this.directoryId,
    uploadProgress?: HTMLProgressElement | HTMLMeterElement | string,
    overwrite: boolean = false
  ) {
    if (typeof uploadProgress === 'string') {
      uploadProgress = document.getElementById('upload-progress') as HTMLProgressElement;
    }
    if (uploadProgress) uploadProgress.style.display = 'block';
  
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
  
      try {
        let existingFileId: string | null = null;
  
        if (overwrite) {
          const existingFile = await this.getFileMetadataByName(file.name, folderId);
          if (existingFile) {
            existingFileId = existingFile.id;
          }
        }
  
        if (existingFileId) {
          await this.updateFile(existingFileId, file.data, file.mimeType, (progressEvent) => {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            if (uploadProgress) (uploadProgress as HTMLProgressElement).value = progress;
            else console.log("Upload progress: ", progress);
          });
        } else {
          await this.uploadFileToGoogleDrive(
            file.data,
            file.name,
            file.mimeType,
            file.parents || folderId,
            (progressEvent) => {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              if (uploadProgress) (uploadProgress as HTMLProgressElement).value = progress;
              else console.log("Upload progress: ", progress);
            }
          );
        }
  
        if (uploadProgress) uploadProgress.value = 0; // Reset the progress bar after each file is uploaded
      } catch (error) {
        console.error('Error uploading file:', (file as any).name, error);
      }
    }
  
    if (uploadProgress) uploadProgress.style.display = 'none'; // Hide the progress bar after all files are uploaded
  }
  
  async updateFile(
    fileId: string,
    data: Blob | string,
    mimeType: string,
    onProgress?: (this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any
  ) {
    if (typeof data === 'string') {
      const type = mimeType === 'text/csv' ? 'text/csv' : 'text/plain';
      data = new Blob([data], { type });
    }
  
    const metadata = {
      mimeType,
    };
  
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', data);
  
    const xhr = new XMLHttpRequest();
    xhr.open('PATCH', `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`);
  
    const token = this.gapi.auth.getToken().access_token;
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  
    if (onProgress) xhr.upload.onprogress = onProgress;
  
    return new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(xhr.responseText);
        }
      };
      xhr.onerror = () => reject(xhr.statusText);
      xhr.send(form);
    });
  }


   async listDriveFiles(
    folderId = this.directoryId,
    pageSize = 100,
    onload?: (files) => {},
    pageToken:string|null = null,
    parentFolder?: string
  ) {

    if (this.isLoggedIn) {
      try {
        const response = await this.gapi.client.drive.files.list({
          q: `'${folderId}' ${parentFolder ? `and '${parentFolder}' ` : ``}in parents and trashed=false`,
          pageSize,
          fields: 'nextPageToken, files(id, name, mimeType)',
          pageToken,
        });

        if (response.result?.files && response.result.files.length > 0) {
          if (onload) onload(response.result.files);
        }

        return {
          files: response.result.files,
          nextPageToken: response.result.nextPageToken,
        };

      } catch (error) {
        console.error('Error listing Drive files:', error);
        throw error;
      }

    } else {
      console.error("Sign in with Google first!");
      this.handleUserSignIn().then(async () => {
        if (this.isLoggedIn) {
          return await this.listDriveFiles(
            folderId,
            pageSize,
            onload, //rerun
            pageToken,
            parentFolder
          )
        }
      });
    }
  }

  deleteFile(fileId:string) {
    // Make sure you have initialized and authenticated your Google Drive API client
    // This is just a basic example. You'll need to handle errors and API responses appropriately.

    if (this.gapi && this.gapi.client && this.gapi.client.drive) {
      this.gapi.client.drive.files.delete({
        fileId: fileId
      }).then(response => {
        console.log('File successfully deleted', response);
        // Here you can update your UI accordingly
      }).catch(error => {
        console.error('Error deleting file:', error);
      });
    } else {
      console.error('Google Drive API client is not initialized.');
    }
  }

  async getFileMetadataByName(fileName:string, parentFolder = this.directoryId): Promise<FileMetadata | null> {
    try {
        const query = `name='${fileName}' and '${parentFolder}' in parents and trashed=false`;
        const response = await this.gapi.client.drive.files.list({
            q: query,
            fields: 'files(id, name, mimeType)',
            pageSize: 1
        });

        const file = response.result.files && response.result.files[0];
        if (file) {
            return file;
        } else {
            console.error('File not found');
            return null;
        }
    } catch (error) {
        console.error('Error getting file metadata:', error);
        throw error;
    }
  }


  // Add this function to share a Google Drive file by name
  async shareFileByName(fileName: string, email: string, role: Role = 'reader', options: SharingOptions = {}): Promise<Permission> {
    try {
      const file = await this.getFileMetadataByName(fileName);
      if (!file) {
        throw new Error(`File named "${fileName}" not found`);
      }
      return this.shareFile(file.id, email, role, options);
    } catch (error) {
      console.error('Error sharing file by name:', error);
      throw error;
    }
  }

  // Share a file by its ID
  async shareFile(fileId: string, email: string, role: Role = 'reader', options: SharingOptions = {}): Promise<Permission> {
    try {
      const response = await this.gapi.client.drive.permissions.create({
        fileId: fileId,
        resource: {
          role: role,
          type: 'user',
          emailAddress: email,
        },
        ...options
      });
      console.log('File shared:', response.result);
      return response.result as Permission;
    } catch (error) {
      console.error('Error sharing file:', error);
      throw error;
    }
  }

  // Revoke file access by its ID and email
  async revokeFileAccess(fileId: string, email: string): Promise<void> {
    try {
      const permissions = await this.gapi.client.drive.permissions.list({ fileId });
      const permission = permissions.result.permissions.find(p => p.emailAddress === email);
      if (permission) {
        await this.gapi.client.drive.permissions.delete({
          fileId: fileId,
          permissionId: permission.id,
        });
        console.log('File access revoked for:', email);
      } else {
        throw new Error(`No permission found for email: ${email}`);
      }
    } catch (error) {
      console.error('Error revoking file access:', error);
      throw error;
    }
  }




  //google sheets api

  async createSpreadsheet(fileName, parentFolder, accessToken) {
    // const driveFilesUrl = 'https://www.googleapis.com/drive/v3/files';
    const createSheetUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    const createBody = {
      properties: {
        title: fileName
      },
      parents: [parentFolder]
    };

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', createSheetUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(xhr.responseText);
        }
      };

      xhr.onerror = () => reject(xhr.statusText);
      xhr.send(JSON.stringify(createBody));
    });
  }

  async findSpreadsheet(fileName, parentFolder, accessToken): Promise<any> {
    const driveFilesUrl = 'https://www.googleapis.com/drive/v3/files';
    // const createSheetUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    const query = `name='${fileName}' and '${parentFolder}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
    const url = `${driveFilesUrl}?q=${encodeURIComponent(query)}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.files[0]);
        } else {
          reject(xhr.responseText);
        }
      };

      xhr.onerror = () => reject(xhr.statusText);
      xhr.send();
    });
  }



  async createTab(spreadsheetId, sheetName, accessToken) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;

    const createTabBody = {
      requests: [{
        addSheet: {
          properties: {
            title: sheetName
          }
        }
      }]
    };

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(xhr.responseText);
        }
      };

      xhr.onerror = () => reject(xhr.statusText);
      xhr.send(JSON.stringify(createTabBody));
    });
  }

  async setSheetData(
    spreadsheetId: string, 
    sheetName: string, 
    accessToken: string, 
    range: Range, 
    valueInputOption: 'RAW'|'USER_ENTERED'='RAW',
    body: {values:(string|number)[][]}
  ): Promise<any> {
    const sheetAppendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + '!' + range)}:append?valueInputOption=${valueInputOption}`;
  
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', sheetAppendUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
  
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(xhr.responseText);
        }
      };
  
      xhr.onerror = () => reject(xhr.statusText);
      xhr.send(JSON.stringify(body));
    });
  }

  async appendData(
    spreadsheetId: string, 
    sheetName: string, 
    accessToken:string, 
    valueInputOption:'RAW'|'USER_ENTERED'='RAW', 
    data:{values:(string|number)[][]}
  ) {
    const sheetAppendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=${valueInputOption}&insertDataOption=INSERT_ROWS`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', sheetAppendUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(xhr.responseText);
        }
      };

      xhr.onerror = () => reject(xhr.statusText);
      xhr.send(JSON.stringify(data));
    });
  }

  async appendToGoogleSheetOrCreateTab(
    fileName: string,
    sheetName: string, //tab
    values: (string | number)[][],
    valueInputOption:'RAW'|'USER_ENTERED' = 'RAW',
    parentFolder:string = this.directoryId,
  ) {
    // const driveFilesUrl = 'https://www.googleapis.com/drive/v3/files';
    // const createSheetUrl = 'https://sheets.googleapis.com/v4/spreadsheets';

    const accessToken = this.gapi.auth.getToken().access_token;

    const body = {
      values: values
    };

    try {
      let spreadsheet = await this.findSpreadsheet(fileName, parentFolder, accessToken);

      if (!spreadsheet) {
        spreadsheet = await this.createSpreadsheet(fileName, parentFolder, accessToken);
      }

      try {
        await this.appendData(spreadsheet.id, sheetName, accessToken, valueInputOption, body);
      } catch (error) {
        if (error.includes('Unable to parse range')) {
          await this.createTab(spreadsheet.id, sheetName, accessToken);
          await this.appendData(spreadsheet.id, sheetName, accessToken, valueInputOption, body);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }

    /**
     * 
     *   // Usage example:
    const fileName = 'MySpreadsheet';
    const parentFolder = 'your-parent-folder-id';
    const sheetName = 'Sheet1';
    const values = [
        ['a', 'b', 'c', 1, 2, 3],
        ['d', 'e', 'f', 4, 5, 6]
    ];
    const accessToken = 'your-access-token';
    
    appendToGoogleSheetOrCreateTab(fileName, parentFolder, sheetName, values, accessToken)
        .then(response => console.log('Data appended successfully:', response))
        .catch(error => console.error('Error appending data:', error));
 
     */
  }




  //google calendar api


  // Create a calendar by name
  async createCalendar(calendarName: string): Promise<Calendar> {
    try {
      const response = await this.gapi.client.calendar.calendars.insert({
        resource: {
          summary: calendarName,
        },
      });
      console.log('Calendar created:', response.result);
      return response.result as Calendar;
    } catch (error) {
      console.error('Error creating calendar:', error);
      throw error;
    }
  }

  // Helper method to find a calendar by name
  async findCalendarByName(calendarName: string): Promise<Calendar | null> {
    try {
      const response = await this.gapi.client.calendar.calendarList.list();
      const calendars = response.result.items;
      if (calendars) {
        const calendar = calendars.find(cal => cal.summary === calendarName);
        return calendar || null;
      }
      return null;
    } catch (error) {
      console.error('Error finding calendar by name:', error);
      throw error;
    }
  }

  // Helper method to find an event by name in a calendar
  async findEventByName(calendarId: string, eventName: string): Promise<Event | null> {
    try {
      const response = await this.gapi.client.calendar.events.list({
        calendarId: calendarId,
        q: eventName,
      });
      const events = response.result.items;
      if (events) {
        const event = events.find(ev => ev.summary === eventName);
        return event || null;
      }
      return null;
    } catch (error) {
      console.error('Error finding event by name:', error);
      throw error;
    }
  }
  // List all calendars
  async listAllCalendars(): Promise<Calendar[]> {
    try {
      const response = await this.gapi.client.calendar.calendarList.list();
      return response.result.items as Calendar[];
    } catch (error) {
      console.error('Error listing all calendars:', error);
      throw error;
    }
  }

  // List events by calendar name within a date range
  async listEventsByCalendarName(calendarName: string, timeMin: string, timeMax: string): Promise<Event[]> {
    try {
      const calendar = await this.findCalendarByName(calendarName);
      if (!calendar) {
        throw new Error(`Calendar named "${calendarName}" not found`);
      }
      return this.listEvents(calendar.id, timeMin, timeMax);
    } catch (error) {
      console.error('Error listing events by calendar name:', error);
      throw error;
    }
  }

  // List events by calendar ID within a date range
  async listEvents(calendarId: string, timeMin: string, timeMax: string): Promise<Event[]> {
    try {
      const response = await this.gapi.client.calendar.events.list({
        calendarId: calendarId,
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: 'startTime'
      });
      return response.result.items as Event[];
    } catch (error) {
      console.error('Error listing events:', error);
      throw error;
    }
  }


  // Delete a calendar by name
  async deleteCalendarByName(calendarName: string): Promise<void> {
    try {
      const calendar = await this.findCalendarByName(calendarName);
      if (!calendar) {
        throw new Error(`Calendar named "${calendarName}" not found`);
      }
      return this.deleteCalendar(calendar.id);
    } catch (error) {
      console.error('Error deleting calendar by name:', error);
      throw error;
    }
  }

  // Delete a calendar by its ID
  async deleteCalendar(calendarId: string): Promise<void> {
    try {
      const response = await this.gapi.client.calendar.calendars.delete({
        calendarId: calendarId,
      });
      console.log('Calendar deleted:', response);
      return response;
    } catch (error) {
      console.error('Error deleting calendar:', error);
      throw error;
    }
  }

  // Share a calendar by name
  async shareCalendarByName(calendarName: string, email: string, role: Role = 'reader', options: SharingOptions = {}): Promise<Permission> {
    try {
      const calendar = await this.findCalendarByName(calendarName);
      if (!calendar) {
        throw new Error(`Calendar named "${calendarName}" not found`);
      }
      return this.shareCalendar(calendar.id, email, role, options);
    } catch (error) {
      console.error('Error sharing calendar by name:', error);
      throw error;
    }
  }

  // Share a calendar by its ID
  async shareCalendar(calendarId: string, email: string, role: Role = 'reader', options: SharingOptions = {}): Promise<Permission> {
    try {
      const response = await this.gapi.client.calendar.acl.insert({
        calendarId: calendarId,
        resource: {
          role: role,
          scope: {
            type: 'user',
            value: email,
          },
        },
        ...options
      });
      console.log('Calendar shared:', response.result);
      return response.result as Permission;
    } catch (error) {
      console.error('Error sharing calendar:', error);
      throw error;
    }
  }

  async createEventByCalendarName(calendarName: string, event: Event): Promise<Event> {
    try {
      const calendar = await this.findCalendarByName(calendarName);
      if (!calendar) {
        throw new Error(`Calendar named "${calendarName}" not found`);
      }
      return this.createEvent(calendar.id, event);
    } catch (error) {
      console.error('Error creating event by calendar name:', error);
      throw error;
    }
  }

  async createEvent(calendarId: string, event: Event): Promise<Event> {
    try {
      const response = await this.gapi.client.calendar.events.insert({
        calendarId: calendarId,
        resource: event,
        sendUpdates: event.sendUpdates || 'none'
      });
      console.log('Event created:', response.result);
      return response.result as Event;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  // Delete an event by calendar and event names
  async deleteEventByCalendarAndEventNames(calendarName: string, eventName: string): Promise<void> {
    try {
      const calendar = await this.findCalendarByName(calendarName);
      if (!calendar) {
        throw new Error(`Calendar named "${calendarName}" not found`);
      }
      const event = await this.findEventByName(calendar.id, eventName);
      if (!event) {
        throw new Error(`Event named "${eventName}" not found`);
      }
      return this.deleteEvent(calendar.id, event.id);
    } catch (error) {
      console.error('Error deleting event by calendar and event names:', error);
      throw error;
    }
  }

  // Delete an event by calendar and event IDs
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      const response = await this.gapi.client.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
      });
      console.log('Event deleted:', response);
      return response;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Create a recurring event by calendar name
  async createRecurringEventByCalendarName(calendarName: string, event: Event): Promise<Event> {
    try {
      const calendar = await this.findCalendarByName(calendarName);
      if (!calendar) {
        throw new Error(`Calendar named "${calendarName}" not found`);
      }
      return this.createRecurringEvent(calendar.id, event);
    } catch (error) {
      console.error('Error creating recurring event by calendar name:', error);
      throw error;
    }
  }

  // Create a recurring event by calendar ID
  async createRecurringEvent(calendarId: string, event: Event): Promise<Event> {
    try {
      const response = await this.gapi.client.calendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });
      console.log('Recurring event created:', response.result);
      return response.result as Event;
    } catch (error) {
      console.error('Error creating recurring event:', error);
      throw error;
    }
  }

  async updateEventByCalendarAndEventNames(calendarName: string, eventName: string, updatedEvent: Event): Promise<Event> {
    try {
      const calendar = await this.findCalendarByName(calendarName);
      if (!calendar) {
        throw new Error(`Calendar named "${calendarName}" not found`);
      }
      const event = await this.findEventByName(calendar.id, eventName);
      if (!event) {
        throw new Error(`Event named "${eventName}" not found`);
      }
      return this.updateEvent(calendar.id, event.id, updatedEvent);
    } catch (error) {
      console.error('Error updating event by calendar and event names:', error);
      throw error;
    }
  }

  async updateEvent(calendarId: string, eventId: string, updatedEvent: Event): Promise<Event> {
    try {
      const response = await this.gapi.client.calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        resource: updatedEvent,
        sendUpdates: updatedEvent.sendUpdates || 'none',
      });
      console.log('Event updated:', response.result);
      return response.result as Event;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }



  // Revoke calendar access by its ID and email
  async revokeCalendarAccess(calendarId: string, email: string): Promise<void> {
    try {
      const acl = await this.gapi.client.calendar.acl.list({ calendarId });
      const rule = acl.result.items.find(r => r.scope.value === email);
      if (rule) {
        await this.gapi.client.calendar.acl.delete({
          calendarId: calendarId,
          ruleId: rule.id,
        });
        console.log('Calendar access revoked for:', email);
      } else {
        throw new Error(`No ACL rule found for email: ${email}`);
      }
    } catch (error) {
      console.error('Error revoking calendar access:', error);
      throw error;
    }
  }

  // Revoke event attendee
  async revokeEventAttendee(calendarId: string, eventId: string, email: string, sendUpdates: 'all' | 'externalOnly' | 'none' = 'none'): Promise<Event> {
    try {
      const event = await this.gapi.client.calendar.events.get({
        calendarId: calendarId,
        eventId: eventId,
      });

      event.attendees = event.attendees.filter(attendee => attendee.email !== email);

      const updatedEvent = await this.gapi.client.calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        resource: event,
        sendUpdates: sendUpdates,
      });

      console.log('Event attendee revoked for:', email);
      return updatedEvent.result;
    } catch (error) {
      console.error('Error revoking event attendee:', error);
      throw error;
    }
  }

}


type FileBrowserOptions = {
  onFileClick?: (fileData: FileMetadata) => void;
};

//mock file browsing features
export class GFileBrowser extends GDrive {
  previousPageToken?: string;
  nextPageToken?: string;
  options: FileBrowserOptions;
  overwrite: boolean = false;

  currentFolderId: string;
  currentFolderMetadata?: FileMetadata;
  files: FileMetadata[] = [];


  async createFileBrowser(
    container: HTMLElement | string,
    folderName = this.directory,
    nextPageToken = this.nextPageToken,
    parentFolder?: string,
    options: FileBrowserOptions = {}
  ): Promise<void> {
    if(options) this.options = options;
    if (typeof container === 'string') {
      container = document.getElementById(container) as HTMLElement;
    }

    if (!container) {
      console.error('Container element not found');
      return;
    }
    this.container = container;
    container.innerHTML += `<div id="file-browser">
            <div id="file-upload">
                <button id="upload-button">Upload Files</button>
                <input type="file" id="file-input" multiple style="display:none"/>
                <label><input type="checkbox" id="overwrite-checkbox"> Overwrite existing files</label>
            </div>
            <div id="search-bar">
                <input type="text" id="search-input" placeholder="Search files and folders"/>
                <button id="search-button">Search</button>
            </div>
            <div id="drop-zone">Drop files here to upload</div>
            <progress id="upload-progress" max="100" value="0" style="width:100%; display:none;"></progress>
            <div id="folder-path"></div>
            <div id="file-list"></div>
            <button id="previous-page" style="display:none">Previous</button>
            <button id="next-page" style="display:none">Next</button>
        </div>`;

    const overwriteCheckbox = container.querySelector('#overwrite-checkbox') as HTMLInputElement;
    overwriteCheckbox.checked = this.overwrite;
    overwriteCheckbox.addEventListener('change', () => {
      this.overwrite = overwriteCheckbox.checked;
    });

    const searchButton = container.querySelector('#search-button') as HTMLButtonElement;
    const searchInput = container.querySelector('#search-input') as HTMLInputElement;
    searchButton.addEventListener('click', () => {
      this.searchFiles(searchInput.value, container);
    });

    let folderData = await this.checkFolder(this.directoryId ? this.directoryId : folderName, undefined, !!this.directoryId);
    if (!this.directoryId) this.directoryId = (folderData as any).files[0].id;
    await this.updateFileList(this.directoryId, nextPageToken, parentFolder, container);
    this.setupDragAndDrop(this.directoryId, nextPageToken, parentFolder, container);
    this.setupUploadButton(this.directoryId, nextPageToken, parentFolder, container);
    this.setupPaginationButtons(this.directoryId, parentFolder, container);
  }

  async createFileUploader(
    container: HTMLElement | string, 
    folderId = this.directoryId, 
    nextPageToken: string | undefined, 
    parentFolder: string | undefined
  ): Promise<void> {
    if (typeof container === 'string') {
      container = document.getElementById(container) as HTMLElement;
    }
  
    if (!container) {
      console.error('Container element not found');
      return;
    }
  
    container.innerHTML += `<div id="file-upload">
            <button id="upload-button">Upload Files</button>
            <input type="file" id="file-input" multiple style="display:none"/>
            <label><input type="checkbox" id="foverwrite-checkbox"> Overwrite existing files</label>
            <button id="create-folder-button">Create Folder</button>
        </div>
        <div id="drop-zone">Drop files here to upload</div>
        <progress id="upload-progress" max="100" value="0" style="width:100%; display:none;"></progress>`;
  
    const overwriteCheckbox = container.querySelector('#foverwrite-checkbox') as HTMLInputElement;
    overwriteCheckbox.checked = this.overwrite;
    overwriteCheckbox.addEventListener('change', () => {
      this.overwrite = overwriteCheckbox.checked;
    });
  
    this.setupUploadButton(folderId, nextPageToken, parentFolder, container);
    this.setupDragAndDrop(folderId, nextPageToken, parentFolder, container);
    this.setupCreateFolderButton(folderId, container);
  }

  setupCreateFolderButton(folderId: string, container: HTMLElement): void {
    const createFolderButton = container.querySelector('#create-folder-button') as HTMLButtonElement;
  
    if (!createFolderButton) {
      console.error('Create folder button not found');
      return;
    }
  
    createFolderButton.addEventListener('click', async () => {
      const folderName = prompt('Enter folder name:');
      if (folderName) {
        try {
          const newFolder = await this.createDriveFolder(folderName, folderId);
          console.log('Created folder:', newFolder);
          this.updateFileList(folderId, null, undefined, container);
        } catch (error) {
          console.error('Error creating folder:', error);
          alert('Error creating folder. Please try again.');
        }
      }
    });
  }

  setupUploadButton(
    folderId = this.directoryId,
    nextPageToken: string|undefined,
    parentFolder: string | undefined,
    container: HTMLElement
  ): void {
    const uploadButton = container.querySelector('#upload-button') as HTMLButtonElement;
    const fileInput = container.querySelector('#file-input') as HTMLInputElement;

    if (!uploadButton || !fileInput) {
      console.error('Upload button or file input not found');
      return;
    }

    uploadButton.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async () => {
      const files = fileInput.files as FileList;
      if (files.length > 0) {
        const uploadFiles: UploadFile[] = Array.from(files).map(file => ({
          name: file.name,
          mimeType: file.type,
          data: file,
        }));

        const uploadProgress = container.querySelector('#upload-progress') as HTMLProgressElement;
        await this.uploadFiles(uploadFiles, folderId, uploadProgress, this.overwrite);
        this.updateFileList(folderId, nextPageToken, parentFolder, container);
        fileInput.value = ''; // Clear the file input
      }
    });
  }

  setupDragAndDrop(
    currentFolderId: string,
    nextPageToken: string|undefined,
    parentFolder: string | undefined,
    container: HTMLElement
  ): void {
    const dropZone = container.querySelector('#drop-zone') as HTMLElement;
    if (!dropZone) {
      console.error('Drop zone element not found');
      return;
    }

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('highlight');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('highlight');
    });

    dropZone.addEventListener('drop', async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('highlight');

      const files = e.dataTransfer?.files as FileList;
      if (files.length > 0) {
        const uploadFiles: UploadFile[] = Array.from(files).map(file => ({
          name: file.name,
          mimeType: file.type,
          data: file,
        }));

        const uploadProgress = container.querySelector('#upload-progress') as HTMLProgressElement;
        await this.uploadFiles(uploadFiles, this.directory, uploadProgress, this.overwrite);
        this.updateFileList(currentFolderId, nextPageToken, parentFolder, container);
      }
    });
  }

  async updateFileList(
    currentFolderId = this.directory,
    pageToken: string | null = null,
    parentFolder: string | undefined,
    container: HTMLElement
  ): Promise<void> {
    try {
      const { files, nextPageToken } = await this.listDriveFiles(currentFolderId, 100, undefined, pageToken, parentFolder) as any;
      this.files = files;

      // Fetch and store current folder metadata
      this.currentFolderMetadata = await this.getFileMetadata(currentFolderId);

      this.renderFileList(files, currentFolderId, parentFolder, container);

      // Update the previous page token when navigating forward.
      if (pageToken !== null) {
        this.previousPageToken = pageToken;
      }
      // Update the next page token.
      this.nextPageToken = nextPageToken;
      // Update the visibility of the pagination buttons.
      (container.querySelector('#previous-page') as HTMLButtonElement).style.display = this.previousPageToken ? 'block' : 'none';
      (container.querySelector('#next-page') as HTMLButtonElement).style.display = this.nextPageToken ? 'block' : 'none';
    } catch (error) {
      console.error('Error updating file list:', error);
    }
  }

  async searchFiles(query: string, container: HTMLElement): Promise<void> {
    try {
      const { files } = await this.searchDrive(query, 100, null, this.currentFolderId);
      this.files = files;
      this.renderFileList(files, this.currentFolderId, this.currentFolderId, container);
    } catch (error) {
      console.error('Error searching files:', error);
    }
  }

  renderFileList(
    files: FileMetadata[],
    currentFolderId: string = this.directoryId,
    parentFolder: string | undefined,
    container: HTMLElement
  ): void {
    const fileListContainer = container.querySelector('#file-list') as HTMLElement;
    const folderPathContainer = container.querySelector('#folder-path') as HTMLElement;
  
    if (!fileListContainer || !folderPathContainer) {
      console.error('File browser elements not found');
      return;
    }
  
    let html = '';
    files.forEach((file, index) => {
      const icon = this.getFileTypeIcon(file);
      html += `<div class="file-item" data-index="${index}">
            ${icon} ${file.name} 
            <span class="share-btn" data-index="${index}">🔗</span>
            <span class="delete-btn" data-id="${file.id}">🗑️</span>
          </div>`;
    });
    fileListContainer.innerHTML = html;
  
    this.setupFileItemClick(parentFolder, container);
    this.setupDeleteFileClick(container);
    this.setupShareFileClick(container);
  
    if (currentFolderId !== this.directory) {
      folderPathContainer.innerHTML = `<button id="parent-folder">Go to Parent Folder</button>`;
      (container.querySelector('#parent-folder') as HTMLButtonElement).addEventListener('click', () => {
        this.goBackToParentFolder(container);
      });
    } else {
      folderPathContainer.innerHTML = '';
    }
  }

  setupShareFileClick(container: HTMLElement): void {
    const shareButtons = container.querySelectorAll('.share-btn');
    shareButtons.forEach((btn: any) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent triggering file item click
        const index = parseInt(btn.getAttribute('data-index') as string);
        const fileData = this.files[index];
  
        try {
          const sharableLink = await this.getSharableLink(fileData.id);
          alert(`Sharable link for ${fileData.name}: ${sharableLink}`);
        } catch (error) {
          console.error('Error generating sharable link:', error);
          alert('Error generating sharable link. Please try again.');
        }
      });
    });
  }

  setupDeleteFileClick(container: HTMLElement): void {
    const deleteButtons = container.querySelectorAll('.delete-btn');
    deleteButtons.forEach((btn: any) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering file item click
        const fileId = btn.getAttribute('data-id') as string;

        if (!btn.isConfirming) {
          // First click - show confirmation tooltip
          btn.textContent = '❌?';
          btn.isConfirming = true;
        } else {
          // Second click - perform deletion
          this.deleteFile(fileId);
          (btn.closest('.file-item') as HTMLElement).remove(); // Remove the file item from the list
        }
      });
    });

    // Reset delete confirmation if clicking anywhere else
    document.addEventListener('click', () => {
      deleteButtons.forEach((btn: any) => {
        btn.textContent = '🗑️'; // Reset to original icon
        btn.isConfirming = false;
      });
    }, { once: true }); // Listen once and auto-remove
  }

  getFileTypeIcon(file: FileMetadata): string {
    if (file?.thumbnailLink) {
      return `<img src="${file.thumbnailLink}" alt="${file.name}" class="file-icon" />`;
    } else if (file?.iconLink) {
      return `<img src="${file?.iconLink}" alt="${file.name}" class="file-icon" />`;
    } else if (file?.mimeType === 'application/vnd.google-apps.folder') {
      return '📁'; // Folder emoji
    } else if (file?.mimeType.startsWith('image/')) {
      return '🖼️'; // Image emoji
    } else if (file?.mimeType === 'text/csv' || file.mimeType === 'application/vnd.ms-excel') {
      return '📊'; // Chart (CSV) emoji
    } else {
      return '📄'; // Generic file emoji
    }
  }

  setupFileItemClick(parentFolder: string | undefined, container: HTMLElement): void {
    const fileItems = container.querySelectorAll('.file-item');
    fileItems.forEach(item => {
      item.addEventListener('click', async () => {
        const index = parseInt(item.getAttribute('data-index') as string);
        const fileData = this.files[index];
  
        if (fileData.mimeType === 'application/vnd.google-apps.folder') {
          this.updateFileList(fileData.id, null, parentFolder, container);
          this.currentFolderId = fileData.id;
        } else {
          if (this.options.onFileClick) {
            this.options.onFileClick(fileData);
          } else {
            const downloadedFile = await this.downloadFile(fileData.id, fileData.mimeType, fileData.name);
            console.log('Downloaded file:', fileData.name, downloadedFile);
          }
        }
      });
    });
  }

  setupPaginationButtons(folderId: string, parentFolder: string | undefined, container: HTMLElement): void {
    (container.querySelector('#previous-page') as HTMLButtonElement).addEventListener('click', () => {
      if (this.previousPageToken !== null) {
        this.updateFileList(folderId, this.previousPageToken, parentFolder, container);
        // Clear the previous page token since we've navigated back.
        this.previousPageToken = undefined;
      }
    });

    (container.querySelector('#next-page') as HTMLButtonElement).addEventListener('click', () => {
      if (this.nextPageToken) {
        this.updateFileList(folderId, this.nextPageToken, parentFolder, container);
      }
    });
  }

  async goBackToParentFolder(container: HTMLElement): Promise<void> {
    try {
      if (this.currentFolderMetadata && this.currentFolderMetadata.parents && this.currentFolderMetadata.parents.length > 0) {
        const parentFolderId = this.currentFolderMetadata.parents[0];
        
        // Check if the current folder ID matches the directory ID (if specified)
        if (this.currentFolderId === this.directoryId) {
          console.log('Reached the main directory.');
          return;
        }
        
        this.currentFolderId = parentFolderId;
        await this.updateFileList(parentFolderId, null, undefined, container);
      } else {
        console.error('This folder does not have a parent.');
      }
    } catch (error) {
      console.error('Error going back to parent folder:', error);
    }
  }
}