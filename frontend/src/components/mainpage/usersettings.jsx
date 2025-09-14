// D:\CODE\Projects\Gen_AI_Hack\frontend\src\components\mainpage\settings.jsx
import React, { useState } from "react";
import { User, FileText, Globe } from "lucide-react";

const Settings = ({ theme }) => {
  const [language, setLanguage] = useState("en");

  const languages = [
    { code: "en", name: "English" },
    { code: "hi", name: "हिन्दी" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
  ];

  const cardStyle = `rounded-xl shadow-md p-6 flex items-center justify-between transition
    ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`;

  return (
    <div
      className={`max-w-3xl mx-auto h-[75vh] ml-55 p-6 overflow-y-auto space-y-6
        ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}
    >
      <h2 className="text-2xl font-bold mb-6">⚙️ Settings</h2>

      {/* Account */}
      <div className={cardStyle}>
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-lg ${
              theme === "dark" ? "bg-blue-900/30" : "bg-blue-100"
            }`}
          >
            <User size={24} className="text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Account</h3>
            <p className="text-sm opacity-70">Manage your profile & preferences</p>
          </div>
        </div>
        <button
          className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
          onClick={() => alert("Open account settings")}
        >
          Manage
        </button>
      </div>

      {/* Document History */}
      <div className={cardStyle}>
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-lg ${
              theme === "dark" ? "bg-green-900/30" : "bg-green-100"
            }`}
          >
            <FileText size={24} className="text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Document History</h3>
            <p className="text-sm opacity-70">
              View and manage your uploaded documents
            </p>
          </div>
        </div>
        <button
          className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition"
          onClick={() => alert("Open document history")}
        >
          Open
        </button>
      </div>

      {/* Language */}
      <div className={cardStyle}>
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-lg ${
              theme === "dark" ? "bg-purple-900/30" : "bg-purple-100"
            }`}
          >
            <Globe size={24} className="text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Language</h3>
            <p className="text-sm opacity-70">Select your preferred language</p>
          </div>
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className={`ml-4 rounded-lg px-3 py-2 outline-none border cursor-pointer
            ${theme === "dark"
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-gray-100 border-gray-300 text-gray-900"}`}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Settings;
