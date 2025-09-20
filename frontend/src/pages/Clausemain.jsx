import React, { useState, useEffect, useRef } from "react";
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
  ChevronLeft,
  Menu,
  Edit,
  Loader2,
  Brain,
} from "lucide-react";
import axios from 'axios';

import UploadDoc from "../components/mainpage/upload_Doc";
import QnA from "../components/mainpage/Q&A";
import UserSettings from "../components/mainpage/usersettings";
import ESign from "../components/mainpage/E_sign";

const Clausemain = ({ theme, toggleTheme, currentUser }) => {
  
  const [activeButton, setActiveButton] = useState("upload");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const sidebarRef = useRef(null);

  // Persistent state for file processing
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showProcessingSidebar, setShowProcessingSidebar] = useState(false);
  const [currentProcessingFile, setCurrentProcessingFile] = useState(null);
  const [processingSteps, setProcessingSteps] = useState([
    { id: 1, name: "Text Extraction", icon: FileText, status: "pending", description: "Extracting text content from document" },
    { id: 2, name: "Language Translation", icon: Brain, status: "pending", description: "Translating content if needed" },
    { id: 3, name: "AI Document Profiling", icon: Shield, status: "pending", description: "Analyzing document structure and content" },
    { id: 4, name: "Final Report Ready", icon: Upload, status: "pending", description: "Generating final analysis report" }
  ]);

  // Check if any files are currently processing
  const hasActiveProcessing = uploadedFiles.some(file => 
    file.status.startsWith('Processing') && !file.status.startsWith('Processing: Completed')
  );

  useEffect(() => {
    if (currentUser) {
      console.log("Clausemain currentUser:", currentUser);
    }

    const handleClickOutside = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target) &&
        notifRef.current &&
        !notifRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [currentUser]);

  const sidebarButtons = [
    { id: "upload", label: "Upload Document", icon: Upload },
    { id: "qna", label: "AI Q&A", icon: MessageSquare },
    { id: "E-Sign", label: "E-signature", icon: Edit },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleButtonClick = (id) => {
    setActiveButton(id);
  };

  const handleLogout = async () => {
    try {
      await axios.get(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        withCredentials: true,
      });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.location.href = "/"; // redirect to homepage
    }
  };

  if (!currentUser) {
    return <div>Loading...</div>; // or return null
  }

  return (
    <div className={`min-h-screen flex relative ${
      theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
    }`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
             onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-full w-72 lg:w-80 shadow-xl flex flex-col z-50 transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}
      >
        {/* Sidebar Header */}
        <div className={`p-4 md:p-6 border-b flex items-center justify-between
          ${theme === "dark" ? "border-gray-700" : "border-gray-100"}`}>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">LawSimplify AI</h1>
            <p className={`text-xs md:text-sm mt-1 ${
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            }`}>
              Document Intelligence Platform
            </p>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Processing Status Banner */}
        {hasActiveProcessing && (
          <div className={`mx-3 md:mx-4 mt-2 p-3 rounded-lg border-l-4 border-blue-500 cursor-pointer transition-all hover:shadow-md ${
            theme === "dark" ? "bg-blue-900/20 border-blue-400" : "bg-blue-50 border-blue-500"
          }`}
          onClick={() => {
            setActiveButton("upload");
            setShowProcessingSidebar(true);
          }}>
            <div className="flex items-center space-x-2">
              <Loader2 size={16} className="text-blue-500 animate-spin" />
              <div className="flex-1">
                <p className={`text-sm font-medium ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
                  Processing Document
                </p>
                <p className={`text-xs ${theme === "dark" ? "text-blue-200" : "text-blue-600"}`}>
                  {currentProcessingFile ? currentProcessingFile.name : 'Document analysis in progress...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Buttons */}
        <div className="flex-1 p-3 md:p-4 space-y-2 overflow-y-auto">
          {sidebarButtons.map((button) => {
            const IconComponent = button.icon;
            const isActive = activeButton === button.id;
            const hasProcessingIndicator = button.id === "upload" && hasActiveProcessing;
            
            return (
              <button
                key={button.id}
                onClick={() => handleButtonClick(button.id)}
                className={`w-full flex items-center space-x-3 px-4 md:px-6 py-2.5 md:py-3 rounded-lg transition-all duration-200 text-left text-sm md:text-base relative
                  ${isActive
                    ? `${theme === "dark"
                        ? "bg-blue-900/30 text-blue-400 border-l-4 border-blue-400"
                        : "bg-blue-50 text-blue-700 border-l-4 border-blue-700"}`
                    : `${theme === "dark"
                        ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"}`
                  }`}
              >
                <IconComponent size={20} className={`${
                  isActive
                    ? theme === "dark" ? "text-blue-400" : "text-blue-700"
                    : theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`} />
                <span className="font-medium flex-1">{button.label}</span>
                {hasProcessingIndicator && (
                  <div className="flex items-center space-x-1">
                    <Loader2 size={14} className="text-blue-500 animate-spin" />
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      theme === "dark" ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-700"
                    }`}>
                      {uploadedFiles.filter(f => f.status.startsWith('Processing')).length}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Data Privacy */}
        <div className={`p-3 md:p-4 border-t ${
          theme === "dark" ? "border-gray-700" : "border-gray-100"
        }`}>
          <div className={`rounded-lg p-3 md:p-4 border ${
            theme === "dark"
              ? "bg-green-900/30 border-green-700 text-green-200"
              : "bg-green-50 border-green-200 text-green-800"
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              <Shield size={16} className={`${
                theme === "dark" ? "text-green-300" : "text-green-600"
              }`} />
              <span className="text-xs md:text-sm font-medium">Data Privacy</span>
            </div>
            <p className="text-xs leading-relaxed">
              Your data is safe with us. We use end-to-end encryption.
            </p>
          </div>
        </div>
      </div>

      {/* Top Navbar */}
      <div className={`fixed top-0 right-0 left-0 lg:left-80 shadow-sm z-30 flex items-center justify-between px-4 py-2 md:py-3
        ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
        
        {/* Mobile Menu Button */}
        <button
          data-sidebar-toggle
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Menu size={24} />
        </button>

        {/* Processing Status in Navbar (Mobile) */}
        {hasActiveProcessing && (
          <div className="lg:hidden flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/20">
            <Loader2 size={14} className="text-blue-500 animate-spin" />
            <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
              Processing {uploadedFiles.filter(f => f.status.startsWith('Processing')).length}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 md:gap-4 ml-auto">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === "dark" ? (
              <Sun size={20} className="text-yellow-400" />
            ) : (
              <Moon size={20} className="text-gray-600" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Bell size={20} className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 md:h-5 md:w-5 flex items-center justify-center">
                {hasActiveProcessing ? uploadedFiles.filter(f => f.status.startsWith('Processing')).length + 2 : 3}
              </span>
            </button>

            {notifOpen && (
              <div className={`absolute right-0 mt-2 w-72 md:w-80 rounded-xl shadow-lg p-4 border z-30
                ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
                <h3 className="text-base md:text-lg font-semibold mb-3">Notifications</h3>
                <ul className="space-y-2 text-sm">
                  {hasActiveProcessing && (
                    <li className={`p-2 rounded-lg border-l-4 border-blue-500 ${theme === "dark" ? "bg-blue-900/20" : "bg-blue-50"}`}>
                      <div className="flex items-center space-x-2">
                        <Loader2 size={14} className="text-blue-500 animate-spin" />
                        <span className="font-medium">Document Processing</span>
                      </div>
                      <p className="text-xs mt-1 opacity-75">
                        {uploadedFiles.filter(f => f.status.startsWith('Processing')).length} files being analyzed
                      </p>
                    </li>
                  )}
                  <li className={`p-2 rounded-lg ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                    📄 New document uploaded successfully.
                  </li>
                  <li className={`p-2 rounded-lg ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                    🤖 AI answered your last question.
                  </li>
                  <li className={`p-2 rounded-lg ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                    ⚙️ Settings updated.
                  </li>
                </ul>
                <button className="mt-4 w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
                  View All
                </button>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="p-1 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {currentUser?.profile_pic ? (
                <img src={currentUser.profile_pic} alt="Profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full border" />
              ) : (
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                  <User size={18} />
                </div>
              )}
            </button>

            {profileOpen && (
              <div className={`absolute right-0 mt-2 w-72 md:w-80 rounded-xl shadow-lg p-4 border z-30
                ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
                {currentUser ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <img src={currentUser.profile_pic} alt="Profile" className="w-10 h-10 md:w-12 md:h-12 rounded-full border" />
                      <div>
                        <h3 className="text-base md:text-lg font-semibold">{currentUser.username}</h3>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{currentUser.email}</p>
                      </div>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">Documents Demystified:</span> {uploadedFiles.filter(f => f.status === 'Completed').length}
                    </p>
                    <button
                      className="mt-4 w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <p className="text-sm">No user data available</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 pt-16 lg:ml-80">
        <div className="pt-4 md:pt-12 p-4 md:p-6 lg:p-8">
          <div className="max-w-full lg:max-w-4xl mx-auto">
            {activeButton === "upload" && (
              <UploadDoc 
                theme={theme} 
                uploadedFiles={uploadedFiles}
                setUploadedFiles={setUploadedFiles}
                showProcessingSidebar={showProcessingSidebar}
                setShowProcessingSidebar={setShowProcessingSidebar}
                currentProcessingFile={currentProcessingFile}
                setCurrentProcessingFile={setCurrentProcessingFile}
                processingSteps={processingSteps}
                setProcessingSteps={setProcessingSteps}
              />
            )}
            {activeButton === "qna" && <QnA theme={theme} />}   
            {activeButton === "E-Sign" && <ESign theme={theme} />}
            {activeButton === "documents" && (
              <div className="text-center py-8">
                <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg">📄 Documents section coming soon...</p>
              </div>
            )}
            {activeButton === "notification" && (
              <div className="text-center py-8">
                <Bell size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg">🔔 Notifications section coming soon...</p>
              </div>
            )}
            {activeButton === "settings" && <UserSettings theme={theme} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Clausemain;