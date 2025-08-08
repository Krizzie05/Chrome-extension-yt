import React from "react";

function ChatbotApp() {
  return (
    <div style={{ padding: "12px", fontFamily: "Arial, sans-serif" }}>
      <h3 style={{ margin: "0 0 8px" }}>🎤 YouTube RAG Chatbot</h3>
      <p>Ask me about this video transcript.</p>
      <input
        type="text"
        placeholder="Type your question..."
        style={{
          width: "100%",
          padding: "6px",
          marginBottom: "8px",
          boxSizing: "border-box"
        }}
      />
      <button style={{ width: "100%" }}>Submit</button>
    </div>
  );
}

export default ChatbotApp;
