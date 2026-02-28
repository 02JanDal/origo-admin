import { Request, Response } from "express";
import { AzureUploadService, LocalUploadService } from "@/services/";
import { MediaDto } from "@/shared/interfaces/dtos";
import { IUploadService } from "@/interfaces/uploadservice.interface";

interface MulterRequest extends Request {
  file: Express.Multer.File;
  files: Express.Multer.File[];
}

class MediaController {
  private service: IUploadService;

  constructor() {
    this.service =
      process.env.USE_AZURE_STORAGE === "true"
        ? new AzureUploadService()
        : new LocalUploadService();
  }

  /**
   * Checks if the target folder name is valid (doesn't exist already, parent folder exists, is not named 'root')
   * @param path The target path to check
   * @param type 'folder' | 'file'
   * @param res The response object to send error messages to
   * @returns 
   */
  async isPathValid(path: string, type: string, res: Response): Promise<boolean> {
    const trimmedPath = path.replace(/^\/|\/$/g, '' );
    if (trimmedPath.toLocaleLowerCase() === "root") {
      console.error(`[${new Date().toISOString()}] Client tried to create or rename a ${type} with the reserved name 'root'. Aborting...`);
      res.status(400).json({ error: "'root' is reserved and cannot be used." });
      return false;
    }
    if (trimmedPath.includes('/')) {
      try {
        await this.service.getFolderByIdOrFolderName(trimmedPath.substring(0, trimmedPath.lastIndexOf('/')));
      } catch (error) {
        let errormsg = `Could not get parent folder: ${trimmedPath.substring(0, trimmedPath.lastIndexOf('/'))}`;
        console.error(`[${new Date().toISOString()}] ${errormsg}`);
        res.status(400).json({ error: errormsg });
        return false;
      }
    }
    try {
      let existingPath;
      if (type === 'folder') {
        existingPath = await this.service.getFolderByIdOrFolderName(trimmedPath);
      } else {
        existingPath = await this.service.getFileByIdOrFilename(trimmedPath);
      }
      if (existingPath) {
        let errormsg = `${type.charAt(0).toUpperCase() + type.substring(1)} already exists: ${trimmedPath}`;
        console.error(`[${new Date().toISOString()}] ${errormsg}`);
        res.status(400).json({ error: errormsg });
        return false;
      }
    } catch (error) {
      console.log(`[${new Date().toISOString()}] No duplicates found`);
    }
    return true;
  }

  async getAllFiles(req: Request, res: Response) {
    try {
      const items = await this.service.getAllFiles();
      res.status(200).json(items);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getFileByIdOrFilename(req: Request, res: Response) {
    try {
      const item = await this.service.getFileByIdOrFilename((req.params.id  as string).replace(/^\/|\/$/g, '' ));
      res.status(200).json(item);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async upload(req: Request, res: Response) {
    const multerReq = req as MulterRequest;
    if (multerReq?.files?.length > 0) {
      let createdFiles = [] as MediaDto[];
      try {
        for (const file of multerReq.files) {
          let createdFile = await this.service.saveFiles([file], (req.params.path as string | undefined)?.replace(/^\/|\/$/g, '' ));
          createdFiles.push(createdFile[0]);
        }
        res.status(201).json(createdFiles);
      } catch (error) {
        res.status(400).json({
          message: "No files were uploaded",
        });
      }
    } else {
      res.status(400).json({
        message: "No files were uploaded",
      });
    }
  }

  async renameFile(req: Request, res: Response) {
    const currentFilename = (req.params.currentName as string).replace(/^\/|\/$/g, '' );
    const newFilename = (req.params.newName as string).replace(/^\/|\/$/g, '' );
    console.log(`[${new Date().toISOString()}] Renaming file '${currentFilename}' to '${newFilename}'`);
    try {
      const fileRegistration = await this.service.renameFile(currentFilename, newFilename);
      res.status(200).json(fileRegistration);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async deleteById(req: Request, res: Response) {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] Deleting media file and registration with id '${id}'`);
    try {
      let file = await this.service.deleteFile(id as string);
      res.status(200).json(file);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getAllFolders(req: Request, res: Response) {
    try {
      const items = await this.service.getAllFolders();
      res.status(200).json(items);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getFolderByIdOrFolderName(req: Request, res: Response) {
    try {
      const item = await this.service.getFolderByIdOrFolderName((req.params.id as string).replace(/^\/|\/$/g, '' ));
      res.status(200).json(item);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getByFolder(req: Request, res: Response) {
    const trimmedId = (req.params.id as string).replace(/^\/|\/$/g, '' );
    let folder;
    try {
      if (trimmedId.toLowerCase() !== 'root') {
        folder = await this.service.getFolderByIdOrFolderName(trimmedId);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Folder not found: '${trimmedId}'`);
      return res.status(404).json({ error: `Folder not found: '${trimmedId}'` });
    }
    try {
      const items = await this.service.getByFolder(trimmedId.toLowerCase() === 'root' ? '' : folder!.filename);
      res.status(200).json(items);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async createFolder(req: Request, res: Response) {
    const folderName = (req.params.name as string).replace(/^\/|\/$/g, '' );
    if (await this.isPathValid(folderName, 'folder', res)) {
      console.log(`[${new Date().toISOString()}] Creating folder: ${folderName}`);
      try {
        const folderRegistration = await this.service.createFolder(folderName);
        res.status(201).json(folderRegistration);
      } catch (error) {
        this.handleError(res, error);
      }
    }
  }

  /**
   * Updates the names and paths of folders and their contents, calling itself recursively to drill down into subfolders.
   * Assumes that the validity of the new folder name has already been checked. Does not actually move any files in storage,
   * this must be done separately before or after calling this method.
   * @param currentFolderName
   * @param newFolderName 
   * @param originalCall Pass true when called from outside to not try to update the original folder's registration again (as it should already be updated by the caller)
   */
  async updateFolderContentPaths(currentFolderName: string, newFolderName: string, originalCall: boolean = false): Promise<void> {    
    const items = await this.service.getByFolder(currentFolderName);
    console.log(`[${new Date().toISOString()}] Updating contents of folder: ${items.map(i => i.filename).join(', ')}`);
    // Update the file registrations in the current folder
    for (const file of items.filter(i => i.fieldname !== 'folders')) {
      if (file.filename.startsWith(currentFolderName + '/')) {
        const newFileName = newFolderName + file.filename.substring(currentFolderName.length);
        console.log(`[${new Date().toISOString()}] Updating file path from '${file.filename}' to '${newFileName}'`);
        await this.service.renameFile(file.filename, newFileName, false);
      }
    }
    // Drill down into subfolders
    for (const folder of items.filter(i => i.fieldname === 'folders')) {
      if (folder.filename.startsWith(currentFolderName + '/')) {
        const newSubfolderName = newFolderName + folder.filename.substring(currentFolderName.length);
        await this.updateFolderContentPaths(folder.filename, newSubfolderName);
      }
    }
    // Finally, update the folder's own registration
    console.log(`[${new Date().toISOString()}] Updating folder path from '${currentFolderName}' to '${newFolderName}'`);
    !originalCall && await this.service.renameFolder(currentFolderName, newFolderName, false);
  }

  /**
   * Handles calls made to the `/media/folder/:currentName/:newName` route.
   * Checks if the target folder name is valid, renames the folder updates the paths of all its contents.
   * @param req The request object, including params currentName and newName
   * @param res The response object to send results to
   */
  async renameFolder(req: Request, res: Response) {
    const currentFolderName = (req.params.currentName as string).replace(/^\/|\/$/g, '' );
    const newFolderName = (req.params.newName as string).replace(/^\/|\/$/g, '' );
    if (currentFolderName && await this.isPathValid(newFolderName, 'folder', res)) {
      try {
        // Rename the folder itself, which also changes the physical path of its contents
        console.log(`[${new Date().toISOString()}] Renaming folder '${currentFolderName}' to '${newFolderName}'`);
        const updatedFolder = await this.service.renameFolder(currentFolderName, newFolderName);
        // Update the file and folder registrations of all contents within the folder, without actually moving or renaming any files
        await this.updateFolderContentPaths(currentFolderName, newFolderName, true);        
        res.status(200).json(updatedFolder);
      } catch (error) {
        this.handleError(res, error);
      }
    }
  }

  async deleteFolderById(req: Request, res: Response) {
    const folderId = req.params.id;
    try {
      const contents = await this.service.getByFolder(folderId as string);
      if (contents?.length === 0) {
        console.log(`[${new Date().toISOString()}] Deleting folder with id '${folderId}'`);
        const folderRegistration = await this.service.deleteFolder(folderId as string);
        res.status(200).json(folderRegistration);
      } else {
        this.handleError(res, new Error("Folder not empty"));
      }
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unexpected error" });
    }
  }
}

const mediaController = new MediaController();
export { mediaController as MediaController };
