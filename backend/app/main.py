from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import re
import nltk
import requests
import json
import google.generativeai as genai
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from collections import Counter
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    # Fallback to hardcoded key if not in environment
    GEMINI_API_KEY = "AIzaSyBbo6hvvG1MZlhwXvAvjApU2nH0kRZ_fHo"
    print("Using fallback Gemini API key")

if GEMINI_API_KEY:
    print(f"Gemini API key loaded successfully: {GEMINI_API_KEY[:5]}...")
    genai.configure(api_key=GEMINI_API_KEY)
    # Use the correct model name from the supported list
    model = genai.GenerativeModel('gemini-1.5-pro')
else:
    print("Warning: GEMINI_API_KEY not found in environment variables")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Environment variables: {os.environ.keys()}")

# Download NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')
try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet')

app = FastAPI(title="AI Reading Assistant API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextRequest(BaseModel):
    text: str
    task: str  # 'simplify', 'define', 'context', or 'qa'
    question: Optional[str] = None

class WordRequest(BaseModel):
    word: str

class TextResponse(BaseModel):
    result: str
    confidence: float

class WordResponse(BaseModel):
    word: str
    definition: str
    examples: List[str]
    confidence: float

# Initialize lemmatizer
lemmatizer = WordNetLemmatizer()

def is_complex_word(word):
    # Consider a word complex if it's longer than 8 characters or contains multiple syllables
    return len(word) > 8 or len(re.findall(r'[aeiou]+', word.lower())) > 2

# Function to get word definitions from a free dictionary API
def get_word_definition(word):
    try:
        response = requests.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}")
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                meanings = data[0].get('meanings', [])
                if meanings:
                    definitions = []
                    examples = []
                    for meaning in meanings:
                        if 'definitions' in meaning and meaning['definitions']:
                            def_data = meaning['definitions'][0]
                            definitions.append(def_data['definition'])
                            if 'examples' in def_data:
                                examples.extend(def_data['examples'])
                    return {
                        'definition': definitions[0] if definitions else None,
                        'examples': examples[:2] if examples else []
                    }
        return None
    except Exception:
        return None

# Function to get related information from Wikipedia
def get_wikipedia_info(topic):
    try:
        # First, search for the topic
        search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={topic}&format=json"
        search_response = requests.get(search_url)
        search_data = search_response.json()
        
        if 'query' in search_data and 'search' in search_data['query'] and search_data['query']['search']:
            page_id = search_data['query']['search'][0]['pageid']
            
            # Then get the extract
            extract_url = f"https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids={page_id}&format=json"
            extract_response = requests.get(extract_url)
            extract_data = extract_response.json()
            
            if 'query' in extract_data and 'pages' in extract_data['query']:
                page = extract_data['query']['pages'][str(page_id)]
                if 'extract' in page:
                    return page['extract']
        return None
    except Exception:
        return None

def use_gemini_for_task(text, task, question=None):
    """Use Gemini AI for advanced text processing tasks"""
    if not GEMINI_API_KEY:
        return None, 0.5
    
    try:
        if task == "define":
            prompt = f"""
            Identify the 5 most complex or important terms in this text and provide clear definitions for each.
            For each term, also provide a brief example of how it's used in context.
            
            Text: {text}
            """
        elif task == "context":
            prompt = f"""
            Analyze this text and provide:
            1. A brief summary of the main topic
            2. The complexity level (simple, moderate, complex)
            3. Key concepts or themes
            4. Additional context that would help understand the text better
            
            Text: {text}
            """
        elif task == "qa" and question:
            prompt = f"""
            Answer the following question about this text. 
            Provide a direct answer and additional context that might be helpful.
            
            Text: {text}
            
            Question: {question}
            """
        else:
            return None, 0.5
        
        # Use the correct model name
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = model.generate_content(prompt)
        if response and response.text:
            return response.text, 0.9
        return None, 0.5
    except Exception as e:
        print(f"Gemini API error: {str(e)}")
        return None, 0.5

def simplify_text(text):
    """Simplify an entire text using Gemini AI"""
    if not GEMINI_API_KEY:
        return "Gemini API key not configured. Please set up your API key in the .env file.", 0.0
    
    try:
        prompt = f"""Simplify the following text to make it easier to understand while preserving its full meaning, nuance, and depth. Break down complex sentences into clearer ones, and define any difficult or technical terms as needed. Avoid oversimplifying ideas — aim for clarity without losing richness.

Text to simplify: {text}

Provide only the simplified text without any explanations or notes."""
        
        # Use the correct model name
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = model.generate_content(prompt)
        if response and response.text:
            # Clean up the response
            result = response.text.strip()
            # Remove any markdown formatting or extra whitespace
            result = re.sub(r'```.*?```', '', result, flags=re.DOTALL)
            result = re.sub(r'\n\s*\n', '\n', result)
            return result.strip(), 0.9
        return "Failed to generate simplified text.", 0.5
    except Exception as e:
        print(f"Error using Gemini for simplification: {str(e)}")
        return f"Error during simplification: {str(e)}", 0.5

@app.get("/")
async def root():
    return {"message": "Welcome to AI Reading Assistant API", "gemini_available": bool(GEMINI_API_KEY)}

@app.post("/define-word", response_model=WordResponse)
async def define_word(request: WordRequest):
    word = request.word.lower()
    
    # Try to use Gemini for definition first
    if GEMINI_API_KEY:
        prompt = f"Provide a clear definition and two example sentences for the word: {word}"
        try:
            response = model.generate_content(prompt)
            if response and response.text:
                # Parse the response to extract definition and examples
                lines = response.text.split('\n')
                definition = lines[0] if lines else None
                examples = [line for line in lines[1:] if line.strip() and not line.startswith('Definition:')]
                
                if definition and examples:
                    return WordResponse(
                        word=word,
                        definition=definition,
                        examples=examples[:2],
                        confidence=0.9
                    )
        except Exception:
            pass
    
    # Fallback to dictionary API
    definition_data = get_word_definition(word)
    
    if definition_data:
        return WordResponse(
            word=word,
            definition=definition_data['definition'],
            examples=definition_data['examples'],
            confidence=0.8
        )
    else:
        raise HTTPException(status_code=404, detail="Definition not found")

@app.post("/analyze", response_model=TextResponse)
async def analyze_text(request: TextRequest):
    try:
        # Try to use Gemini for all tasks first
        if GEMINI_API_KEY:
            try:
                result, confidence = use_gemini_for_task(
                    request.text, 
                    request.task, 
                    request.question if request.task == "qa" else None
                )
                
                if result and confidence > 0.7:
                    return TextResponse(result=result, confidence=confidence)
            except Exception as e:
                print(f"Error using Gemini for {request.task}: {str(e)}")
        
        # Fallback to NLTK-based methods if Gemini fails or isn't available
        if request.task == "simplify":
            # Use the improved simplify_text function
            result, confidence = simplify_text(request.text)
            return TextResponse(result=result, confidence=confidence)
        
        elif request.task == "define":
            # Enhanced term definition
            words = word_tokenize(request.text)
            stop_words = set(stopwords.words('english'))
            
            # Filter out common words and short words
            terms = [word for word in words if word.lower() not in stop_words and is_complex_word(word)]
            
            # Get unique terms
            unique_terms = list(set(terms))
            
            if not unique_terms:
                return TextResponse(result="No complex terms found in the text.", confidence=0.5)
            
            # Get definitions for terms
            term_definitions = []
            for term in unique_terms[:5]:  # Limit to first 5 terms
                definition_data = get_word_definition(term)
                if definition_data:
                    term_definitions.append(f"{term}: {definition_data['definition']}")
                    if definition_data['examples']:
                        term_definitions.append(f"Example: {definition_data['examples'][0]}")
            
            result = "\n\n".join(term_definitions)
            return TextResponse(result=result, confidence=0.7)
        
        elif request.task == "context":
            # Enhanced context analysis
            sentences = sent_tokenize(request.text)
            
            # Count sentences to estimate complexity
            complexity = "simple" if len(sentences) < 5 else "moderate" if len(sentences) < 10 else "complex"
            
            # Identify potential topics based on word frequency
            words = word_tokenize(request.text.lower())
            stop_words = set(stopwords.words('english'))
            filtered_words = [word for word in words if word not in stop_words and word.isalnum()]
            
            if filtered_words:
                word_counts = Counter(filtered_words)
                top_topics = [word for word, _ in word_counts.most_common(3)]
                
                # Get additional context from Wikipedia
                wiki_info = []
                for topic in top_topics:
                    info = get_wikipedia_info(topic)
                    if info:
                        wiki_info.append(f"About {topic}: {info[:200]}...")
                
                topics = ", ".join(top_topics)
                result = f"This appears to be a {complexity} text about {topics}."
                
                if wiki_info:
                    result += "\n\nAdditional context:\n" + "\n".join(wiki_info)
            else:
                result = "This appears to be a general text."
            
            return TextResponse(result=result, confidence=0.7)
        
        elif request.task == "qa":
            if not request.question:
                raise HTTPException(status_code=400, detail="Question is required for QA task")
            
            # Enhanced question answering
            question_words = word_tokenize(request.question.lower())
            stop_words = set(stopwords.words('english'))
            
            # Extract key terms from the question
            key_terms = [word for word in question_words if word not in stop_words and len(word) > 3]
            
            # Find sentences that contain question words
            sentences = sent_tokenize(request.text)
            relevant_sentences = []
            
            for sentence in sentences:
                sentence_lower = sentence.lower()
                if any(term in sentence_lower for term in key_terms):
                    relevant_sentences.append(sentence)
            
            if relevant_sentences:
                # Get additional information from Wikipedia for key terms
                wiki_info = []
                for term in key_terms[:2]:  # Limit to first 2 terms
                    info = get_wikipedia_info(term)
                    if info:
                        wiki_info.append(f"About {term}: {info[:150]}...")
                
                result = "Answer: " + " ".join(relevant_sentences[:2])
                
                if wiki_info:
                    result += "\n\nAdditional information:\n" + "\n".join(wiki_info)
            else:
                result = "I couldn't find a specific answer to your question in the text."
            
            return TextResponse(result=result, confidence=0.6)
        
        else:
            raise HTTPException(status_code=400, detail="Invalid task specified")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 