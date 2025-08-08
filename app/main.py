from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import traceback
from app.rag.pipeline import run_rag_pipeline  # Import your updated RAG function

# ---------- FastAPI Setup ----------
app = FastAPI(title="YouTube RAG API", version="1.0")

# Allow Chrome extension calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change to ["chrome-extension://<your-extension-id>"] for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Request Model ----------
class RAGRequest(BaseModel):
    video_id: str
    question: str
    chat_history: list = []

# ---------- Routes ----------
@app.post("/rag/query")
async def rag_query(req: RAGRequest):
    """
    Handle RAG requests from the Chrome extension.
    Returns both the answer and relevant timestamps for clickable jumps.
    """
    try:
        result = run_rag_pipeline(
            video_id=req.video_id,
            user_question=req.question,
            chat_history=req.chat_history
        )

        # Ensure structure
        return {
            "answer": result.get("answer", "No answer generated."),
            "timestamps": result.get("timestamps", [])
        }

    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

@app.get("/")
async def root():
    return {"message": "YouTube RAG API is running"}

# ---------- Start Server ----------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
