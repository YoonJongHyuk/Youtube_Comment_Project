// Cloud Run API 주소
const API_BASE = "https://my-ai-api-514551150962.asia-northeast3.run.app";
const BLOCKED_AUTHORS_KEY = 'blocked_authors';

// 기본 필터 키워드
// const sentimentConfig = {
//   useAI: true,
//   inappropriateWords: ['욕설', '비방', '혐오', '차별', '성적', '폭력', '스팸', '광고', '도박', '사기']
// };

// ✅ 서버에서 차단된 작성자 목록 가져오기
async function getBlockedAuthorsFromServer() {
  try {
    const response = await fetch(`${API_BASE}/blocked_authors`);
    if (!response.ok) {
      console.warn("[🚫 blocked_authors] 상태코드:", response.status);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error("[❌ blocked_authors] 요청 실패:", error);
    return [];
  }
}

// ✅ 차단된 작성자 목록 기준 댓글 숨기기
async function observeAndFilterComments() {
  const observer = new MutationObserver(async () => {
    const blocked = await getBlockedAuthorsFromServer();
    hideBlockedComments(blocked);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  const initial = await getBlockedAuthorsFromServer();
  hideBlockedComments(initial);
}

// ✅ refresh 요청 처리
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'refreshComments') {
    getBlockedAuthorsFromServer().then(hideBlockedComments);
  }
});

// 차단 목록 저장 (로컬 백업용)
async function saveBlockedAuthorsToStorage(authors) {
  try {
    await chrome.storage.sync.set({ [BLOCKED_AUTHORS_KEY]: authors });
    console.log("[✅ storage] 차단 목록 저장 완료");
  } catch (error) {
    console.error("[❌ storage] 쓰기 실패:", error);
  }
}

// 댓글 작성자 추출
function getCommentAuthorFromElement(el) {
  const authorElement = el.querySelector('#author-text');
  return authorElement ? authorElement.textContent.trim() : null;
}

// 댓글 DOM에서 차단 적용
function hideBlockedComments(blockedAuthors) {
  const comments = document.querySelectorAll("ytd-comment-thread-renderer");
  comments.forEach(el => {
    const author = getCommentAuthorFromElement(el);
    if (author && blockedAuthors.includes(author)) {
      el.style.display = "none";
      console.log(`🙈 숨김: ${author}`);
    } else {
      el.style.display = "";
    }
  });
}

// 기본 감정 분석
function analyzeSentimentBasic(text) {
  const badWords = ['욕설', '비방', '혐오', '차별', '성적', '폭력', '스팸', '광고', '도박', '사기'];
  return badWords.some(word => text.includes(word)) ? 'inappropriate' : 'normal';
}




// // AI 감정 분석
// async function analyzeSentimentAI(comment) {
//   const { text, author } = comment;
//   if (!author || typeof author !== "string" || author.trim() === "") {
//     console.warn("❌ 유효하지 않은 author. 기본 분석으로 대체:", author);
//     return analyzeSentimentBasic(text);
//   }

//   try {
//     const response = await fetch(`${API_BASE}/analyze`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ text, author })
//     });

//     if (!response.ok) {
//       console.warn(`[🚫 analyze] 상태코드: ${response.status}`);
//       return analyzeSentimentBasic(text);
//     }

//     const result = await response.json();
//     return result.sentiment;
//   } catch (error) {
//     console.error("[❌ analyze] 요청 실패:", error);
//     return analyzeSentimentBasic(text);
//   }
// }

// // 분석 선택자
// async function analyzeSentiment(comment) {
//   return sentimentConfig.useAI
//     ? await analyzeSentimentAI(comment)
//     : analyzeSentimentBasic(comment.text);
// }

// GPT 기반 감정 분석
async function analyzeSentiment(comment) {
  const { text, author } = comment;
  if (!author || typeof author !== "string" || author.trim() === "") {
    console.warn("❌ 유효하지 않은 author. 기본 분석으로 대체:", author);
    //console.warn("text:", text);
    //console.warn("author:", text);
    return analyzeSentimentBasic(text);
  }

  try {
    const response = await fetch(`${API_BASE}/check_comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, author })
    });

    if (!response.ok) {
      console.warn(`[🚫 check_comment] 상태코드: ${response.status}`);
      return analyzeSentimentBasic(text);
    }

    const result = await response.json();
    return result.sentiment;
  } catch (error) {
    console.error("[❌ check_comment] 요청 실패:", error);
    return analyzeSentimentBasic(text);
  }
}

// YouTube API로 댓글 수집
async function collectComments(videoId) {
  const apiKey = 'AIzaSyBbwdNb4lLNZG0WaT_ORv_S_gTmQu0x6jg';
  let allComments = [];
  let nextPageToken = null;

  do {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&pageToken=${nextPageToken || ''}&key=${apiKey}`
    );

    if (!response.ok) throw new Error('댓글 수집 실패');

    const data = await response.json();
    const comments = data.items.map(item => ({
      text: item.snippet.topLevelComment.snippet.textDisplay,
      author: item.snippet.topLevelComment.snippet.authorDisplayName,
      id: item.snippet.topLevelComment.id
    }));

    allComments = allComments.concat(comments);
    nextPageToken = data.nextPageToken;
    await new Promise(res => setTimeout(res, 1000));
  } while (nextPageToken);

  return allComments;
}

// 유튜브 URL에서 videoId 추출
function getVideoId(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      // 일반 watch 주소
      const id = new URLSearchParams(urlObj.search).get('v');
      if (id) return id;

      // ✅ shorts 주소 처리
      if (urlObj.pathname.startsWith('/shorts/')) {
        return urlObj.pathname.split('/')[2];  // /shorts/비디오ID
      }

      // 임베드 주소 처리
      if (urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.split('/')[2];
      }
    }
    return null;
  } catch (e) {
    console.error("비디오 ID 추출 실패:", e);
    return null;
  }
}


// 📦 popup에서 분석 요청 처리
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeComments') {
    const videoId = getVideoId(request.url || window.location.href);
    if (!videoId) {
      sendResponse({ success: false, error: '유효하지 않은 YouTube URL입니다.' });
      return true;
    }
  
    (async () => {
      try {
        const comments = await collectComments(videoId);
        const analysis = {
          totalComments: comments.length,
          normalComments: 0,
          inappropriateComments: 0,
          comments: []
        };
  
        const sentiments = await Promise.all(
          comments.map(async comment => {
            const sentiment = await analyzeSentiment(comment);
            analysis[`${sentiment}Comments`]++;
            return { ...comment, sentiment };
          })
        );
  
        analysis.comments = sentiments;
        sendResponse({ success: true, ...analysis });
      } catch (error) {
        console.error('분석 중 오류:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
  
    return true;
  }
  
});

// 유튜브 댓글 영역에서 실행
if (
  window.location.hostname.includes("youtube.com") &&
  (window.location.pathname.startsWith("/watch") || window.location.pathname.startsWith("/shorts"))
) {
  observeAndFilterComments();
}

// SPA 페이지 전환 시 재실행
window.addEventListener('yt-navigate-finish', () => {
  if (
    window.location.pathname.startsWith('/watch') ||
    window.location.pathname.startsWith('/shorts')
  ) {
    observeAndFilterComments();
  }
});

