from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import pandas as pd
import io
from pypdf import PdfReader 
from docx import Document   


nltk.download('vader_lexicon', quiet=True)
nltk.download('punkt', quiet=True) 
nltk.download('punkt_tab', quiet=True)

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sia = SentimentIntensityAnalyzer()

class Review(BaseModel):
    text: str

# --- Functions ---

def analyze_text(text):
    scores = sia.polarity_scores(str(text))
    sentiment = "Neutral"
    if scores['compound'] > 0.05:
        sentiment = "Positive"
    elif scores['compound'] < -0.05:
        sentiment = "Negative"
    return sentiment, scores['compound']

# --- Routes ---

@app.post("/analyze")
def analyze_sentiment(review: Review):
    sentiment, score = analyze_text(review.text)
    return {
        "sentiment": sentiment,
        "score": score,
        "detailed_scores": sia.polarity_scores(review.text)
    }

@app.post("/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    contents = await file.read()
    results = []
    
    
    text_data_list = [] #

    try:
        
        if file.filename.endswith(('.xlsx', '.csv')):
            if file.filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(contents))
            else:
                df = pd.read_excel(io.BytesIO(contents))
            
            
            if "Review" in df.columns:
                text_data_list = df['Review'].dropna().astype(str).tolist()
            else:
                return {"error": "Excel/CSV file must contain a 'Review' column"}

        
        elif file.filename.endswith('.pdf'):
            reader = PdfReader(io.BytesIO(contents))
            full_text = ""
            for page in reader.pages:
                full_text += page.extract_text() + "\n"
            
            text_data_list = nltk.sent_tokenize(full_text)

       
        elif file.filename.endswith('.docx'):
            doc = Document(io.BytesIO(contents))
            full_text = ""
            for para in doc.paragraphs:
                full_text += para.text + "\n"
            
            text_data_list = nltk.sent_tokenize(full_text)

        else:
            return {"error": "Unsupported file type. Use .csv, .xlsx, .pdf, or .docx"}

    except Exception as e:
        return {"error": f"Error reading file: {str(e)}"}

    
    stats = {"Positive": 0, "Negative": 0, "Neutral": 0}

    for i, text in enumerate(text_data_list):
        if len(text.strip()) < 3: continue 
        
        sentiment, score = analyze_text(text)
        stats[sentiment] += 1
        
        results.append({
            "id": i + 1,
            "text": text,
            "sentiment": sentiment,
            "score": score
        })

    return {
        "filename": file.filename,
        "total_reviews": len(results),
        "chart_data": {
            "pos": stats["Positive"],
            "neg": stats["Negative"],
            "neu": stats["Neutral"]
        },
        "results": results,
        
        "detailed_scores": { 
            "pos": stats["Positive"] / len(results) if results else 0, 
            "neg": stats["Negative"] / len(results) if results else 0, 
            "neu": stats["Neutral"] / len(results) if results else 0 
        }
    }