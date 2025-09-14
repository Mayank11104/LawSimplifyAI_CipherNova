import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  MessageSquare,
  FileText,
  Settings as SettingsIcon,
  Shield,
  Bell,
  User,
  Sun,
  Moon,
} from "lucide-react";

import UploadDoc from "../components/mainpage/upload_Doc";
import QnA from "../components/mainpage/Q&A";
import UserSettings from "../components/mainpage/usersettings";

const Clausemain = ({ theme, toggleTheme ,currentUser}) => {
  const [activeButton, setActiveButton] = useState("upload");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close popups when clicking outside
  useEffect(() => {
    console.log(currentUser);

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
  }, []);

  const sidebarButtons = [
    { id: "upload", label: "Upload Document", icon: Upload },
    { id: "qna", label: "AI Q&A", icon: MessageSquare },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "notification", label: "Notification", icon: Bell },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  const handleButtonClick = (id) => {
    setActiveButton(id);
  };

  // put this inside your component (above return)
const handleLogout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  setIsAuthenticated(false);   // if you are tracking auth in state
  setCurrentUser(null);        // clear current user state
  window.location.href = "/";  // redirect to homepage (or login page)
};


  return (
    <div
      className={`min-h-screen flex ${
        theme === "dark"
          ? "bg-gray-900 text-white"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-80 shadow-xl flex flex-col ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700 text-white"
            : "bg-white border-gray-200 text-gray-900"
        }`}
      >
        {/* Sidebar Header */}
        <div
          className={`p-6 border-b ${
            theme === "dark" ? "border-gray-700" : "border-gray-100"
          }`}
        >
          <h1 className="text-2xl font-bold">LawSimplify AI</h1>
          <p
            className={`text-sm mt-1 ${
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Document Intelligence Platform
          </p>
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
                className={`w-full flex items-center space-x-3 px-6 py-3 rounded-lg transition-all duration-200 text-left
                  ${
                    isActive
                      ? `${
                          theme === "dark"
                            ? "bg-blue-900/30 text-blue-400 border-l-4 border-blue-400"
                            : "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                        }`
                      : `${
                          theme === "dark"
                            ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        }`
                  }`}
              >
                <IconComponent
                  size={20}
                  className={`${
                    isActive
                      ? theme === "dark"
                        ? "text-blue-400"
                        : "text-blue-700"
                      : theme === "dark"
                      ? "text-gray-400"
                      : "text-gray-500"
                  }`}
                />
                <span className="font-medium">{button.label}</span>
              </button>
            );
          })}
        </div>

        {/* Data Privacy */}
        <div
          className={`p-4 border-t ${
            theme === "dark" ? "border-gray-700" : "border-gray-100"
          }`}
        >
          <div
            className={`rounded-lg p-4 border ${
              theme === "dark"
                ? "bg-green-900/30 border-green-700 text-green-200"
                : "bg-green-50 border-green-200 text-green-800"
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <Shield
                size={16}
                className={`${
                  theme === "dark" ? "text-green-300" : "text-green-600"
                }`}
              />
              <span className="text-sm font-medium">Data Privacy</span>
            </div>
            <p className="text-xs leading-relaxed">
              <Shield
                size={12}
                className={`inline mr-1 ${
                  theme === "dark" ? "text-green-300" : "text-green-600"
                }`}
              />
              Your data is safe with us.
              <br />
              We use end-to-end encryption.
            </p>
          </div>
        </div>
      </div>

      {/* Top Navbar */}
      <div
        className={`fixed top-0 right-0 left-80 shadow-sm z-20 flex items-center justify-end px-4 py-2
          ${
            theme === "dark"
              ? "bg-gray-800 border-gray-700 text-white"
              : "bg-white border-gray-200 text-gray-900"
          }`}
      >
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="mr-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
            className="mr-6 relative p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Bell
              size={20}
              className={`${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              3
            </span>
          </button>

          {/* Notification Popup */}
          {notifOpen && (
            <div
              className={`absolute right-0 mt-2 w-80 rounded-xl shadow-lg p-4 border z-30
                ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
            >
              <h3 className="text-lg font-semibold mb-3">Notifications</h3>
              <ul className="space-y-2">
                <li
                  className={`p-2 rounded-lg ${
                    theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"
                  }`}
                >
                  📄 New document uploaded successfully.
                </li>
                <li
                  className={`p-2 rounded-lg ${
                    theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"
                  }`}
                >
                  🤖 AI answered your last question.
                </li>
                <li
                  className={`p-2 rounded-lg ${
                    theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"
                  }`}
                >
                  ⚙️ Settings updated.
                </li>
              </ul>
              <button
                className="mt-4 w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                View All
              </button>
            </div>
          )}
        </div>

        {/* Profile */}
<div className="relative" ref={profileRef}>
  <button
    onClick={() => setProfileOpen(!profileOpen)}
    className="mr-4 p-1 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
  >
    {currentUser?.profile_pic ? (
      <img
        src={currentUser.profile_pic}
        alt="Profile"
        className="w-10 h-10 rounded-full border"
      />
    ) : (
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
        <User size={22} />
      </div>
    )}
  </button>

  {/* Profile Popup */}
  {profileOpen && (
    <div
      className={`absolute right-0 mt-5 w-80 rounded-xl shadow-lg p-4 border z-30
        ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700 text-white"
            : "bg-white border-gray-200 text-gray-900"
        }`}
    >
      {currentUser ? (
        <>
          <div className="flex items-center gap-3 mb-3">
            <img
              src={currentUser.profile_pic}
              alt="Profile"
              className="w-12 h-12 rounded-full border"
            />
            <div>
              <h3 className="text-lg font-semibold">{currentUser.username}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentUser.email}
              </p>
            </div>
          </div>

          {/* Example static stat */}
          <p className="text-sm">
            <span className="font-medium">Documents Demystified:</span> 12
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

      {/* Main Content */}
      <div className="flex-1 ml-80">
        <div className="pt-20 p-8">
          <div className="max-w-4xl">
            {activeButton === "upload" && <UploadDoc theme={theme} />}
            {activeButton === "qna" && <QnA theme={theme} />}
            {activeButton === "documents" && (
              <div>📄 Documents section coming soon...</div>
            )}
            {activeButton === "notification" && (
              <div>📄 Documents section coming soon...</div>
            )}
            {activeButton === "settings" && <UserSettings theme={theme} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Clausemain;
