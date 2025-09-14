// D:\CODE\Projects\Gen_AI_Hack\frontend\src\components\mainpage\Q&A.jsx
import React, { useState } from "react";
import { MessageSquare, Send, Bot, User } from "lucide-react";

const QnA = ({ theme }) => {
  const [messages, setMessages] = useState([
    { role: "system", text: "👋 Ask me anything about your documents!" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    const newMessages = [...messages, { role: "user", text: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Simulate API call (replace with your backend endpoint)
      const response = await new Promise((resolve) =>
        setTimeout(() => resolve({ answer: "This is a sample AI answer." }), 1200)
      );

      setMessages((prev) => [...prev, { role: "ai", text: response.answer }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "❌ Error fetching answer." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col h-[84vh] max-w-3xl mx-auto rounded-xl shadow-lg overflow-hidden ml-75
        ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-2 px-4 py-3 border-b
        ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}
      >
        <MessageSquare
          size={24}
          className={theme === "dark" ? "text-blue-400" : "text-blue-500"}
        />
        <h2 className="text-lg font-semibold">AI Q&A</h2>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role !== "user" && (
              <div
                className={`p-2 rounded-full ${
                  theme === "dark" ? "bg-blue-900/30" : "bg-blue-100"
                }`}
              >
                {msg.role === "ai" ? (
                  <Bot size={18} className="text-blue-500" />
                ) : (
                  <MessageSquare size={18} className="text-gray-400" />
                )}
              </div>
            )}

            <div
              className={`px-4 py-2 rounded-2xl max-w-[70%] ${
                msg.role === "user"
                  ? theme === "dark"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : theme === "dark"
                  ? "bg-gray-700 text-gray-100"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.text}
            </div>

            {msg.role === "user" && (
              <div
                className={`p-2 rounded-full ${
                  theme === "dark" ? "bg-blue-900/30" : "bg-blue-100"
                }`}
              >
                <User size={18} className="text-blue-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div
            className={`px-4 py-2 rounded-2xl inline-block ${
              theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
            }`}
          >
            <span className="animate-pulse">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className={`flex items-center gap-2 px-4 py-3 border-t
        ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className={`flex-1 rounded-lg px-3 py-2 outline-none
            ${theme === "dark" ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"}`}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default QnA;
