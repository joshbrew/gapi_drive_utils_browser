import { GDrive } from "./GDrive";
export declare class FS_Drive {
    GDriveInstance: GDrive;
    constructor(GDriveInstance: GDrive);
    backupFS_CSVToDrive: (path: string, mimeType?: string) => Promise<unknown>;
    driveToLocalDB: (file: {
        id: string;
        name: string;
        [key: string]: any;
    }, backupDir?: string, ondownload?: (body: any) => void, mimeType?: string) => Promise<unknown>;
    inferMimeType: (path: any, download?: boolean) => "application/vnd.google-apps.spreadsheet" | "text/csv" | "text/plain" | "application/json" | "application/vnd.ms-excel" | "text/tab-separated-values" | "text/html" | "application/xml" | "image/jpeg" | "image/png" | "image/gif" | "image/bmp" | "image/tiff" | "image/webp" | "application/pdf" | "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" | "application/vnd.ms-powerpoint" | "application/vnd.openxmlformats-officedocument.presentationml.presentation" | "application/vnd.oasis.opendocument.text" | "application/vnd.oasis.opendocument.spreadsheet" | "application/vnd.oasis.opendocument.presentation" | "application/rtf" | "application/zip" | "application/vnd.rar" | "application/x-7z-compressed" | "application/x-tar" | "application/gzip" | "audio/mpeg" | "audio/wav" | "audio/ogg" | "video/mp4" | "video/x-msvideo" | "video/quicktime" | "video/x-ms-wmv" | "video/x-flv" | "video/x-matroska" | "application/octet-stream";
}
