from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import joblib

app = FastAPI()

# CORS 허용 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 모델 로드
model = joblib.load("svc_model.joblib")
vectorizer = joblib.load("vectorizer.joblib")

# 메모리에 저장하는 차단 작성자 리스트
blocked_authors = set()


# ✅ 입력 모델
class Comment(BaseModel):
    text: str
    author: str

class BlockRequest(BaseModel):
    user_id: str
    author: str


# ✅ 감정 분석 API
@app.post("/analyze")
def analyze(comment: Comment):
    X = vectorizer.transform([comment.text])
    pred = model.predict(X)[0]
    sentiment = "inappropriate" if pred == 1 else "normal"

    # if sentiment == "inappropriate":
    #     blocked_authors.add(comment.author)

    return {"sentiment": sentiment}


# ✅ 차단 요청 API
@app.post("/block")
def block_comment(data: BlockRequest):
    print(f"[차단 요청] 사용자: {data.user_id}, 작성자: {data.author}")
    blocked_authors.add(data.author)
    return {"status": "success"}


# ✅ 차단 해제 API
@app.post("/unblock")
def unblock_author(data: BlockRequest):
    if data.author in blocked_authors:
        blocked_authors.remove(data.author)
        print(f"[해제 요청] 사용자: {data.user_id}, 작성자: {data.author}")
        return {"status": "unblocked"}
    else:
        raise HTTPException(status_code=404, detail="Author not in block list")


# ✅ 차단 목록 조회 API
@app.get("/blocked_authors")
def get_blocked_authors():
    try:
        return JSONResponse(content=list(blocked_authors))
    except Exception as e:
        print(f"[❌ blocked_authors] 오류 발생: {str(e)}")
        return JSONResponse(content=[])
