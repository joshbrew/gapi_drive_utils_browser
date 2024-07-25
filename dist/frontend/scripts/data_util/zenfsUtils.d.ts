export declare const initFS: (mounts?: {
    [key: string]: any;
}, oninit?: (asyncFs: any) => void, onerror?: (e: any) => void) => Promise<boolean>;
export declare const formatPath: (path: string, dir?: string) => string;
export declare const checkDirInit: (path: string, dbType?: any) => Promise<string>;
export declare const exists: (path?: string) => Promise<any>;
export declare const readFile: (path?: string) => Promise<any>;
export declare const readTextFileChunk: (path?: string, begin?: number, end?: "end" | number, onread?: (data: any, path: any) => void) => Promise<string>;
export declare const getFilenames: (directory?: string, onload?: (directory: any) => void) => Promise<any>;
export declare const writeFile: (path: any, data: any, onwrite?: (data: any) => void) => Promise<boolean>;
export declare const appendFile: (path: any, data: any, onwrite?: (data: any) => void) => Promise<boolean>;
export declare const deleteFile: (path?: string, ondelete?: () => void) => Promise<boolean>;
export declare const createFolder: (foldername: string) => Promise<boolean>;
export declare const deleteFolder: (foldername: string) => Promise<boolean>;
export declare const readFileAsText: (path?: string, end?: "end" | number, begin?: number, onread?: (data: any, filename: any) => void) => Promise<string>;
export declare const listFiles: (dir?: string, onload?: (directory: any) => void) => Promise<any>;
export declare const getFileSize: (path?: string, onread?: (size: any) => void) => Promise<any>;
export declare const getCSVHeader: (path?: string, onopen?: (header: any, filename: any) => void) => Promise<string>;
export declare const writeToCSVFromDB: (path?: string, fileSizeLimitMb?: number) => Promise<boolean>;
export declare const processCSVChunksFromDB: (path?: string, onData?: (csvdata: any, start: any, end: any, size: any) => void, maxChunkSize?: number, start?: number, options?: {
    transpose: boolean;
}) => Promise<boolean>;
export declare const readCSVChunkFromDB: (path?: string, start?: number, end?: string | number, options?: {
    transpose: boolean;
}) => Promise<any>;
export declare const dirExists: (directory: any) => Promise<boolean>;
export declare const ZenFsRoutes: {
    initFS: (mounts?: {
        [key: string]: any;
    }, oninit?: (asyncFs: any) => void, onerror?: (e: any) => void) => Promise<boolean>;
    dirExists: (directory: any) => Promise<boolean>;
    exists: (path?: string) => Promise<any>;
    readFile: (path?: string) => Promise<any>;
    readTextFileChunk: (path?: string, begin?: number, end?: "end" | number, onread?: (data: any, path: any) => void) => Promise<string>;
    getFilenames: (directory?: string, onload?: (directory: any) => void) => Promise<any>;
    writeFile: (path: any, data: any, onwrite?: (data: any) => void) => Promise<boolean>;
    appendFile: (path: any, data: any, onwrite?: (data: any) => void) => Promise<boolean>;
    deleteFile: (path?: string, ondelete?: () => void) => Promise<boolean>;
    readFileAsText: (path?: string, end?: "end" | number, begin?: number, onread?: (data: any, filename: any) => void) => Promise<string>;
    getFileSize: (path?: string, onread?: (size: any) => void) => Promise<any>;
    getCSVHeader: (path?: string, onopen?: (header: any, filename: any) => void) => Promise<string>;
    listFiles: (dir?: string, onload?: (directory: any) => void) => Promise<any>;
    createFolder: (foldername: string) => Promise<boolean>;
    deleteFolder: (foldername: string) => Promise<boolean>;
};
