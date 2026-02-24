# EER MCP

```
███████╗███████╗██████╗     ███╗   ███╗ ██████╗██████╗  
██╔════╝██╔════╝██╔══██╗    ████╗ ████║██╔════╝██╔══██╗  
█████╗  █████╗  ██████╔╝    ██╔████╔██║██║     ██████╔╝  
██╔══╝  ██╔══╝  ██╔══██╗    ██║╚██╔╝██║██║     ██╔═══╝  
███████╗███████╗██║  ██║    ██║ ╚═╝ ██║╚██████╗██║     
╚══════╝╚══════╝╚═╝  ╚═╝    ╚═╝     ╚═╝ ╚═════╝╚═╝
```

### 개요

EER MCP는 Spectra의 eNomix 헬프데스크 시스템과 Claude AI를 연결하는 MCP(Model Context Protocol) 서버입니다.

Claude Desktop 에서 SIS 컨텍스트를 적극 활용할 수 있습니다.

### 목적

**1. 고객 지원 효율화**

- 티켓 조회 및 분석 자동화
- 유사 이력 검색으로 빠른 문제 해결
- 과거 성공/실패 사례 기반 권장 조치 제공

2**. 컨텍스트 활용 강화**

- 관련 링크(요구사항 구현 결과서, 사이트 접속 정보, 서버 구성도 등)를 컨텍스트로 활용
- 업무로그, 그룹 티켓 등 업무 과정에서 생성된 컨텍스트 적극 활용
- Chrome 확장 프로그램과 연동하여 다양한 포맷의 컨텍스트 활용
- claude-code를 통해 로컬 워크스페이스 코드 활용

### Node 환경 설치

권장 node.js 버전: 20 버전 이상 (권장 22)

1. [NVM 설치](https://github.com/coreybutler/nvm-windows/releases)

```bash
nvm list
nvm install 22
nvm use 22
```

2. git clone

```bash
git clone https://github.com/spectrakr/eer-sis-mcp-server.git eer-mcp
```

3. 패키지 설치 및 빌드
  - 빌드 시 하위 디렉토리에 dist 생성

```bash
npm install
npm run build

```

4. claude-desktop 열기 > 설정 > 개발자 > 구성 편집 > claude_desktop_config.json
  - SESSION_ID: SIS 접속(로그인) > 개발자 도구 > Application > Cookies > path가 /enomix 의 JSESSIONID 값

```json
{
  "mcpServers": {
    "eer-mcp": {
      "command": "node",
      "args": [
        "{빌드 디렉토리(dist) 경로}/index-stdio.js"
      ],
      "env": {
        "SPRING_BASE_URL": "https://help.spectra.co.kr", // SIS URL
        "SPRING_AJAX_PATH": "/enomix/common/ajaxHandler.ex", // API 경로
        "SESSION_ID": "1kymf8yzu71xdb0cbxpzuffxb", // JESESSIONID
        "SPRING_DOMAIN_ID": "NODE0000000001" // 도메인 ID
      }
    }
  },
  "preferences": {
    "coworkScheduledTasksEnabled": false,
    "sidebarMode": "code"
  }
}
```

5. claude-desktop 재실행 > 설정 > 개발자 > eer-mcp 상태 확인(`running`)



### 추가 권장 사항

1. Claude > 설정 > 커넥터 > Google Drive, Control Chrome 연결

2. [Claude in Chrome 확장프로그램 설치](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn?hl=ko&utm_source=ext_sidebar)