import React, { useState, useEffect } from 'react';
import { File, FileText, Image as ImageIcon, FileSpreadsheet, Download, Trash2, UploadCloud, FileArchive } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useUI } from '../../contexts/UIContext';
import { Button } from '../../shared/Button';
import { Card } from '../../shared/Card';
import { Badge } from '../../shared/Badge';
import { timeAgo } from '../../utils.ts';
import type { Document } from '../../types.ts';

interface JobDocumentsTabProps {
    jobId: number;
}

export function JobDocumentsTab({ jobId }: JobDocumentsTabProps) {
    const { addToast } = useUI();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const loadDocuments = async () => {
        try {
            setLoading(true);
            const docs = await api.getJobDocuments(jobId);
            setDocuments(docs);
        } catch (err: any) {
            console.error('Failed to load documents', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDocuments();
    }, [jobId]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            await api.createDocument(jobId, file);
            addToast('Document uploaded successfully', 'success');
            await loadDocuments();
        } catch (err) {
            addToast('Failed to upload document', 'error');
        } finally {
            setUploading(false);
            if (e.target) {
                e.target.value = ''; // reset file input
            }
        }
    };

    const handleDelete = async (docId: number) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            await api.deleteDocument(docId);
            addToast('Document deleted', 'success');
            await loadDocuments();
        } catch (err) {
            addToast('Failed to delete document', 'error');
        }
    };

    const getFileIcon = (type: string) => {
        if (type.includes('image')) return <ImageIcon size={20} className="text-blue-400" />;
        if (type.includes('pdf')) return <FileText size={20} className="text-red-400" />;
        if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return <FileSpreadsheet size={20} className="text-emerald-400" />;
        if (type.includes('zip') || type.includes('archive')) return <FileArchive size={20} className="text-amber-400" />;
        return <File size={20} className="text-gray-400" />;
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = 2;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div className="flex flex-col gap-4 min-h-[400px]">
            {/* Header Area */}
            <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/10">
                <div>
                    <h3 className="text-white font-semibold">Project Files</h3>
                    <p className="text-xs text-gray-500 mt-1">Manage documents, photos, and assets</p>
                </div>
                <div className="relative">
                    <input
                        type="file"
                        id="document-upload"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                    <label
                        htmlFor="document-upload"
                        className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors shadow-lg ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <UploadCloud size={16} />
                        {uploading ? 'Uploading...' : 'Upload File'}
                    </label>
                </div>
            </div>

            {/* Document List */}
            {loading ? (
                <div className="py-12 text-center text-gray-500">Loading documents...</div>
            ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                    <File size={48} className="text-white/10 mb-4" />
                    <p className="text-gray-400 font-medium">No documents uploaded yet</p>
                    <p className="text-xs text-gray-500 mt-1">Upload files using the button above</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {documents.map(doc => (
                        <Card key={doc.id} padding="sm" className="flex items-center gap-4 hover:border-white/20 transition-colors group">
                            <div className="p-3 bg-black/30 rounded-lg">
                                {getFileIcon(doc.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate" title={doc.name}>{doc.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-gray-500">{formatBytes(doc.fileSize)}</span>
                                    <span className="text-[10px] text-gray-600">•</span>
                                    <span className="text-[10px] text-gray-500">{timeAgo(doc.createdAt)}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded"
                                    onClick={() => window.open(doc.filePath, '_blank')}
                                    title="Download"
                                >
                                    <Download size={14} />
                                </button>
                                <button
                                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                                    onClick={() => handleDelete(doc.id)}
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
 
