# import os
# from dotenv import load_dotenv

# # Load variables from .env file
# load_dotenv()

# class Settings:
#     # OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
#     BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
#     BACKEND_PORT = int(os.getenv("BACKEND_PORT", 8000))
#     CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")  # e.g., "http://localhost:3000,http://localhost:8080"
#     CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
#     YOUTUBE_TRANSCRIPTS_PATH = os.getenv("YOUTUBE_TRANSCRIPTS_PATH", "./transcripts")

# settings = Settings()
