from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import spacy
from transformers import pipeline

app = FastAPI(title="AI Reading Assistant API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load NLP models
try:
    nlp = spacy.load("en_core_web_sm")
    summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
except Exception as e:
    print(f"Error loading models: {e}")
    nlp = None
    summarizer = None

class TextRequest(BaseModel):
    text: str
    task: str  # 'simplify', 'define', 'context', or 'qa'
    question: Optional[str] = None

class TextResponse(BaseModel):
    result: str
    confidence: float

@app.get("/")
async def root():
    return {"message": "Welcome to AI Reading Assistant API"}

@app.post("/analyze", response_model=TextResponse)
async def analyze_text(request: TextRequest):
    if not nlp or not summarizer:
        raise HTTPException(status_code=500, detail="NLP models not loaded")
    
    try:
        if request.task == "simplify":
            # Use BART for text simplification
            summary = summarizer(request.text, max_length=130, min_length=30, do_sample=False)
            return TextResponse(result=summary[0]['summary_text'], confidence=0.8)
        
        elif request.task == "define":
            # Extract named entities and key terms
            doc = nlp(request.text)
            entities = [ent.text for ent in doc.ents]
            return TextResponse(
                result=f"Key terms found: {', '.join(entities)}",
                confidence=0.7
            )
        
        elif request.task == "context":
            # Provide basic context analysis
            doc = nlp(request.text)
            return TextResponse(
                result="Context analysis feature coming soon",
                confidence=0.6
            )
        
        elif request.task == "qa":
            if not request.question:
                raise HTTPException(status_code=400, detail="Question is required for QA task")
            return TextResponse(
                result="Q&A feature coming soon",
                confidence=0.6
            )
        
        else:
            raise HTTPException(status_code=400, detail="Invalid task specified")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 