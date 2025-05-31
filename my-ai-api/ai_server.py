from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os
import joblib
from fastapi import Query

load_dotenv()

app = FastAPI()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))



# CORS 허용 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 모델 로드
#model = joblib.load("svc_model.joblib")
#vectorizer = joblib.load("vectorizer.joblib")

# 메모리에 저장하는 차단 작성자 리스트
blocked_authors = set()


# ✅ 입력 모델
class Comment(BaseModel):
    text: str
    author: str

class BlockRequest(BaseModel):
    user_id: str
    author: str

class CommentRequest(BaseModel):
    comment: str


# ✅ 감정 분석 API
# @app.post("/analyze")
# def analyze(comment: Comment):
#     X = vectorizer.transform([comment.text])
#     pred = model.predict(X)[0]
#     sentiment = "inappropriate" if pred == 1 else "normal"

#     # if sentiment == "inappropriate":
#     #     blocked_authors.add(comment.author)

#     return {"sentiment": sentiment}


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



@app.post("/check_comment")
async def check_comment(request: Comment):
    try:
        def check_profanity(content: str) -> str:
            response = client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "당신은 한국어 비속어/욕설/은어/변형 표현을 판별하는 AI입니다. "
                            "오직 inappropriate 또는 normal 중 하나로만 답해주세요. "
                            "다른 말은 절대 하지 마세요."
                        )
                    },
                    {
                        "role": "user",
                        "content": f"\"{content}\" 이 문장에 비속어가 포함되어 있나요?"
                    }
                ],
                max_tokens=20,
                temperature=0
            )
            return response.choices[0].message.content.strip().lower()

        # 각각 판별
        text_result = check_profanity(request.text)
        author_result = check_profanity(request.author)

        # 하나라도 inappropriate이면 전체 결과를 inappropriate으로
        final_result = "inappropriate" if "inappropriate" in [text_result, author_result] else "normal"

        return {"sentiment": final_result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai_server:app", host="0.0.0.0", port=8080)

