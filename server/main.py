from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
import pandas as pd
import io

nltk.download('vader_lexicon', quiet=True)

app = FastAPI()
sia = SentimentIntensityAnalyzer()

class Review(BaseModel):
    text: str

@app.get("/")
def read_root():
    return {"message": "BizMind AI Server is running."}

@app.post("/analyze")
def analyze_sentiment(review: Review):
    
    scores = sia.polarity_scores(review.text)
    compound_score = scores['compound']

    sentiment = "Neutral"
    if compound_score >= 0.05:
        sentiment = "Positive"
    elif compound_score <= -0.05:
        sentiment = "Negative"

    return {
        "sentiment": sentiment,
        "score": compound_score,
        "detailed_scores": scores

    }

@app.post("/analyze_file")
async def analyze_file(file: UploadFile = File(...)):

    contents = await file.read()

    if file.filename.endswith('.csv'):
        df = pd.read_csv(io.BytesIO(contents))
    elif file.filename.endswith('.xlsx'):
        df = pd.read_excel(io.BytesIO(contents))
    else:
        return {"error": "Unsupported file format. Please upload a CSV or EExcel file."}
    
    results = []

    for index, row in df.iterrows():
        text = str(row.get('Review', ''))
        
        scores = sia.polarity_scores(text)
        sentiment = "Neutral"
        if scores['compound'] >= 0.05:
            sentiment = "Positive"
        elif scores['compound'] <= -0.05:
            sentiment = "Negative"

        results.append({
            "id": index,
            "text": text,
            "sentiment": sentiment,
        })

    return {"results": results}
