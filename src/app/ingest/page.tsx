'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  processNotionExport, 
  processChatGPTExport, 
  processDocument,
  ProcessingProgress,
  ProcessingResult,
} from '@/lib/processing';

// ============================================================================
// TYPES
// ============================================================================

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: 'notion' | 'chatgpt' | 'document' | 'unknown';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  file: File;
}

type DataSourceType = 'notion' | 'chatgpt' | 'gdrive';

// ============================================================================
// FILE TYPE DETECTION
// ============================================================================

function detectFileType(file: File): UploadedFile['type'] {
  const name = file.name.toLowerCase();
  
  // Notion exports are ZIP files
  if (name.endsWith('.zip') && (name.includes('notion') || name.includes('export'))) {
    return 'notion';
  }
  
  // ChatGPT exports are JSON
  if (name.endsWith('.json') && (name.includes('conversations') || name.includes('chatgpt'))) {
    return 'chatgpt';
  }
  
  // Documents
  if (name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx') || 
      name.endsWith('.txt') || name.endsWith('.md')) {
    return 'document';
  }
  
  // JSON files might be ChatGPT
  if (name.endsWith('.json')) {
    return 'chatgpt';
  }
  
  // ZIP files might be Notion
  if (name.endsWith('.zip')) {
    return 'notion';
  }
  
  return 'unknown';
}

function getFileTypeLabel(type: UploadedFile['type']): string {
  switch (type) {
    case 'notion': return 'Notion Export';
    case 'chatgpt': return 'ChatGPT Export';
    case 'document': return 'Document';
    default: return 'Unknown';
  }
}

function getFileTypeColor(type: UploadedFile['type']): string {
  switch (type) {
    case 'notion': return 'bg-gray-700 text-gray-300';
    case 'chatgpt': return 'bg-emerald-500/20 text-emerald-400';
    case 'document': return 'bg-blue-500/20 text-blue-400';
    default: return 'bg-gray-600 text-gray-400';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// DATA SOURCE CARD
// ============================================================================

function DataSourceCard({
  type,
  title,
  description,
  icon,
  instructions,
  isSelected,
  onSelect,
}: {
  type: DataSourceType;
  title: string;
  description: string;
  icon: React.ReactNode;
  instructions: string[];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full p-4 rounded-xl border-2 text-left transition-all
        ${isSelected 
          ? 'border-purple-500 bg-purple-500/10' 
          : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${isSelected ? 'bg-purple-500/20' : 'bg-gray-800'}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
          
          {isSelected && (
            <div className="mt-3 space-y-1">
              <div className="text-xs text-gray-500 font-medium">How to export:</div>
              {instructions.map((instruction, i) => (
                <div key={i} className="text-xs text-gray-400 flex items-start gap-2">
                  <span className="text-purple-400">{i + 1}.</span>
                  <span>{instruction}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// FILE UPLOAD ITEM
// ============================================================================

function FileUploadItem({
  file,
  onRemove,
}: {
  file: UploadedFile;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
      {/* File icon */}
      <div className={`p-2 rounded-lg ${getFileTypeColor(file.type)}`}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      
      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{file.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getFileTypeColor(file.type)}`}>
            {getFileTypeLabel(file.type)}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {formatFileSize(file.size)}
        </div>
        
        {/* Progress bar */}
        {file.status === 'processing' && (
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${file.progress}%` }}
            />
          </div>
        )}
        
        {/* Error message */}
        {file.status === 'error' && (
          <div className="text-xs text-red-400 mt-1">{file.error}</div>
        )}
      </div>
      
      {/* Status / Actions */}
      <div className="flex items-center gap-2">
        {file.status === 'completed' && (
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        
        {file.status === 'processing' && (
          <svg className="w-5 h-5 text-purple-400 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        
        {(file.status === 'pending' || file.status === 'error') && (
          <button
            onClick={onRemove}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function IngestPage() {
  const [selectedSource, setSelectedSource] = useState<DataSourceType | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle file selection
  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: detectFileType(file),
      status: 'pending',
      progress: 0,
      file,
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);
  
  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);
  
  // Remove file
  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);
  
  const router = useRouter();
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  
  // Process files
  const processFiles = useCallback(async () => {
    const pendingFilesList = files.filter(f => f.status === 'pending');
    if (pendingFilesList.length === 0) return;
    
    // Update all pending files to processing
    setFiles(prev => prev.map(f => 
      f.status === 'pending' ? { ...f, status: 'processing' as const } : f
    ));
    
    const results: ProcessingResult[] = [];
    
    // Process each file
    for (const uploadedFile of pendingFilesList) {
      const onProgress = (progress: ProcessingProgress) => {
        setProcessingMessage(progress.message);
        setFiles(prev => prev.map(f => 
          f.id === uploadedFile.id ? { ...f, progress: progress.progress } : f
        ));
      };
      
      try {
        let result: ProcessingResult;
        
        // Process based on file type
        switch (uploadedFile.type) {
          case 'notion':
            result = await processNotionExport(uploadedFile.file, onProgress);
            break;
          case 'chatgpt':
            result = await processChatGPTExport(uploadedFile.file, onProgress);
            break;
          case 'document':
          default:
            result = await processDocument(uploadedFile.file, onProgress);
            break;
        }
        
        results.push(result);
        
        if (result.success) {
          setFiles(prev => prev.map(f => 
            f.id === uploadedFile.id ? { ...f, status: 'completed' as const, progress: 100 } : f
          ));
        } else {
          setFiles(prev => prev.map(f => 
            f.id === uploadedFile.id ? { 
              ...f, 
              status: 'error' as const, 
              error: result.errors.join(', ') || 'Processing failed' 
            } : f
          ));
        }
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === uploadedFile.id ? { 
            ...f, 
            status: 'error' as const, 
            error: error instanceof Error ? error.message : 'Processing failed' 
          } : f
        ));
      }
    }
    
    setProcessingResults(results);
    setProcessingMessage('');
    
    // If all successful, show option to view knowledge graph
    const allSuccessful = results.every(r => r.success);
    if (allSuccessful && results.length > 0) {
      // Auto-navigate after a short delay
      setTimeout(() => {
        router.push('/knowledge');
      }, 2000);
    }
  }, [files, router]);
  
  const pendingFiles = files.filter(f => f.status === 'pending');
  const hasFiles = files.length > 0;
  
  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Connect Your Data
              </h1>
              <p className="text-xs text-gray-500">Import your knowledge sources</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">1</span>
            <span>Import</span>
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="w-6 h-6 rounded-full bg-gray-700 text-gray-400 flex items-center justify-center text-xs font-bold">2</span>
            <span className="text-gray-600">Process</span>
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="w-6 h-6 rounded-full bg-gray-700 text-gray-400 flex items-center justify-center text-xs font-bold">3</span>
            <span className="text-gray-600">Explore</span>
          </div>
        </div>
      </header>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Data Sources */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Select Data Sources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DataSourceCard
              type="notion"
              title="Notion"
              description="Import your workspace, notes, and databases"
              icon={
                <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
                </svg>
              }
              instructions={[
                "Go to Settings & Members in Notion",
                "Click 'Export all workspace content'",
                "Choose 'Markdown & CSV' format",
                "Upload the downloaded ZIP file"
              ]}
              isSelected={selectedSource === 'notion'}
              onSelect={() => setSelectedSource(selectedSource === 'notion' ? null : 'notion')}
            />
            
            <DataSourceCard
              type="chatgpt"
              title="ChatGPT"
              description="Import your conversation history"
              icon={
                <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                </svg>
              }
              instructions={[
                "Go to chat.openai.com/settings",
                "Click 'Data Controls'",
                "Click 'Export data'",
                "Upload the conversations.json file"
              ]}
              isSelected={selectedSource === 'chatgpt'}
              onSelect={() => setSelectedSource(selectedSource === 'chatgpt' ? null : 'chatgpt')}
            />
            
            <DataSourceCard
              type="gdrive"
              title="Google Drive"
              description="Import documents, sheets, and files"
              icon={
                <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.828 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.163 4.676 7.25 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.277a423.07 423.07 0 0 1-1.698 2.945c-.017.027 2.614.05 5.848.05h5.878l1.875-3.27 1.875-3.27h-5.867c-5.252 0-5.867-.01-5.828-.08z"/>
                </svg>
              }
              instructions={[
                "Download files from Google Drive",
                "Supported: PDF, DOC, TXT, MD",
                "Drag and drop files below",
                "Or click to browse"
              ]}
              isSelected={selectedSource === 'gdrive'}
              onSelect={() => setSelectedSource(selectedSource === 'gdrive' ? null : 'gdrive')}
            />
          </div>
        </section>
        
        {/* File Upload Area */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Upload Files</h2>
          
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
              ${isDragging 
                ? 'border-purple-500 bg-purple-500/10' 
                : 'border-gray-700 hover:border-gray-600 bg-gray-900/30'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".zip,.json,.pdf,.doc,.docx,.txt,.md"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-3">
              <div className={`p-4 rounded-full ${isDragging ? 'bg-purple-500/20' : 'bg-gray-800'}`}>
                <svg className={`w-8 h-8 ${isDragging ? 'text-purple-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <div>
                <p className="text-white font-medium">
                  {isDragging ? 'Drop files here' : 'Drag and drop files here'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">ZIP (Notion)</span>
                <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">JSON (ChatGPT)</span>
                <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">PDF</span>
                <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">DOC</span>
                <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">TXT</span>
              </div>
            </div>
          </div>
          
          {/* File list */}
          {hasFiles && (
            <div className="mt-4 space-y-2">
              {files.map(file => (
                <FileUploadItem
                  key={file.id}
                  file={file}
                  onRemove={() => removeFile(file.id)}
                />
              ))}
            </div>
          )}
        </section>
        
        {/* Processing Status */}
        {processingMessage && (
          <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-purple-400 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-purple-300">{processingMessage}</span>
            </div>
          </div>
        )}
        
        {/* Processing Results */}
        {processingResults.length > 0 && (
          <div className="mb-4 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="text-sm font-semibold text-white mb-3">Processing Results</h3>
            <div className="space-y-2">
              {processingResults.map((result, i) => (
                <div key={i} className={`p-3 rounded-lg ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                      {result.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  {result.success && (
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="text-center p-1 bg-gray-800 rounded">
                        <div className="text-blue-400 font-bold">{result.stats.entitiesExtracted.skills}</div>
                        <div className="text-gray-500">Skills</div>
                      </div>
                      <div className="text-center p-1 bg-gray-800 rounded">
                        <div className="text-purple-400 font-bold">{result.stats.entitiesExtracted.projects}</div>
                        <div className="text-gray-500">Projects</div>
                      </div>
                      <div className="text-center p-1 bg-gray-800 rounded">
                        <div className="text-emerald-400 font-bold">{result.stats.entitiesExtracted.goals}</div>
                        <div className="text-gray-500">Goals</div>
                      </div>
                      <div className="text-center p-1 bg-gray-800 rounded">
                        <div className="text-pink-400 font-bold">{result.stats.entitiesExtracted.people}</div>
                        <div className="text-gray-500">People</div>
                      </div>
                    </div>
                  )}
                  {result.errors.length > 0 && (
                    <div className="mt-2 text-xs text-red-400">
                      {result.errors.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {processingResults.every(r => r.success) && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-400 mb-2">Redirecting to Knowledge Graph...</p>
                <Link
                  href="/knowledge"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm hover:from-blue-600 hover:to-purple-600 transition-colors"
                >
                  View Knowledge Graph
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {files.length > 0 && (
              <span>{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            
            <button
              onClick={processFiles}
              disabled={pendingFiles.length === 0 || processingMessage !== ''}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium text-sm hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Process {pendingFiles.length > 0 ? `${pendingFiles.length} Files` : 'Files'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
