# 우리 아이 학습 달력

리틀팍스 학습기록을 날짜별 달력으로 보여주는 설치형 웹앱(PWA)입니다.

## 포함된 화면

- 월별 달력과 해당 날짜의 학습 시간
- 날짜를 누르면 영상 제목, 학습 점수, 학습 시각, 기록된 재생 시간
- 휴대폰/태블릿 홈 화면에 설치할 수 있는 앱 아이콘
- 인터넷 연결이 끊겨도 앱 화면을 열 수 있는 기본 오프라인 캐시

## 데이터 파일

`data/records.json`은 현재 전달받은 학습 기록 15건으로 만든 예시 데이터입니다. `.github/workflows/update-and-deploy.yml`은 수동 실행 시 리틀팍스에서 기록을 가져와 날짜, 시각, 제목, 점수, 학습 시간만 남기고 GitHub Pages에 배포합니다. 아이 이름, 계정 ID, 원본 응답과 디버그 artifact는 저장하지 않습니다.

필드 형식:

```json
{
  "date": "2026-11-11",
  "time": "20:33",
  "title": "The Happy Prince 11: More Mouths to Feed",
  "score": "4",
  "seconds": 258
}
```

`seconds`는 학습 유형에 따라 Movie면 `MOVIE_RUNTIME`, Song이면 `SONG_RUNTIME`, 그 외에는 `PAGE_RUNTIME`에서 가져옵니다.

## GitHub 자동 갱신

저장소의 Actions Secrets에 다음 이름으로 값을 등록해야 합니다. Secret 이름은 대소문자까지 정확히 맞춰 주세요.

- `LITTLEFOX_ID`
- `LITTLEFOX_PW`
- `LITTLEFOX_CHILD_NAME`

저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택한 뒤, **Actions → 학습 기록 갱신 및 달력 배포 → Run workflow**를 실행합니다. 실행이 성공하면 최신 기록을 `data/records.json`에 저장하고 사이트를 배포합니다. 원본 응답과 계정 이름은 로그나 artifact에 저장하지 않습니다.

## 설치 방법

앱 아이콘으로 설치하려면 이 폴더를 HTTPS 주소로 배포해야 합니다. 공개 GitHub Pages에 게시하면 화면의 학습 기록도 누구나 볼 수 있습니다. 배포 주소를 휴대폰이나 태블릿 브라우저에서 연 뒤:

- Android/Chrome: 브라우저 메뉴에서 **앱 설치** 또는 **홈 화면에 추가** 선택
- iPhone/iPad/Safari: 공유 메뉴에서 **홈 화면에 추가** 선택

설치된 아이콘을 누르면 브라우저 주소창 없이 독립된 앱 화면으로 열립니다.

## 개인정보

학습 기록은 아동의 개인정보입니다. 이 구성은 날짜, 시각, 제목, 점수, 학습 시간만 공개 저장소와 Pages에 올립니다. 누구나 저장소와 URL을 볼 수 있으므로 실제 데이터 공개에 동의한 경우에만 사용하세요. 원본 응답 파일에는 학습자 식별 코드가 포함될 수 있으므로 올리지 마세요.
