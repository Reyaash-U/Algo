import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Computes dynamic numbering for a tree of folders and files.
 * Example requirement:
 * Folder A
 * ├── 1. Arrays
 * ├── 2. Strings
 * └── Folder B
 *     ├── 2.1 Binary Search
 *     ├── 2.2 Sliding Window
 *     └── 2.3 Dynamic Programming
 *
 * Numbering is calculated purely in-memory from the hierarchy.
 * No hardcoded numbers are saved to the database.
 */
export function computeTreeHierarchy(folderList, fileList) {
  // Group folders by parentId (null or 'root')
  const foldersByParent = new Map();
  for (const folder of folderList) {
    const pid = folder.parentId || 'root';
    if (!foldersByParent.has(pid)) foldersByParent.set(pid, []);
    foldersByParent.get(pid).push(folder);
  }

  // Group files by folderId (null or 'root')
  const filesByFolder = new Map();
  for (const file of fileList) {
    const fid = file.folderId || 'root';
    if (!filesByFolder.has(fid)) filesByFolder.set(fid, []);
    filesByFolder.get(fid).push(file);
  }

  // Recursive tree builder
  function buildSubtree(parentId, parentPrefix = '') {
    const subfolders = foldersByParent.get(parentId || 'root') || [];
    const directFiles = filesByFolder.get(parentId || 'root') || [];

    // Sort files and subfolders by position asc, then createdAt asc
    directFiles.sort((a, b) => (a.position - b.position) || (new Date(a.createdAt) - new Date(b.createdAt)));
    subfolders.sort((a, b) => (a.position - b.position) || (new Date(a.createdAt) - new Date(b.createdAt)));

    const resultFiles = [];
    let fileCounter = 0;

    for (const file of directFiles) {
      fileCounter++;
      const computedNumber = parentPrefix ? `${parentPrefix}.${fileCounter}` : `${fileCounter}`;
      resultFiles.push({
        id: file.id,
        type: 'file',
        name: file.name,
        folderId: file.folderId,
        code: file.code || '',
        language: file.language || 'javascript',
        contentMarkdown: file.contentMarkdown || '',
        status: file.status || 'pending',
        position: file.position,
        computedNumber,
        displayName: `${computedNumber}. ${file.name}`,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      });
    }

    const resultFolders = [];
    for (let i = 0; i < subfolders.length; i++) {
      const subfolder = subfolders[i];
      // If there are files preceding this subfolder, the subfolder's children branch from the file counter
      // (e.g. 2. Strings -> subfolder files become 2.1, 2.2, 2.3).
      // If parent has a prefix and no files yet, use parentPrefix.
      // If at root and no files yet, leave empty so its direct files start at 1, 2.
      let subPrefix;
      if (fileCounter > 0) {
        subPrefix = parentPrefix ? `${parentPrefix}.${fileCounter}` : `${fileCounter}`;
      } else if (parentPrefix) {
        subPrefix = `${parentPrefix}.${i + 1}`;
      } else {
        // Top-level folder with no root files above it: direct files inside start at 1, 2...
        subPrefix = '';
      }

      const { files: childFiles, folders: childFolders, allChildren } = buildSubtree(subfolder.id, subPrefix);
      resultFolders.push({
        id: subfolder.id,
        type: 'folder',
        name: subfolder.name,
        parentId: subfolder.parentId,
        position: subfolder.position,
        files: childFiles,
        folders: childFolders,
        children: allChildren,
        createdAt: subfolder.createdAt,
        updatedAt: subfolder.updatedAt,
      });
    }

    return {
      files: resultFiles,
      folders: resultFolders,
      allChildren: [...resultFiles, ...resultFolders],
    };
  }

  const root = buildSubtree(null, '');
  return {
    folders: root.folders,
    rootFiles: root.files,
    tree: root.allChildren,
  };
}

export const folderTreeService = {
  /**
   * Get the entire dynamic folder tree for a user with computed numbering
   */
  async getTree(userId) {
    const [folders, files] = await Promise.all([
      prisma.folder.findMany({
        where: { userId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.file.findMany({
        where: { userId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    return computeTreeHierarchy(folders, files);
  },

  /**
   * Create a new folder
   */
  async createFolder(userId, { name, parentId = null, position = 0 }) {
    if (!name || !name.trim()) {
      throw ApiError.badRequest('Folder name is required');
    }

    if (parentId) {
      const parent = await prisma.folder.findFirst({
        where: { id: parentId, userId },
      });
      if (!parent) {
        throw ApiError.notFound('Parent folder not found');
      }
    }

    const count = await prisma.folder.count({
      where: { userId, parentId: parentId || null },
    });

    return prisma.folder.create({
      data: {
        userId,
        name: name.trim(),
        parentId: parentId || null,
        position: position ?? count,
      },
    });
  },

  /**
   * Update folder (rename, move parent, change position)
   */
  async updateFolder(userId, folderId, { name, parentId, position }) {
    const existing = await prisma.folder.findFirst({
      where: { id: folderId, userId },
    });
    if (!existing) {
      throw ApiError.notFound('Folder not found');
    }

    const data = {};
    if (name !== undefined) {
      if (!name.trim()) throw ApiError.badRequest('Folder name cannot be empty');
      data.name = name.trim();
    }
    if (position !== undefined) {
      data.position = Number(position);
    }
    if (parentId !== undefined) {
      if (parentId === folderId) {
        throw ApiError.badRequest('A folder cannot be its own parent');
      }
      if (parentId !== null) {
        const parent = await prisma.folder.findFirst({
          where: { id: parentId, userId },
        });
        if (!parent) throw ApiError.notFound('Target parent folder not found');
      }
      data.parentId = parentId;
    }

    return prisma.folder.update({
      where: { id: folderId },
      data,
    });
  },

  /**
   * Delete folder (cascades to subfolders and files via Prisma onDelete: Cascade)
   */
  async deleteFolder(userId, folderId) {
    const existing = await prisma.folder.findFirst({
      where: { id: folderId, userId },
    });
    if (!existing) {
      throw ApiError.notFound('Folder not found');
    }

    await prisma.folder.delete({
      where: { id: folderId },
    });

    return { deleted: true, id: folderId };
  },

  /**
   * Create a new file inside a folder (or root)
   */
  async createFile(userId, { name, folderId = null, code = '', language = 'javascript', contentMarkdown = '', status = 'pending', position = 0 }) {
    if (!name || !name.trim()) {
      throw ApiError.badRequest('File name is required');
    }

    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId },
      });
      if (!folder) {
        throw ApiError.notFound('Target folder not found');
      }
    }

    const count = await prisma.file.count({
      where: { userId, folderId: folderId || null },
    });

    return prisma.file.create({
      data: {
        userId,
        folderId: folderId || null,
        name: name.trim(),
        code: code || '',
        language: language || 'javascript',
        contentMarkdown: contentMarkdown || '',
        status: status || 'pending',
        position: position ?? count,
      },
    });
  },

  /**
   * Get single file with its dynamic numbering in tree context
   */
  async getFile(userId, fileId) {
    const file = await prisma.file.findFirst({
      where: { id: fileId, userId },
    });
    if (!file) {
      throw ApiError.notFound('File not found');
    }

    // Compute dynamic number from tree
    const tree = await this.getTree(userId);
    // Find the file in the computed hierarchy
    let computedFile = null;
    function searchTree(node) {
      if (node.type === 'file' && node.id === fileId) {
        computedFile = node;
        return true;
      }
      if (node.children) {
        for (const child of node.children) {
          if (searchTree(child)) return true;
        }
      }
      return false;
    }
    for (const item of tree.tree) {
      if (searchTree(item)) break;
    }

    return computedFile || {
      ...file,
      type: 'file',
      computedNumber: '',
      displayName: file.name,
    };
  },

  /**
   * Update file code, content, language, position, folder, or status
   */
  async updateFile(userId, fileId, { name, folderId, code, language, contentMarkdown, status, position }) {
    const existing = await prisma.file.findFirst({
      where: { id: fileId, userId },
    });
    if (!existing) {
      throw ApiError.notFound('File not found');
    }

    const data = {};
    if (name !== undefined) {
      if (!name.trim()) throw ApiError.badRequest('File name cannot be empty');
      data.name = name.trim();
    }
    if (code !== undefined) data.code = code;
    if (language !== undefined) data.language = language;
    if (contentMarkdown !== undefined) data.contentMarkdown = contentMarkdown;
    if (status !== undefined) data.status = status;
    if (position !== undefined) data.position = Number(position);
    if (folderId !== undefined) {
      if (folderId !== null) {
        const folder = await prisma.folder.findFirst({
          where: { id: folderId, userId },
        });
        if (!folder) throw ApiError.notFound('Target folder not found');
      }
      data.folderId = folderId;
    }

    return prisma.file.update({
      where: { id: fileId },
      data,
    });
  },

  /**
   * Update file status ONLY (e.g. pending, in_progress, solved, completed)
   * Isolated: does not affect any other file or folder.
   */
  async updateFileStatus(userId, fileId, status) {
    if (!status) {
      throw ApiError.badRequest('Status is required');
    }
    const validStatuses = ['pending', 'in_progress', 'solved', 'completed'];
    const normalized = status.toLowerCase();
    if (!validStatuses.includes(normalized)) {
      throw ApiError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const existing = await prisma.file.findFirst({
      where: { id: fileId, userId },
    });
    if (!existing) {
      throw ApiError.notFound('File not found');
    }

    return prisma.file.update({
      where: { id: fileId },
      data: { status: normalized },
    });
  },

  /**
   * Delete file
   */
  async deleteFile(userId, fileId) {
    const existing = await prisma.file.findFirst({
      where: { id: fileId, userId },
    });
    if (!existing) {
      throw ApiError.notFound('File not found');
    }

    await prisma.file.delete({
      where: { id: fileId },
    });

    return { deleted: true, id: fileId };
  },
};
