import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { ScamlexBrand } from '@/components/scamlex-brand';
import './FileScanner.css';

interface ScanResult {
    filename: string;
    status?: string;
    content: string;
    extracted_urls?: string[];
    scan_data?: {
        score: number;
        level: string;
        reasons: string[];
        message: string;
    };
}

function FileScanner() {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [filesToScan, setFilesToScan] = useState<File[]>([]);
    const [results, setResults] = useState<ScanResult[]>([]);
    const [uploadStatus, setUploadStatus] = useState<'uploading' | 'success' | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const traverseFileTree = async (item: any, files: File[]) => {
        if (item.isFile) {
            const file = await new Promise<File>(resolve => item.file(resolve));
            files.push(file);
        } else if (item.isDirectory) {
            const dirReader = item.createReader();
            const entries = await new Promise<any[]>(resolve => dirReader.readEntries(resolve));
            for (let i = 0; i < entries.length; i++) {
                await traverseFileTree(entries[i], files);
            }
        }
    };

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const items = e.dataTransfer.items;
        let files: File[] = [];
        
        if (items) {
            for (let i = 0; i < items.length; i++) {
                // we need to use 'any' or extended types for webkitGetAsEntry
                const item = (items[i] as any).webkitGetAsEntry();
                if (item) {
                    await traverseFileTree(item, files);
                }
            }
        } else {
            files = Array.from(e.dataTransfer.files);
        }
        
        processFiles(files);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            processFiles(files);
        }
    };

    const processFiles = (files: File[]) => {
        if (files.length === 0) return;
        
        const allowedExts = ['.txt', '.pdf', '.docx', '.png', '.jpg', '.jpeg'];
        const validFiles = files.filter(file => {
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            return allowedExts.includes(ext);
        });

        if (validFiles.length === 0) {
            alert("No supported files (.txt, .pdf, .docx, images) were found in your selection.");
            return;
        }

        setFilesToScan(validFiles);
        uploadFiles(validFiles);
    };

    const uploadFiles = async (files: File[]) => {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        setIsLoading(true);
        setUploadStatus('uploading');
                setIsLoading(true);
        setUploadStatus('uploading');
        setResults([]); // <--- ADD THIS LINE! This clears the old cards instantly!

        
        try {
            const response = await fetch('/api/scan', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setResults(data.results);
            setUploadStatus('success');

        } catch (error: any) {
            console.error("Upload failed", error);
            alert(`Error scanning files: ${error.message}`);
            setUploadStatus(null);
            setFilesToScan([]);
        } finally {
            setIsLoading(false);
            
            setTimeout(() => {
                setUploadStatus(null);
                setFilesToScan([]);
            }, 2000);
            
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <div className="app-container flex-1 mx-auto w-full px-4 sm:px-6 lg:px-8">
                <header className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 pt-8 pb-6 border-b border-border/20 mb-8">
                    <div className="flex justify-center md:justify-start">
                        <ScamlexBrand />
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold mb-2 text-foreground">Scan-A-File</h1>
                        <p className="text-muted-foreground">Upload files, Folders and Images to scan</p>
                    </div>
                    <div className="hidden md:block"></div>
                </header>

                <main>
                <div className="upload-section">
                    <div 
                        id="dropzone" 
                        className={`dropzone ${isDragOver ? 'dragover' : ''} ${isLoading ? 'loading' : ''}`}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {uploadStatus === null ? (
                            <div className="dropzone-content">
                                <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                <h3>Drag & drop files here</h3>
                                <p>or click to browse</p>
                            </div>
                        ) : (
                            <div className="dropzone-file-list">
                                <div className="uploading-status">
                                    {uploadStatus === 'uploading' ? (
                                        <>
                                            <span className="spinner"></span> 
                                            Extracting text from <span id="fileCount">{filesToScan.length}</span> files...
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>✓</span> 
                                            Successfully extracted text!
                                        </>
                                    )}
                                </div>
                                <div className="selected-files">
                                    {filesToScan.map((f, i) => (
                                        <div key={i} className="file-pill">{f.name}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <input 
                            type="file" 
                            multiple 
                            // @ts-ignore - webkitdirectory is a non-standard property but widely supported
                            
                            accept=".txt,.pdf,.docx,.png,.jpg,.jpeg"
                            className="hidden-input"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                    </div>
                </div>

                                {results.length > 0 && (
                    <div className="results-container mt-10">
                        <h2 className="mb-5 font-display text-2xl font-bold tracking-tight text-foreground">Scan Results</h2>
                        <div className="flex flex-col gap-6">
                            {results.map((fileResult, index) => {
                                // Default to safe if something went wrong
                                const scan = fileResult.scan_data || { score: 0, level: 'GREEN', reasons: [], message: 'No data' };
                                const level = scan.level || 'GREEN';
                                
                                const levelStyles: Record<string, any> = {
                                    RED: {
                                        label: "High risk",
                                        textClass: "text-red-600",
                                        ringClass: "score-ring score-ring-red",
                                        borderClass: "border-red-500",
                                        title: "Potential scam detected",
                                        recommendation: "Do not open any links or share personal information. Verify the request through an official channel."
                                    },
                                    YELLOW: {
                                        label: "Medium risk",
                                        textClass: "text-yellow-600",
                                        ringClass: "score-ring score-ring-yellow",
                                        borderClass: "border-yellow-500",
                                        title: "Suspicious content detected",
                                        recommendation: "Proceed with caution. Do not share sensitive information until you verify the request."
                                    },
                                    GREEN: {
                                        label: "Low risk",
                                        textClass: "text-green-600",
                                        ringClass: "score-ring score-ring-green",
                                        borderClass: "border-green-500",
                                        title: "No significant threat detected",
                                        recommendation: "No significant suspicious indicators were detected. Continue to use normal caution."
                                    },
                                    ERROR: {
                                        label: "Scan Error",
                                        textClass: "text-muted-foreground",
                                        ringClass: "border-border",
                                        borderClass: "border-border",
                                        title: "Could not complete scan",
                                        recommendation: "Please try again later or check your backend connection."
                                    }
                                };

                                const style = levelStyles[level] || levelStyles['GREEN'];

                                return (
                                    <div key={index} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                                        {/* File Header */}
                                        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
                                            <div className="flex items-center gap-2 font-mono text-sm font-medium text-foreground">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                {fileResult.filename}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{fileResult.status || 'success'}</div>
                                        </div>
                                        
                                        {/* Risk Report (Matches ScannerDemo) */}
                                        <div className={`p-4 sm:p-5 border-l-4 ${style.borderClass} bg-secondary/50`}>
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className={`mb-1 flex items-center gap-2 text-xs font-bold uppercase ${style.textClass}`}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                                                        {style.label}
                                                    </div>

                                                    <p className="font-display text-xl font-bold text-foreground">
                                                        {style.title}
                                                    </p>
                                                </div>

                                                <div 
                                                    className={style.ringClass}
                                                    style={{
                                                        "--color-high-risk": scan.score < 30 ? "#22c55e" : scan.score < 60 ? "#f59e0b" : scan.score < 80 ? "#f97316" : "#ef4444",
                                                    } as React.CSSProperties}
                                                >
                                                    <strong>{scan.score || 0}</strong>
                                                    <span>/100</span>
                                                </div>
                                            </div>

                                            {scan.reasons && scan.reasons.length > 0 && (
                                                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                                                    {scan.reasons.map((reason: string, rIndex: number) => (
                                                        <div key={rIndex} className="flex items-center gap-2 rounded-sm bg-background px-3 py-2 text-xs text-foreground shadow-sm">
                                                            <svg className="size-3.5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                                            {reason}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="mt-4 border-l-2 border-primary pl-3 text-xs leading-relaxed text-muted-foreground">
                                                <strong>Recommended action:</strong> {style.recommendation}
                                            </div>
                                            
                                            {/* Expandable Document Text */}
                                            <details className="mt-6 border-t border-border pt-4">
                                                <summary className="cursor-pointer text-xs font-semibold text-primary hover:underline">View Raw Extracted Text</summary>
                                                <div className="mt-3 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-md bg-background p-4 font-mono text-[11px] leading-relaxed text-foreground/80 shadow-inner">
                                                    {fileResult.content || scan.message || "No text available"}
                                                </div>
                                            </details>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                </main>
            </div>

            {/* ── FOOTER ── */}
            <footer className="bg-foreground text-border mt-8 border-t border-foreground">
                <div className="h-1 bg-brand-lime" />
                <div className="page-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
                    <div>
                        <ScamlexBrand inverted />
                        <p className="mt-5 max-w-sm text-sm leading-6 text-border/70">
                            Explainable scam detection for suspicious messages, links, and
                            web content.
                        </p>
                    </div>
                    <div>
                        <p className="font-display text-sm font-bold text-background mb-4">
                            Check Reviews
                        </p>
                        <div className="flex flex-col gap-3 text-sm text-border/70">
                            <a href="#" className="hover:text-brand-lime transition-colors">Website Reviews</a>
                            <a href="#" className="hover:text-brand-lime transition-colors">Email Reviews</a>
                            <a href="#" className="hover:text-brand-lime transition-colors">Phone Reviews</a>
                        </div>
                    </div>
                    <div>
                        <p className="font-display text-sm font-bold text-background mb-4">
                            Technology
                        </p>
                        <div className="flex flex-col gap-3 text-sm text-border/70">
                            <a href="#" className="hover:text-brand-lime transition-colors">Architecture</a>
                            <a href="#" className="hover:text-brand-lime transition-colors">Chromium extension</a>
                            <a href="#" className="hover:text-brand-lime transition-colors">REST API</a>
                        </div>
                    </div>
                </div>
                <div className="page-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-3 border-t border-border/10 py-6 text-xs text-border/50 sm:flex-row sm:items-center sm:justify-between">
                    <span>© 2026 Scamlex. All rights reserved.</span>
                    <span>Built for safer digital decisions.</span>
                </div>
            </footer>
        </div>
    );
}


export const Route = createFileRoute('/dashboard/FileScanner')({
  component: FileScanner,
})
