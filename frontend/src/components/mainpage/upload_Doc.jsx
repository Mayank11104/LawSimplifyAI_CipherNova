// D:\CODE\Projects\Gen_AI_Hack\frontend\src\components\mainpage\upload_Doc.jsx
import React, { useState, useRef } from "react";
import { Upload, X, CheckCircle, AlertTriangle } from "lucide-react";

const UploadDoc = ({ theme }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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

  // 🔎 Simulated Risk Analyzer
  const analyzeRisk = (file) => {
    const risks = ["Low", "Medium", "High"];
    const randomRisk = risks[Math.floor(Math.random() * risks.length)];
    return {
      level: randomRisk,
      details:
        randomRisk === "Low"
          ? "This document has minimal risk factors."
          : randomRisk === "Medium"
          ? "Some clauses may require review."
          : "High-risk clauses detected. Please review carefully.",
    };
  };

  const handleFiles = (files) => {
    const validFiles = files.filter((file) => {
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "image/bmp",
        "image/tiff",
      ];
      return validTypes.includes(file.type) && file.size <= 100 * 1024 * 1024; // 100MB
    });

    if (validFiles.length > 0) {
      setUploading(true);

      setTimeout(() => {
        const newFiles = validFiles.map((file) => {
          const risk = analyzeRisk(file);
          return {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date(),
            status: "completed",
            risk, // ✅ Risk analysis result
          };
        });

        setUploadedFiles((prev) => [...prev, ...newFiles]);
        setUploading(false);
      }, 1500);
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

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

  // ✅ Risk badge styles
  const getRiskBadge = (riskLevel) => {
    switch (riskLevel) {
      case "Low":
        return "bg-green-100 text-green-800 border-green-300";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "High":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="ml-55 mt-15">
      {/* Upload Header */}
      <div className="text-center mb-8">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div
            className={`absolute inset-0 border-2 border-dashed rounded-full animate-spin ${
              theme === "dark" ? "border-blue-400" : "border-blue-500"
            }`}
            style={{ animationDuration: "3s" }}
          ></div>
          <Upload
            size={48}
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
              theme === "dark" ? "text-blue-400" : "text-blue-500"
            }`}
          />
        </div>
        <h2
          className={`text-3xl font-bold mb-2 ${
            theme === "dark" ? "text-white" : "text-gray-800"
          }`}
        >
          Upload Documents
        </h2>
        <p
          className={`${
            theme === "dark" ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Drag and drop files or browse to upload documents for AI analysis.
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 cursor-pointer
          ${
            isDragging
              ? `${
                  theme === "dark"
                    ? "border-blue-400 bg-blue-900/20"
                    : "border-blue-400 bg-blue-50"
                }`
              : `${
                  theme === "dark"
                    ? "border-gray-600 hover:border-blue-400 hover:bg-gray-800/50"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                }`
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
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.svg"
          onChange={handleFileInput}
          className="hidden"
        />

        {uploading ? (
          <div className="text-center">
            <div
              className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
                theme === "dark" ? "border-blue-400" : "border-blue-500"
              }`}
            ></div>
            <p
              className={`${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Uploading files...
            </p>
          </div>
        ) : (
          <div className="text-center">
            <Upload size={48} className="mx-auto mb-4 text-gray-400" />
            <p
              className={`text-lg font-medium mb-2 ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              {isDragging ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p
              className={`text-sm mb-4 ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              or click to browse files
            </p>
          </div>
        )}
      </div>

      {/* Uploaded Files with Risk Analyzer */}
      {uploadedFiles.length > 0 && (
        <div className="mt-8">
          <h3
            className={`text-lg font-semibold mb-4 ${
              theme === "dark" ? "text-white" : "text-gray-800"
            }`}
          >
            Uploaded Files ({uploadedFiles.length})
          </h3>
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className={`p-4 rounded-lg border space-y-2 ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                {/* File Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="text-2xl">{getFileIcon(file.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate ${
                          theme === "dark" ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {file.name}
                      </p>
                      <p
                        className={`text-sm ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {formatFileSize(file.size)} •{" "}
                        {file.uploadedAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle size={16} className="text-green-500" />
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <X
                        size={16}
                        className={`${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Risk Analysis */}
                {file.risk && (
                  <div
                    className={`flex items-start p-3 rounded-lg border ${getRiskBadge(
                      file.risk.level
                    )}`}
                  >
                    <AlertTriangle
                      size={18}
                      className="mr-2 mt-0.5 text-yellow-600"
                    />
                    <div>
                      <p className="font-medium">
                        Risk Level: {file.risk.level}
                      </p>
                      <p className="text-sm">{file.risk.details}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadDoc;
