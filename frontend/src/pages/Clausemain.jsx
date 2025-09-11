import React, { useState, useRef } from 'react';
import { 
  Upload, 
  MessageSquare, 
  FileText, 
  Settings, 
  Shield, 
  Bell, 
  User, 
  Sun, 
  Moon,
  X,
  CheckCircle
} from 'lucide-react';

const Clausemain = ({ theme, toggleTheme }) => {
  const [activeButton, setActiveButton] = useState('upload');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const sidebarButtons = [
    { id: 'upload', label: 'Upload Document', icon: Upload, description: 'Upload your documents for AI analysis' },
    { id: 'qna', label: 'AI Q&A', icon: MessageSquare, description: 'Ask questions about your documents' },
    { id: 'documents', label: 'Documents', icon: FileText, description: 'View and manage your documents' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Configure your preferences' },
  ];

  const handleButtonClick = (buttonId) => setActiveButton(buttonId);

  // File upload handlers
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

  const handleFiles = (files) => {
    const validFiles = files.filter(file => {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/bmp',
        'image/tiff'
      ];
      return validTypes.includes(file.type) && file.size <= 100 * 1024 * 1024; // 100MB limit
    });

    if (validFiles.length > 0) {
      setUploading(true);

      setTimeout(() => {
        const newFiles = validFiles.map(file => ({
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          status: 'completed'
        }));

        setUploadedFiles(prev => [...prev, ...newFiles]);
        setUploading(false);
      }, 1500);
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('text')) return '📄';
    return '📎';
  };

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-80 shadow-xl flex flex-col
        ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>

        {/* Sidebar Header */}
        <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
          <h1 className="text-2xl font-bold">ClauseAI</h1>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Document Intelligence Platform</p>
        </div>

        {/* Sidebar Buttons */}
        <div className="flex-1 p-4 space-y-2">
          {sidebarButtons.map((button) => {
            const IconComponent = button.icon;
            const isActive = activeButton === button.id;
            return (
              <button
                key={button.id}
                onClick={() => handleButtonClick(button.id)}
                className={`w-full flex items-center space-x-3 px-10 py-3 rounded-lg transition-all duration-200 text-left
                  ${isActive
                    ? `${theme === 'dark' ? 'bg-blue-900/30 text-blue-400 border-l-4 border-blue-400' : 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'}`
                    : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`
                  }`}
              >
                <IconComponent size={20} className={`${isActive ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-700') : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}`} />
                <div className="flex-1">
                  <div className={`font-medium ${isActive ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-700') : (theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}`}>
                    {button.label}
                  </div>
                  <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{button.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Data Privacy */}
        <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className={`rounded-lg p-4 border ${theme === 'dark' ? 'bg-green-900/30 border-green-700 text-green-200' : 'bg-green-50 border-green-200 text-green-800'}`}>
            <div className="flex items-center space-x-2 mb-2">
              <Shield size={16} className={`${theme === 'dark' ? 'text-green-300' : 'text-green-600'}`} />
              <span className="text-sm font-medium">Data Privacy</span>
            </div>
            <p className="text-xs leading-relaxed">
              <span className="inline-flex items-center space-x-1">
                <Shield size={12} className={`${theme === 'dark' ? 'text-green-300' : 'text-green-600'}`} />
                <span>Your data is safe with us.</span>
              </span>
              <br />
              We use end-to-end encryption.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-110">

        {/* Top Bar */}
        <div className={`fixed top-0 right-0 left-80 shadow-sm z-10 flex items-center justify-end px-4 py-2
          ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="mr-10 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-gray-600" />}
          </button>

          {/* Notification */}
          <button className="mr-4 relative p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
            <Bell size={20} className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              3
            </span>
          </button>

          {/* Profile */}
          <button className="mr-10 p-1 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
              <User size={28} />
            </div>
          </button>
        </div>

        {/* Page Content */}
        <div className="pt-25 p-8">
          <div className="max-w-4xl">
            {activeButton === 'upload' && (
              <div>
                {/* Upload Header */}
                <div className="text-center mb-8">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <div className={`absolute inset-0 border-2 border-dashed rounded-full animate-spin ${theme === 'dark' ? 'border-blue-400' : 'border-blue-500'}`} style={{animationDuration: '3s'}}></div>
                    <Upload size={48} className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                  </div>
                  <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Upload Documents</h2>
                  <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    Drag and drop files or browse to upload documents for AI analysis. Secure and encrypted.
                  </p>
                </div>

                {/* Upload Area */}
                <div
                  className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 cursor-pointer
                    ${isDragging 
                      ? `${theme === 'dark' ? 'border-blue-400 bg-blue-900/20' : 'border-blue-400 bg-blue-50'}` 
                      : `${theme === 'dark' ? 'border-gray-600 hover:border-blue-400 hover:bg-gray-800/50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`
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
                      <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${theme === 'dark' ? 'border-blue-400' : 'border-blue-500'}`}></div>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Uploading files...</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                      <p className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                        {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                      </p>
                      <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        or click to browse files
                      </p>
                      <button className={`px-6 py-2 rounded-lg font-medium transition-colors
                        ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
                        Browse Files
                      </button>
                      <p className={`text-xs mt-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        Supported formats: PDF, DOC, DOCX, TXT , JPG , JPEG , PNG (Max 100MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-8">
                    <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      Uploaded Files ({uploadedFiles.length})
                    </h3>
                    <div className="space-y-3">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className={`flex items-center justify-between p-4 rounded-lg border
                          ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="text-2xl">{getFileIcon(file.type)}</div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {file.name}
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {formatFileSize(file.size)} • {file.uploadedAt.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle size={16} className="text-green-500" />
                            <button
                              onClick={() => removeFile(file.id)}
                              className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors`}
                            >
                              <X size={16} className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Smart Summary Feed */}
                <div className="mt-8 bg-[#161B22] border border-[#30363D] rounded-xl p-6">
                  <h3 className="text-white text-xl font-bold mb-4">Smart Summary Feed</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-[#21262D] rounded-lg">
                      <span className="material-symbols-outlined text-[#8B949E] mt-1">radar</span>
                      <div className="flex-1">
                        <p className="text-white font-medium">Risk Radar</p>
                        <p className="text-[#8B949E] text-sm">
                          Potential liability identified in 'MSA_AcmeCorp.docx'. High-risk clause detected.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-semibold text-red-400">High Risk</span>
                          <div className="w-full bg-[#30363D] rounded-full h-1.5">
                            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-[#21262D] transition-colors">
                      <span className="material-symbols-outlined text-[#8B949E] mt-1">find_in_page</span>
                      <div className="flex-1">
                        <p className="text-white font-medium">Clause Explorer</p>
                        <p className="text-[#8B949E] text-sm">
                          Analyzed 'Non-Disclosure Agreement_v3.pdf'. 12 key clauses extracted.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-[#21262D] transition-colors">
                      <span className="material-symbols-outlined text-[#8B949E] mt-1">mic</span>
                      <div className="flex-1">
                        <p className="text-white font-medium">Voice Q&A</p>
                        <p className="text-[#8B949E] text-sm">
                          You asked: "What is the termination clause in the vendor agreement?".
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeButton === 'qna' && (
              <div className="text-center">
                <MessageSquare size={64} className={`mx-auto mb-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                <h2 className="text-3xl font-bold mb-2">AI Q&A</h2>
                <p>Ask questions about your uploaded documents</p>
              </div>
            )}

            {activeButton === 'documents' && (
              <div className="text-center">
                <FileText size={64} className={`mx-auto mb-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                <h2 className="text-3xl font-bold mb-2">Documents</h2>
                <p>View and manage your uploaded documents</p>
              </div>
            )}

            {activeButton === 'settings' && (
              <div className="text-center">
                <Settings size={64} className={`mx-auto mb-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                <h2 className="text-3xl font-bold mb-2">Settings</h2>
                <p>Configure your preferences and account settings</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Clausemain;
