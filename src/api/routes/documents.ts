import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DocumentService } from '../../services/DocumentService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.join(__dirname, '../../../../documents');

// Ensure documents directory exists
if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, docsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

export const documentRouter = Router();

documentRouter.get('/jobs/:id/documents', (req, res, next) => {
    try {
        const docs = DocumentService.getByJobId(Number(req.params.id));
        res.json(docs);
    } catch (e) {
        next(e);
    }
});

documentRouter.post('/jobs/:id/documents', upload.single('file'), (req, res, next) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const doc = DocumentService.create({
            jobId: Number(req.params.id),
            name: file.originalname,
            type: file.mimetype,
            filePath: `/documents/${file.filename}`,
            fileSize: file.size
        });

        res.status(201).json(doc);
    } catch (e) {
        next(e);
    }
});

documentRouter.delete('/documents/:id', (req, res, next) => {
    try {
        DocumentService.delete(Number(req.params.id));
        res.json({ success: true });
    } catch (e) {
        next(e);
    }
});
 
