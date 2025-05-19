import os
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# OAuth 2.0 인증 정보
SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl']

def get_authenticated_service():
    credentials = None
    
    # 이전에 저장된 토큰 불러오기
    if os.path.exists('token.json'):
        credentials = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # 유효한 인증 정보가 없는 경우 새로 인증
    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'client_secrets.json', SCOPES)
            credentials = flow.run_local_server(port=0)
        
        # 토큰 저장
        with open('token.json', 'w') as token:
            token.write(credentials.to_json())
    
    return build('youtube', 'v3', credentials=credentials)

def get_video_comments(youtube, video_id, max_results=100):
    comments = []
    
    # 댓글 스레드 가져오기
    request = youtube.commentThreads().list(
        part='snippet',
        videoId=video_id,
        maxResults=max_results,
        textFormat='plainText'
    )
    
    while request:
        response = request.execute()
        
        for item in response['items']:
            comment = item['snippet']['topLevelComment']['snippet']
            comments.append({
                'author': comment['authorDisplayName'],
                'text': comment['textDisplay'],
                'likes': comment['likeCount'],
                'published_at': comment['publishedAt']
            })
        
        # 다음 페이지가 있는 경우
        request = youtube.commentThreads().list_next(request, response)
        
        if len(comments) >= max_results:
            break
    
    return comments

def main():
    # YouTube API 서비스 객체 생성
    youtube = get_authenticated_service()
    
    # 분석하고자 하는 동영상 ID
    video_id = input("분석할 YouTube 동영상 ID를 입력하세요: ")
    
    try:
        # 댓글 가져오기
        comments = get_video_comments(youtube, video_id)
        
        # 결과 출력
        print(f"\n총 {len(comments)}개의 댓글을 가져왔습니다.\n")
        for i, comment in enumerate(comments, 1):
            print(f"댓글 #{i}")
            print(f"작성자: {comment['author']}")
            print(f"내용: {comment['text']}")
            print(f"좋아요 수: {comment['likes']}")
            print(f"작성일: {comment['published_at']}")
            print("-" * 50)
            
    except Exception as e:
        print(f"오류가 발생했습니다: {str(e)}")

if __name__ == '__main__':
    main()
