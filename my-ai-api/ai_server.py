from fastapi import FastAPI
from pydantic import BaseModel
import joblib

# 모델 및 벡터라이저 로드
model = joblib.load("svc_model.joblib")
vectorizer = joblib.load("vectorizer.joblib")

app = FastAPI()

# 입력 형식
class Comment(BaseModel):
    text: str

@app.post("/analyze")
def analyze(comment: Comment):
    X = vectorizer.transform([comment.text])
    pred = model.predict(X)[0]
    sentiment = "inappropriate" if pred == 1 else "normal"
    return {"sentiment": sentiment}
