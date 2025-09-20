import React, { useRef } from "react";
import { Upload, X, CheckCircle, AlertTriangle, FileText, Shield, Brain, Download, Loader2 } from "lucide-react";

const UploadDoc = ({ 
  theme, 
  uploadedFiles, 
  setUploadedFiles, 
  showProcessingSidebar, 
  setShowProcessingSidebar, 
  currentProcessingFile, 
  setCurrentProcessingFile, 
  processingSteps, 
  setProcessingSteps 
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = useRef(null);

  // --- ENHANCED STREAMING AND PIPELINE LOGIC ---

  // Maps backend status messages to frontend pipeline steps with more granular matching
  const statusToStepMap = {
    "Initializing clients...": { stepId: 1, message: "Initializing document processing..." },
    "Extracting text from document...": { stepId: 1, message: "Extracting text content..." },
    "Extraction complete.": { stepId: 1, message: "Text extraction completed" },
    "Translating text...": { stepId: 2, message: "Processing language translation..." },
    "Translation complete.": { stepId: 2, message: "Translation completed" },
    "Sending text to profiling model...": { stepId: 3, message: "Analyzing document with AI..." },
    "Profiling complete.": { stepId: 3, message: "AI analysis completed" },
    "Refining and structuring results...": { stepId: 3, message: "Structuring analysis results..." },
    "Process complete!": { stepId: 4, message: "Document processing completed!" },
  };

  const updateProcessingState = (statusMessage, additionalData = null) => {
    const mappedStatus = statusToStepMap[statusMessage];
    if (!mappedStatus) {
      // Handle dynamic messages that don't match exact patterns
      console.log("Unknown status message:", statusMessage);
      return;
    }

    const { stepId, message } = mappedStatus;
    
    setProcessingSteps(steps =>
      steps.map(step => {
        if (step.id < stepId) {
          return { ...step, status: "completed", currentMessage: null };
        }
        if (step.id === stepId) {
          return { 
            ...step, 
            status: stepId === 4 ? "completed" : "processing",
            currentMessage: message,
            progress: additionalData?.progress || null
          };
        }
        return { ...step, status: "pending", currentMessage: null };
      })
    );
  };

  const processFile = async (file) => {
    const fileId = Date.now() + Math.random();
    const newFileEntry = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      status: "Processing: Starting...",
      profile: null,
      processingDetails: []
    };
    
    setUploadedFiles((prev) => [newFileEntry, ...prev]);
    setCurrentProcessingFile(newFileEntry);
    
    // Show and reset sidebar for each new file
    setShowProcessingSidebar(true);
    setProcessingSteps(steps => steps.map(step => ({ 
      ...step, 
      status: "pending", 
      currentMessage: null,
      progress: null
    })));

    const updateFileState = (newStatus, data = null) => {
      setUploadedFiles((prev) =>
        prev.map((f) => {
          if (f.id === fileId) {
            const updatedFile = { 
              ...f, 
              status: newStatus,
              lastUpdated: new Date()
            };
            if (data?.profile) updatedFile.profile = data.profile;
            if (data?.error) updatedFile.status = `Failed: ${data.error}`;
            if (data?.processingDetail) {
              updatedFile.processingDetails = [...(f.processingDetails || []), {
                timestamp: new Date(),
                message: data.processingDetail,
                type: data.type || 'info'
              }];
            }
            return updatedFile;
          }
          return f;
        })
      );
    };

    try {
      const formData = new FormData();
      formData.append("files", file);

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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let boundary;
        
        while ((boundary = buffer.indexOf("\n\n")) >= 0) {
          const message = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          let eventType = "message";
          let eventData = "";

          message.split("\n").forEach(line => {
            if (line.startsWith("event:")) eventType = line.replace("event:", "").trim();
            else if (line.startsWith("data:")) eventData = line.replace("data:", "").trim();
          });

          if (eventData) {
            try {
              const data = JSON.parse(eventData);
              
              if (eventType === "message") {
                const statusText = `Processing: ${data.status}`;
                updateFileState(statusText, { 
                  processingDetail: data.status,
                  type: 'processing'
                });
                updateProcessingState(data.status, data);
                
              } else if (eventType === "progress") {
                // Handle progress updates
                updateFileState(`Processing: ${data.message}`, {
                  processingDetail: `${data.message} (${data.progress}%)`,
                  type: 'progress'
                });
                
              } else if (eventType === "final_result") {
                updateFileState("Completed", { 
                  profile: data,
                  processingDetail: "Document analysis completed successfully",
                  type: 'success'
                });
                setProcessingSteps(steps => steps.map(s => ({
                  ...s, 
                  status: 'completed',
                  currentMessage: s.id === 4 ? "Analysis report ready!" : null
                })));
                reader.cancel();
                return;
                
              } else if (eventType === "error") {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error("Error parsing event data:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Processing failed for ${file.name}:`, error);
      updateFileState("Failed", { 
        error: error.message,
        processingDetail: `Error: ${error.message}`,
        type: 'error'
      });
      setProcessingSteps(steps => steps.map(s => 
        s.status === 'processing' ? { ...s, status: 'failed', currentMessage: 'Processing failed' } : s
      ));
    }
  };

  const handleFiles = async (files) => {
    const validFiles = files.filter((file) => {
      const validTypes = [
        "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain", "image/jpeg", "image/jpg", "image/png",
      ];
      return validTypes.includes(file.type) && file.size <= 100 * 1024 * 1024;
    });

    if (validFiles.length > 0) {
      // Process files one by one to show the pipeline for each
      for (const file of validFiles) {
        await processFile(file);
      }
    }
  };

  // --- EVENT HANDLERS AND HELPERS ---
  
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };
  const handleFileInput = (e) => handleFiles(Array.from(e.target.files));
  const removeFile = (fileId) => setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  const closeSidebar = () => setShowProcessingSidebar(false);
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

  const ProcessingStep = ({ step, isLast, theme }) => {
    const Icon = step.icon;
    const statusColor = step.status === 'completed' ? 'bg-blue-500 border-blue-500' :
                        step.status === 'processing' ? `${theme === "dark" ? "bg-blue-900 border-blue-400" : "bg-blue-50 border-blue-400"} animate-pulse` :
                        step.status === 'failed' ? 'bg-red-500 border-red-500' :
                        `${theme === "dark" ? "bg-gray-800 border-gray-600" : "bg-gray-100 border-gray-300"}`;
    
    return (
      <div className="relative">
        <div className="flex items-start space-x-4">
          <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 flex-shrink-0 ${statusColor}`}>
            {step.status === "completed" ? (
              <CheckCircle size={24} className="text-white" />
            ) : step.status === "processing" ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            ) : step.status === "failed" ? (
              <AlertTriangle size={20} className="text-white" />
            ) : (
              <Icon size={20} className={`${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {step.name}
            </h4>
            <p className={`text-xs capitalize ${
                step.status === "completed" ? "text-green-500" :
                step.status === "processing" ? "text-blue-400" :
                step.status === "failed" ? "text-red-500" :
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
            }`}>
              {step.status}
            </p>
            {step.currentMessage && (
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {step.currentMessage}
              </p>
            )}
            {step.progress && (
              <div className="mt-2">
                <div className={`w-full bg-gray-200 rounded-full h-1.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${step.progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
        {!isLast && (
          <div className={`absolute left-6 top-12 w-0.5 h-8 transition-all duration-500 ${
            step.status === 'completed' ? 'bg-blue-500' : 
            step.status === 'failed' ? 'bg-red-500' :
            theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
          }`} />
        )}
      </div>
    );
  };

  // --- JSX RENDER ---
  return (
    <div className="relative w-full">
      <div className={`transition-all duration-300 ${showProcessingSidebar ? 'mr-0 lg:mr-80' : ''}`}>
        {/* Header section */}
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

        {/* Dropzone */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 md:p-12 transition-all duration-300 cursor-pointer
            ${isDragging ? `${theme === "dark" ? "border-blue-400 bg-blue-900/20" : "border-blue-400 bg-blue-50"}`
              : `${theme === "dark" ? "border-gray-600 hover:border-blue-400 hover:bg-gray-800/50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"}`
            }`}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png" onChange={handleFileInput} className="hidden" />
          <div className="text-center">
            <Upload size={48} className="mx-auto mb-4 text-gray-400" />
            <p className={`text-base md:text-lg font-medium mb-2 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
              {isDragging ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>or click to browse files</p>
          </div>
        </div>
        
        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-6 md:mt-8">
            <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-800"}`}>
              Processed Files ({uploadedFiles.length})
            </h3>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className={`p-4 rounded-lg border space-y-3 ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="text-2xl flex-shrink-0">{getFileIcon(file.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{file.name}</p>
                        <p className={`text-xs md:text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                          {formatFileSize(file.size)} • {file.uploadedAt.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {file.status.startsWith('Processing') && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                      {file.status === 'Completed' && <CheckCircle size={16} className="text-green-500" />}
                      {file.status.startsWith('Failed') && <AlertTriangle size={16} className="text-red-500" />}
                      <button onClick={() => removeFile(file.id)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <X size={16} className={`${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                      </button>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg border ${
                      file.status.startsWith('Failed') ? 'bg-red-100/50 border-red-200 dark:bg-red-900/20 dark:border-red-700/30' : 
                      file.status === 'Completed' ? 'bg-green-100/50 border-green-200 dark:bg-green-900/20 dark:border-green-700/30' :
                      theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-white border-gray-200'
                  }`}>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>{file.status}</p>
                    {file.profile && (
                      <div className={`mt-2 text-xs space-y-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        <p><strong>Document Type:</strong> {file.profile.document_type}</p>
                        {file.profile.obligations?.length > 0 && <p><strong>Obligations Found:</strong> {file.profile.obligations.length}</p>}
                        {file.profile.dates?.length > 0 && <p><strong>Important Dates Found:</strong> {file.profile.dates.length}</p>}
                        {file.profile.penalties?.length > 0 && <p><strong>Penalties Found:</strong> {file.profile.penalties.length}</p>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Processing Sidebar with proper navbar offset */}
      <div className={`fixed h-full w-80 transform transition-transform duration-300 ease-in-out z-40 ${
        showProcessingSidebar ? 'translate-x-0' : 'translate-x-full'
      } ${theme === "dark" ? "bg-gray-900 border-l border-gray-700" : "bg-white border-l border-gray-200"} shadow-xl overflow-y-auto`}
      style={{ 
        top: '64px', // Offset for navbar height - adjust this based on your navbar height
        right: '0',
        height: 'calc(100vh - 64px)' // Full height minus navbar
      }}>
        <div className={`p-6 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Processing Pipeline</h3>
            <button onClick={closeSidebar} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              <X size={20} />
            </button>
          </div>
          <p className={`text-sm mt-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            {currentProcessingFile ? `Processing: ${currentProcessingFile.name}` : 'Document analysis in progress...'}
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          {processingSteps.map((step, index) => (
            <ProcessingStep key={step.id} step={step} isLast={index === processingSteps.length - 1} theme={theme} />
          ))}
        </div>
        
        {processingSteps.every(step => step.status === "completed") && (
          <div className={`absolute bottom-0 left-0 right-0 p-6 border-t ${theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}>
            <div className="text-center">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
              <p className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Analysis Complete!</p>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Your document has been processed successfully.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadDoc;