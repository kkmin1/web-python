# web-python

로컬 Python 변환 스크립트를 웹 UI 또는 Electron에서 실행하기 위한 런처 성격의 저장소입니다.

## 개요

MHTML, Markdown, 텍스트 변환 스크립트와 이를 호출하는 데스크톱/웹 인터페이스를 함께 다룹니다.

주요 파일:
- `main.js`, `preload.js`, `renderer.js`: Electron 런처
- `web_runner.py`, `web_runner.js`: 브라우저/로컬 실행 보조
- `mhtml2md-*`, `mhtml2txt-*`, `txt2html-*`: 변환 스크립트
- `youtube-script.py`: 별도 텍스트 처리 실험

## 실행 방법

Electron 앱으로 실행:

```bash
npm install
npm start
```

패키징:

```bash
npm run dist
```

## 용도

- 로컬 Python 스크립트를 GUI에서 실행
- 문서 변환 도구를 한곳에서 시험
- Electron 기반 개인 변환 도구 실험
