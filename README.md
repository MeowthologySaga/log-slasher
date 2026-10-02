# Log Slasher

통나무에 새겨진 표식을 읽고, 맞는 방향으로 스와이프해 베어내는 모바일 하이퍼캐주얼 액션 게임.
원작(Unity, "Sword Master")을 HTML5로 처음부터 다시 만든 버전입니다. 외부 라이브러리·에셋·음원이 하나도 없어서
**라이선스 걱정 없이** 바로 배포할 수 있습니다 (그래픽은 Canvas로 직접 그리고, 음악·효과음은 Web Audio로 실시간 합성).

## 게임 규칙

| 통나무 | 조작 |
|---|---|
| 위쪽이 갈라진 통나무 | ↓ 아래로 |
| 왼쪽에 홈 | → 오른쪽으로 |
| 오른쪽에 홈 | ← 왼쪽으로 |
| 쇠테 통나무 (STAGE 2~) | 같은 방향으로 2번 |
| 화약통 (STAGE 3~) | ↑ 위로 쳐내기, 다른 방향이면 폭발하고 게임 오버 |
| 황금 통나무 (STAGE 2~) | 아무 방향이나, 시간·점수 보너스 |

- 타이머는 계속 줄어들고, 베면 다시 찹니다. 틀리면 시간이 깎이고 콤보가 끊깁니다.
- 통나무 20개마다 STAGE가 오르고, 타이머가 더 빨리 줄며, 하늘이 낮 → 노을 → 밤으로 바뀝니다.
- 콤보 20마다 점수 배율 +1 (최대 ×5). FEVER 게이지가 차면 6초 동안 어느 방향으로 베어도 성공하고 점수는 ×2.
- 처음 하는 플레이어에게는 7개짜리 튜토리얼이 나오고, 새 통나무 종류가 처음 등장하면 안내가 뜹니다 (그동안 시간은 멈춤).
- 키보드: 방향키 또는 WASD, Esc/P 일시정지, Enter 시작.

## 파일 구성

```
index.html            화면 구조 (타이틀, 설정, 일시정지, 결과)
style.css             UI 스타일
game.js               게임 전체 (렌더링, 로직, 사운드, 입력)
manifest.webmanifest  앱 설치(PWA) 정보
sw.js                 오프라인 캐시
icons/                앱 아이콘 (svg, 192, 512)
```

## 로컬 실행

```bash
python -m http.server 8123
```

브라우저에서 `http://localhost:8123` 접속. 휴대폰으로 테스트하려면 같은 Wi‑Fi에서 `http://<PC IP>:8123`으로 접속하면 됩니다.

## 출시 방법

1. **웹 (가장 빠름)**: 폴더 전체를 GitHub Pages, Netlify, Cloudflare Pages, itch.io(HTML5 게임으로 zip 업로드) 중 한 곳에 올립니다.
   HTTPS로 서비스되면 모바일에서 "홈 화면에 추가"로 앱처럼 설치되고 오프라인에서도 실행됩니다.
2. **Google Play**: 웹에 올린 뒤 [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)(TWA)으로 감싸면 됩니다.
   `npx @bubblewrap/cli init --manifest https://<도메인>/manifest.webmanifest` 실행 후 `build`.
3. **Play / App Store 네이티브 앱**: [Capacitor](https://capacitorjs.com/)로 이 폴더를 `webDir`로 지정하면 Android·iOS 프로젝트가 생성됩니다.

> 파일을 고친 뒤 다시 배포할 때는 `sw.js`의 `VERSION` 값을 올려 주세요. 그래야 기존 플레이어도 새 버전을 받습니다.

## 개인정보

서버로 전송하는 데이터는 없습니다. 최고 기록과 설정만 기기의 localStorage에 저장됩니다.
스토어 등록에 개인정보처리방침이 필요하면 "수집하는 개인정보 없음"으로 작성하면 됩니다.
