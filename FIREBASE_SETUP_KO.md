# 독서 기록 동기화 설정 (처음 한 번)

독서 기록은 공개 GitHub 저장소에 쓰지 않습니다. Firebase 로그인과 Firestore에 저장하고, 같은 Google 계정으로 로그인한 기기끼리 동기화합니다.

## 1. Firebase 프로젝트와 웹 앱 만들기

1. [Firebase Console](https://console.firebase.google.com/)에서 Google 계정으로 로그인하고 **프로젝트 추가**를 누릅니다.
2. 프로젝트 이름을 정해 만듭니다. Google Analytics는 사용하지 않아도 됩니다.
3. 프로젝트 홈에서 웹 아이콘 `</>`을 눌러 웹 앱을 등록합니다. 앱 별칭은 `Eunseo Study Calendar`처럼 정하면 됩니다.
4. Firebase가 보여주는 웹 설정 값(`apiKey`, `authDomain`, `projectId` 등)을 복사합니다.

## 2. Google 로그인 켜기

1. 왼쪽 **빌드 → Authentication → 시작하기**를 누릅니다.
2. **로그인 방법**에서 **Google**을 사용 설정하고 저장합니다.
3. Authentication의 **설정 → 승인된 도메인**에 `ellie150121.github.io`가 있는지 확인합니다. 없으면 추가합니다.

## 3. 비공개 데이터베이스 만들고 규칙 적용하기

1. 왼쪽 **빌드 → Firestore Database → 데이터베이스 만들기**를 누릅니다.
2. 처음부터 **프로덕션 모드**로 만들고 가까운 위치를 선택합니다.
3. Firestore의 **규칙** 탭에서 이 ZIP의 `firestore.rules` 내용을 붙여 넣고 **게시**합니다.

규칙은 로그인한 사용자가 자기 계정 경로의 기록만 읽고 바꾸게 합니다. 세 기기 모두 같은 Google 계정으로 로그인해야 같은 기록을 봅니다.

## 4. 웹 설정값 입력하기

1. ZIP 안의 `firebase-config.js`를 텍스트 편집기로 엽니다.
2. `PASTE_...`로 표시된 값을 Firebase 웹 앱 설정의 실제 값으로 바꿉니다. 따옴표와 쉼표는 그대로 둡니다.
3. 수정한 파일을 포함해 ZIP의 파일들을 GitHub 저장소 루트에 올려 기존 파일을 교체합니다. `data` 폴더와 `.github/workflows` 폴더는 삭제하지 않습니다.
4. GitHub Pages 배포가 끝나면 앱을 열고 **Continue with Google**을 누릅니다. 아이 휴대폰, 내 휴대폰, 태블릿에서도 같은 계정으로 로그인합니다.

`firebase-config.js`의 웹 설정은 브라우저에 전달되는 공개 설정입니다. Firebase 보안은 이 파일 안에 비밀번호를 넣는 방식이 아니라 Firestore 규칙과 Google 로그인으로 적용합니다. Google 비밀번호나 서비스 계정 키는 이 저장소에 올리지 마세요.

## 독서 기록 사용

달력에서 날짜를 누른 다음 **English Reading → Add book**을 눌러 책 제목, 페이지 또는 분량(분), 좋아한 문장/감상을 저장합니다. 기록은 선택한 날짜에 연결됩니다. 저장 후 다른 기기에서도 같은 Google 계정으로 로그인하면 표시됩니다.
