import re
import subprocess
import json
import sys

def extract_video_id(url):
    patterns = [
        r"(?:v=|\/|embed\/|live\/|youtu\.be\/)([0-9A-Za-z_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def main():
    video_url = input("유튜브 URL을 입력하세요: ")
    video_id = extract_video_id(video_url)
    
    if not video_id:
        print("유효한 URL이 아닙니다.")
        return

    print(f"영상 ID 확인: {video_id}")

    # Termux에서 작동이 확인된 명령어 조합
    cmd = [
        sys.executable, "-m", "youtube_transcript_api",
        video_id,
        "--languages", "ko"
    ]

    try:
        # 1. 원본 텍스트를 모두 가져옵니다.
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        output = result.stdout.strip()

        if not output:
            print("자막을 가져오지 못했습니다. (비어있음)")
            return

        script_lines = []

        # 2. JSON 파싱 시도
        try:
            data = json.loads(output)
            
            # JSON이 비디오 ID를 키로 가지고 있는 경우 처리
            if isinstance(data, dict):
                if video_id in data:
                    data = data[video_id]
                else:
                    data = list(data.values())[0]
            
            # 각 자막 항목 뒤에 줄바꿈을 넣기 위해 리스트로 저장
            script_lines = [item['text'] for item in data if 'text' in item]
            
        except json.JSONDecodeError:
            # JSON이 아닐 경우 정규표현식으로 추출
            script_lines = re.findall(r'"text":\s*"([^"]*)"', output)

        if not script_lines:
            # 마지막 수단: 싱글 쿼테이션 기반 정규표현식
            script_lines = re.findall(r'\'text\':\s*\'([^\']*)\'', output)

        if script_lines:
            # 각 자막 단위를 줄바꿈(\n)으로 연결하여 가독성 높임
            script = "\n".join(script_lines)
            
            with open("script.txt", "w", encoding="utf-8") as f:
                f.write(script)
            print("성공: script.txt 파일이 생성되었습니다. (줄바꿈 적용 완료)")
        else:
            print("자막 텍스트를 분리하는 데 실패했습니다.")

    except Exception as e:
        print(f"오류 발생: {e}")

if __name__ == "__main__":
    main()

