(() => {
  console.log("YouTube AI Assistant Loaded");

  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 1);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  onReady(() => {
    if (document.getElementById("youtube-ai-assistant-container")) return;

    const YOUTUBE_RED = '#FF0000';

    // --- Main Floating Container ---
    const container = document.createElement("div");
    container.id = "youtube-ai-assistant-container";
    container.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      height: 600px;
      width: 380px;
      z-index: 9999;
      display: none; /* Initially hidden */
      flex-direction: column;
      background: rgba(15, 15, 15, 0.85); /* Dark, semi-transparent */
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      font-family: "Roboto", "Arial", sans-serif;
    `;

    // --- Header ---
    const header = document.createElement("div");
    header.innerText = "YouTube AI Assistant";
    header.style.cssText = `
      padding: 12px;
      text-align: center;
      font-weight: bold;
      font-size: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
    `;

    // --- Chat Area ---
    const chatArea = document.createElement("div");
    chatArea.style.cssText = "flex: 1; padding: 10px; overflow-y: auto; font-size: 14px; line-height: 1.5;";
    chatArea.innerHTML = `<p style="margin: 5px 0; color: #ccc;">Welcome! Ask a question about the video.</p>`;

    // --- Input Area ---
    const inputArea = document.createElement("div");
    inputArea.style.cssText = "display: flex; border-top: 1px solid rgba(255, 255, 255, 0.2); flex-shrink: 0;";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Ask a question...";
    input.style.cssText = "flex: 1; padding: 12px; border: none; outline: none; background: transparent; color: white; font-size: 14px;";

    const sendBtn = document.createElement("button");
    sendBtn.innerText = "Send";
    sendBtn.style.cssText = `padding: 0 15px; border: none; background: ${YOUTUBE_RED}; color: white; cursor: pointer; font-weight: bold;`;

    const handleSend = () => {
      const msg = input.value.trim();
      if (msg) {
        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get("v");
        if (!videoId) {
          alert("Could not get YouTube video ID. Please make sure you are on a video page.");
          return;
        }

        const userMsg = document.createElement("p");
        userMsg.innerHTML = `<strong style="color: ${YOUTUBE_RED};">You:</strong> ${msg}`;
        userMsg.style.margin = "10px 0";
        chatArea.appendChild(userMsg);
        chatArea.scrollTop = chatArea.scrollHeight;
        input.value = "";

        const botMsg = document.createElement("p");
        botMsg.innerHTML = `<strong style="color: ${YOUTUBE_RED};">Bot:</strong> Thinking...`;
        botMsg.style.margin = "10px 0";
        chatArea.appendChild(botMsg);
        chatArea.scrollTop = chatArea.scrollHeight;

        fetch("http://127.0.0.1:8000/rag/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video_id: videoId, question: msg, chat_history: [] })
        })
        .then(res => res.ok ? res.json() : Promise.reject(`API Error: ${res.status}`))
        .then(data => {
          botMsg.innerHTML = `<strong style="color: ${YOUTUBE_RED};">Bot:</strong> ${data.answer || "No answer found."}`;

          // --- RE-INSERTED TIMESTAMP FILTERING LOGIC ---
          if (data.timestamps && data.timestamps.length > 0) {
              // 1. Sort timestamps chronologically
              const sortedTimestamps = data.timestamps.sort((a, b) => a.start - b.start);

              // 2. Filter them to be at least 10 minutes apart
              const filteredTimestamps = [];
              let lastAddedTime = -Infinity;
              const TEN_MINUTES_IN_SECONDS = 600;

              for (const ts of sortedTimestamps) {
                  if (ts.start - lastAddedTime >= TEN_MINUTES_IN_SECONDS) {
                      filteredTimestamps.push(ts);
                      lastAddedTime = ts.start;
                  }
              }

              // 3. Create buttons from the newly filtered list
              if (filteredTimestamps.length > 0) {
                  const tsContainer = document.createElement("div");
                  tsContainer.style.marginTop = "8px";

                  filteredTimestamps.forEach(ts => {
                      const btn = document.createElement("button");
                      btn.innerText = formatTime(ts.start);
                      btn.style.cssText = `margin: 4px 4px 0 0; padding: 4px 8px; font-size: 12px; cursor: pointer; border: 1px solid ${YOUTUBE_RED}; border-radius: 4px; background: rgba(255, 255, 255, 0.1); color: ${YOUTUBE_RED}; font-weight: bold; transition: background-color 0.2s;`;
                      btn.onmouseover = () => { btn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; };
                      btn.onmouseout = () => { btn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; };
                      btn.onclick = () => {
                          const player = document.querySelector("video.html5-main-video");
                          if (player) {
                              player.currentTime = ts.start;
                              player.play();
                          }
                      };
                      tsContainer.appendChild(btn);
                  });
                  botMsg.appendChild(tsContainer);
              }
          }
          // --- END OF CORRECTED LOGIC ---
          chatArea.scrollTop = chatArea.scrollHeight;
        })
        .catch(err => {
          botMsg.innerHTML = `<strong style="color: ${YOUTUBE_RED};">Bot:</strong> Error communicating with backend.`;
          console.error(err);
        });
      }
    };

    sendBtn.onclick = handleSend;
    input.onkeydown = (e) => { if (e.key === "Enter") handleSend(); };

    function formatTime(seconds) {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, "0")}`;
    }

    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);
    container.appendChild(header);
    container.appendChild(chatArea);
    container.appendChild(inputArea);

    const icon = document.createElement("div");
    icon.id = "youtube-ai-assistant-icon";
    icon.innerText = "💬";
    icon.style.cssText = `position: fixed; bottom: 20px; right: 20px; width: 50px; height: 50px; z-index: 9998; background: ${YOUTUBE_RED}; color: white; font-size: 28px; cursor: pointer; display: flex; justify-content: center; align-items: center; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3); transition: transform 0.2s;`;
    icon.onmouseover = () => { icon.style.transform = 'scale(1.1)'; };
    icon.onmouseout = () => { icon.style.transform = 'scale(1.0)'; };

    let isOpen = false;
    icon.addEventListener("click", () => {
      isOpen = !isOpen;
      container.style.display = isOpen ? "flex" : "none";
    });

    document.body.appendChild(container);
    document.body.appendChild(icon);
  });
})();