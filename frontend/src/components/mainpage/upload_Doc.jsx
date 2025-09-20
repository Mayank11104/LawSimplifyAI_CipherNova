import React, { useState, useRef } from "react";
import { Upload, X, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

const UploadDoc = ({ theme }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // --- NEW STREAMING LOGIC ---

  // Processes a single file, streaming its status and final result.
  const processFile = async (file, setUploadedFiles) => {
    // 1. Add the file to the UI immediately with "processing" status
    const fileId = Date.now() + Math.random();
    const newFileEntry = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      status: "Processing: Starting...", // Initial status
      profile: null, // To store the final result
    };
    setUploadedFiles((prev) => [...prev, newFileEntry]);

    // Helper to update the state for this specific file
    const updateFileState = (newStatus, data = null) => {
      setUploadedFiles((prev) =>
        prev.map((f) => {
          if (f.id === fileId) {
            const updatedFile = { ...f, status: newStatus };
            if (data?.profile) updatedFile.profile = data.profile;
            if (data?.error) updatedFile.status = `Failed: ${data.error}`;
            return updatedFile;
          }
          return f;
        })
      );
    };

    try {
      const formData = new FormData();
      formData.append("files", file);

      // 2. Use fetch to make a POST request and get a readable stream
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/upload_and_stream`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      // 3. Manually read and parse the Server-Sent Events stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break; // Stream finished

        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) >= 0) {
          const message = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          let eventType = "message";
          let eventData = "";

          message.split("\n").forEach(line => {
            if (line.startsWith("event:")) {
              eventType = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              eventData = line.replace("data:", "").trim();
            }
          });

          if (eventData) {
            const data = JSON.parse(eventData);
            if (eventType === "message") {
              updateFileState(`Processing: ${data.status}`);
            } else if (eventType === "final_result") {
              updateFileState("Completed", { profile: data });
              reader.cancel();
              return;
            } else if (eventType === "error") {
              updateFileState("Failed", { error: data.error });
              reader.cancel();
              return;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Processing failed for ${file.name}:`, error);
      updateFileState("Failed", { error: error.message });
    }
  };

  // Main handler for file input (drag/drop or browse)
  const handleFiles = async (files) => {
    setUploading(true);
    
    const validFiles = files.filter((file) => {
      const validTypes = [
        "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain", "image/jpeg", "image/jpg", "image/png",
      ];
      return validTypes.includes(file.type) && file.size <= 100 * 1024 * 1024;
    });

    // Process all valid files concurrently
    await Promise.all(validFiles.map(file => processFile(file, setUploadedFiles)));

    setUploading(false);
  };

  // --- EVENT HANDLERS (UNCHANGED) ---

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const removeFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  // --- HELPER FUNCTIONS (UNCHANGED) ---
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.includes("pdf")) return "📄";
    if (type.includes("word")) return "📝";
    if (type.includes("text")) return "📄";
    return "📎";
  };
  
  // --- JSX RENDER ---
  return (
    <div className="w-full">
        {/* ... (Header section is unchanged) ... */}
        <div className="text-center mb-6 md:mb-8">
            <div className="relative w-20 h-20 md:w-24 md:h-24 mx-auto mb-4">
            <div
                className={`absolute inset-0 border-2 border-dashed rounded-full animate-spin ${
                theme === "dark" ? "border-blue-400" : "border-blue-500"
                }`}
                style={{ animationDuration: "3s" }}
            ></div>
            <Upload
                size={40}
                className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
                theme === "dark" ? "text-blue-400" : "text-blue-500"
                }`}
            />
            </div>
            <h2 className={`text-2xl md:text-3xl font-bold mb-2 ${
            theme === "dark" ? "text-white" : "text-gray-800"
            }`}>
            Upload Documents
            </h2>
            <p className={`text-sm md:text-base ${
            theme === "dark" ? "text-gray-300" : "text-gray-600"
            }`}>
            Drag and drop files or browse to upload documents for AI analysis.
            </p>
        </div>

      <div
        className={`relative border-2 border-dashed rounded-xl p-8 md:p-12 transition-all duration-300 cursor-pointer
          ${
            isDragging
              ? `${theme === "dark" ? "border-blue-400 bg-blue-900/20" : "border-blue-400 bg-blue-50"}`
              : `${theme === "dark" ? "border-gray-600 hover:border-blue-400 hover:bg-gray-800/50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"}`
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="text-center">
            <Upload size={48} className="mx-auto mb-4 text-gray-400" />
            <p className={`text-base md:text-lg font-medium mb-2 ${
            theme === "dark" ? "text-gray-200" : "text-gray-700"
            }`}>
            {isDragging ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className={`text-sm mb-4 ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}>
            or click to browse files
            </p>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-6 md:mt-8">
          <h3 className={`text-lg font-semibold mb-4 ${
            theme === "dark" ? "text-white" : "text-gray-800"
          }`}>
            Processing Files ({uploadedFiles.length})
          </h3>
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className={`p-4 rounded-lg border space-y-3 ${
                  theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="text-2xl flex-shrink-0">{getFileIcon(file.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}>
                        {file.name}
                      </p>
                      <p className={`text-xs md:text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        {formatFileSize(file.size)} • {file.uploadedAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* --- DYNAMIC STATUS ICON --- */}
                    {file.status.startsWith('Processing') && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                    {file.status === 'Completed' && <CheckCircle size={16} className="text-green-500" />}
                    {file.status.startsWith('Failed') && <AlertTriangle size={16} className="text-red-500" />}
                    
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <X size={16} className={`${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`} />
                    </button>
                  </div>
                </div>

                {/* --- DYNAMIC STATUS AND RESULT DISPLAY --- */}
                <div className={`p-3 rounded-lg border ${
                    file.status.startsWith('Failed') ? 'bg-red-100/50 border-red-200 dark:bg-red-900/20 dark:border-red-700/30' : 
                    file.status === 'Completed' ? 'bg-green-100/50 border-green-200 dark:bg-green-900/20 dark:border-green-700/30' :
                    theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-white border-gray-200'
                }`}>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                        {file.status}
                    </p>
                    {file.profile && (
                        <div className={`mt-2 text-xs space-y-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                           <p><strong>Document Type:</strong> {file.profile.document_type}</p>
                           <p><strong>Jurisdiction:</strong> {file.profile.jurisdiction || 'N/A'}</p>
                           {file.profile.obligations && <p><strong>Obligations Found:</strong> {file.profile.obligations.length}</p>}
                           {file.profile.dates && <p><strong>Important Dates Found:</strong> {file.profile.dates.length}</p>}
                        </div>
                    )}
                </div>

              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadDoc;
