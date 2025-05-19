// YouTube Data API를 사용하여 댓글 수집
async function collectComments(videoId) {
  try {
    const apiKey = 'AIzaSyC_iw9IS7qmhChzKTqcz37JcmCaAO1Rw2o';
    let allComments = [];
    let nextPageToken = null;
    let totalComments = 0;

    do {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?` +
        `part=snippet&` +
        `videoId=${videoId}&` +
        `maxResults=100&` +
        `pageToken=${nextPageToken || ''}&` +
        `key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error('댓글을 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      const comments = data.items.map(item => item.snippet.topLevelComment.snippet.textDisplay);
      allComments = allComments.concat(comments);
      
      nextPageToken = data.nextPageToken;
      totalComments = data.pageInfo.totalResults;

      // API 할당량 제한을 고려하여 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    } while (nextPageToken && allComments.length < totalComments);

    if (allComments.length === 0) {
      throw new Error('댓글을 찾을 수 없습니다. 댓글이 비활성화되었거나 로드되지 않았을 수 있습니다.');
    }

    return allComments;
  } catch (error) {
    console.error('댓글 수집 중 오류:', error);
    throw error;
  }
}

// 감정 분석 설정
const sentimentConfig = {
  // 현재는 기본 감정 분석 사용
  useAI: false,
  // AI 모델 엔드포인트 (나중에 설정)
  aiEndpoint: 'https://your-ai-endpoint.com/analyze',
  // 기본 감정 분석용 단어 목록
  positiveWords: ['좋아요', '최고', '감사', '좋은', '재미', '훌륭', '사랑', '응원', '감동', '행복'],
  negativeWords: ['싫어요', '최악', '실망', '나쁜', '지루', '별로', '불만', '화나', '짜증', '실망']
};

// 기본 감정 분석 함수
function analyzeSentimentBasic(comment) {
  let score = 0;
  sentimentConfig.positiveWords.forEach(word => {
    if (comment.includes(word)) score++;
  });
  sentimentConfig.negativeWords.forEach(word => {
    if (comment.includes(word)) score--;
  });
  
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

// AI 기반 감정 분석 함수
async function analyzeSentimentAI(comment) {
  try {
    const response = await fetch(sentimentConfig.aiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: comment })
    });

    if (!response.ok) {
      throw new Error('AI 분석 실패');
    }

    const result = await response.json();
    return result.sentiment; // 'positive', 'negative', 'neutral' 중 하나 반환
  } catch (error) {
    console.error('AI 감정 분석 중 오류:', error);
    // AI 분석 실패 시 기본 감정 분석으로 폴백
    return analyzeSentimentBasic(comment);
  }
}

// 통합 감정 분석 함수
async function analyzeSentiment(comment) {
  if (sentimentConfig.useAI) {
    return await analyzeSentimentAI(comment);
  }
  return analyzeSentimentBasic(comment);
}

// 비디오 ID 추출 함수 개선
function getVideoId(url) {
  try {
    // URL 객체 생성
    const urlObj = new URL(url);
    
    // 1. 일반적인 YouTube URL 패턴 (youtube.com/watch?v=VIDEO_ID)
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      const searchParams = new URLSearchParams(urlObj.search);
      const videoId = searchParams.get('v');
      if (videoId && videoId.length === 11) {
        return videoId;
      }
    }
    
    // 2. 단축 URL 패턴 (youtu.be/VIDEO_ID)
    if (urlObj.hostname === 'youtu.be') {
      const videoId = urlObj.pathname.slice(1); // 첫 번째 '/' 제거
      if (videoId && videoId.length === 11) {
        return videoId;
      }
    }
    
    // 3. 임베드 URL 패턴 (youtube.com/embed/VIDEO_ID)
    if (urlObj.pathname.startsWith('/embed/')) {
      const videoId = urlObj.pathname.split('/')[2];
      if (videoId && videoId.length === 11) {
        return videoId;
      }
    }

    // 4. URL에서 직접 추출 시도
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtube\.com\/v\/|youtube\.com\/watch\?.*&v=)([^&\n?#]+)/,
      /(?:youtube\.com\/watch\?.*v=)([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] && match[1].length === 11) {
        return match[1];
      }
    }

    return null;
  } catch (error) {
    console.error('비디오 ID 추출 중 오류:', error);
    return null;
  }
}

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeComments') {
    const videoId = getVideoId(request.url || window.location.href);
    
    if (!videoId) {
      sendResponse({ success: false, error: '올바른 YouTube URL이 아닙니다.' });
      return true;
    }

    (async () => {
      try {
        const comments = await collectComments(videoId);
        const analysis = {
          totalComments: comments.length,
          positiveComments: 0,
          negativeComments: 0,
          neutralComments: 0,
          comments: []
        };
        
        // 비동기 감정 분석을 위해 Promise.all 사용
        const sentiments = await Promise.all(
          comments.map(async comment => {
            const sentiment = await analyzeSentiment(comment);
            analysis[`${sentiment}Comments`]++;
            return { text: comment, sentiment };
          })
        );
        
        analysis.comments = sentiments;
        sendResponse({ success: true, ...analysis });
      } catch (error) {
        console.error('댓글 분석 중 오류:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // 비동기 응답을 위해 true 반환
  }
}); 