import asyncio
import os
from pathlib import Path
from fastapi import FastAPI, Request, File, UploadFile
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from models_tree import analyze_tree

load_dotenv()
app = FastAPI()

OS_DIR = Path(__file__).parent
OUTPUT_DIR = OS_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)
app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")

@app.get("/")
async def get_index():
    with open("index.html", encoding="utf-8") as f:
        return HTMLResponse(f.read())

@app.get("/style.css")
async def get_css():
    return FileResponse("style.css")

@app.get("/app.js")
async def get_js():
    return FileResponse("app.js")

@app.post("/analyze-tree")
async def analyze_tree_endpoint(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        mime_type = image.content_type or "image/jpeg"
        
        gemini_keys_str = os.getenv("GEMINI_API_KEYS", os.getenv("GEMINI_API_KEY", ""))
        gemini_keys = [k.strip() for k in gemini_keys_str.split(",") if k.strip()]
        
        result = await analyze_tree(contents, mime_type, gemini_keys)
        return JSONResponse(content=result)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
