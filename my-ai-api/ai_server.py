from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib

app = FastAPI()

# CORS 허용 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 배포 시 여기를 제한 가능
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 모델 로드
model = joblib.load("svc_model.joblib")
vectorizer = joblib.load("vectorizer.joblib")

# 입력 형식
class Comment(BaseModel):
    text: str

@app.post("/analyze")
def analyze(comment: Comment):
    X = vectorizer.transform([comment.text])
    pred = model.predict(X)[0]
    sentiment = "inappropriate" if pred == 1 else "normal"
    return {"sentiment": sentiment}
