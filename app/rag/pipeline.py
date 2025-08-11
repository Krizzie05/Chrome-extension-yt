import ollama
import time
import os
import json
from youtube_transcript_api import YouTubeTranscriptApi
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.documents import Document

CACHE_DIR = "faiss_cache"
os.makedirs(CACHE_DIR, exist_ok=True)



# Transcript Load WITH TIMESTAMPS
def get_video_transcript(video_id: str):
    """
    Returns transcript chunks with text, start time, and duration.
    """
    try:
        transcript_list = YouTubeTranscriptApi().fetch(video_id, languages=["en"])
        return transcript_list  # list of dicts
    except Exception as e:
        print(f"Could not retrieve transcript for video ID {video_id}: {e}")
        return []



# Manual Chunking with Start Time Preservation
def split_text_with_metadata(transcript_list):
    """
    Groups transcript lines into chunks while keeping the start time
    of the first line in each chunk.
    """
    docs = []
    current_text = []
    current_start = None
    char_count = 0
    chunk_size = 800
    chunk_overlap = 100

    for entry in transcript_list:
        text = entry.text
        start = entry.start

        if current_start is None:
            current_start = start

        if char_count + len(text) <= chunk_size:
            current_text.append(text)
            char_count += len(text)
        else:
            docs.append(Document(
                page_content=" ".join(current_text),
                metadata={"start": current_start}
            ))

            
            overlap_text = " ".join(current_text)[-chunk_overlap:]
            current_text = [overlap_text, text]
            current_start = start
            char_count = len(overlap_text) + len(text)

    if current_text:
        docs.append(Document(
            page_content=" ".join(current_text),
            metadata={"start": current_start}
        ))

    return docs



# Embedding + FAISS Caching
def get_vector_store(video_id: str, chunks):
    index_path = os.path.join(CACHE_DIR, f"{video_id}_faiss")
    embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    if os.path.exists(index_path):
        print(f"[Cache] Loading FAISS index for video {video_id}...")
        return FAISS.load_local(index_path, embedding_model, allow_dangerous_deserialization=True)

    print(f"[Build] Creating FAISS index for video {video_id}...")
    vector_store = FAISS.from_documents(chunks, embedding_model)
    vector_store.save_local(index_path)
    return vector_store



# Retriever
def get_retriever(vector_store):
    return vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 3})



# Prompt Template
prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a helpful assistant.
ONLY use the following transcript context to answer.
If the context is insufficient, say "I don't know".
Transcript context:
{context}"""),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}"),
])



# Local Ollama Call (streaming)
def call_local_ollama(prompt_text: str) -> str:
    full_response = []
    for chunk in ollama.chat(
        model="mistral:7b",
        messages=[{"role": "user", "content": prompt_text}],
        options={"temperature": 0.2},
        stream=True
    ):
        if "message" in chunk and "content" in chunk["message"]:
            text_part = chunk["message"]["content"]
            # print(text_part, end="", flush=True)
            full_response.append(text_part)
    # print()
    return "".join(full_response)



# RAG Chain with Multiple Timestamps
def build_rag_chain(retriever):
    def rag_pipeline(input_dict):
        retrieved_docs = retriever.invoke(input_dict["question"])

        if not retrieved_docs:
            return {"answer": "I don't know.", "timestamps": []}

        timestamps = [
            {"start": doc.metadata["start"], "text": doc.page_content[:120] + "..."}
            for doc in retrieved_docs if "start" in doc.metadata
        ]
        timestamps = sorted(timestamps, key=lambda x: x["start"])

        context_text = "\n\n".join(doc.page_content for doc in retrieved_docs)
        chat_hist = input_dict["chat_history"]

        prompt_value = prompt.invoke({
            "context": context_text,
            "chat_history": chat_hist,
            "question": input_dict["question"]
        })

        prompt_text = "".join([msg.content for msg in prompt_value.to_messages()])
        answer = call_local_ollama(prompt_text)

        return {
            "answer": answer,
            "timestamps": timestamps
        }

    return rag_pipeline



# Main RAG Pipeline Wrapper
def run_rag_pipeline(video_id: str, user_question: str, chat_history: list):
    transcript_list = get_video_transcript(video_id)
    if not transcript_list:
        return {"answer": "Transcript not available for this video.", "timestamps": []}

    chunks = split_text_with_metadata(transcript_list)
    vector_store = get_vector_store(video_id, chunks)
    retriever = get_retriever(vector_store)
    chain = build_rag_chain(retriever)

    return chain({
        "question": user_question,
        "chat_history": chat_history
    })



# Test
# if __name__ == "__main__":
#     video_id = "Gfr50f6ZBvo"
#     result = run_rag_pipeline(video_id, "who is discussed about DeepMind?", [])
#     print("\n--- FINAL RESULT ---")
#     print(json.dumps(result, indent=2))
