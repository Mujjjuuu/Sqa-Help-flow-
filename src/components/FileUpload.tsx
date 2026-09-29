import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X, AlertCircle } from 'lucide-react';

const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf', 'docx', 'xlsx', 'zip', 'txt'];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  label?: string;
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  files,
  onChange,
  maxFiles = 5,
  label = 'Attachments',
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setValidationError(null);

    const validFiles: File[] = [...files];

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setValidationError(`Invalid file format ".${ext}". Allowed: PNG, JPG, PDF, DOCX, XLSX, ZIP, TXT.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setValidationError(`File "${file.name}" exceeds maximum allowed size of 25MB.`);
        continue;
      }

      if (validFiles.length >= maxFiles) {
        setValidationError(`Maximum ${maxFiles} files allowed.`);
        break;
      }

      // Avoid duplicates by name & size
      if (!validFiles.some((f) => f.name === file.name && f.size === file.size)) {
        validFiles.push(file);
      }
    }

    onChange(validFiles);
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-slate-800 bg-slate-50'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".png,.jpg,.jpeg,.pdf,.docx,.xlsx,.zip,.txt"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center">
          <UploadCloud className="w-7 h-7 text-slate-400 mb-2" />
          <p className="text-xs font-medium text-slate-700">
            Click to upload or drag & drop files
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            PNG, JPG, PDF, DOCX, XLSX, ZIP, TXT (up to 25MB each)
          </p>
        </div>
      </div>

      {(validationError || error) && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{validationError || error}</span>
        </div>
      )}

      {files.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {files.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="font-medium text-slate-700 truncate">{file.name}</span>
                <span className="text-[10px] text-slate-400 shrink-0">({formatBytes(file.size)})</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
