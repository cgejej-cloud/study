@AGENTS.md

## Git Push

로컬 프록시(127.0.0.1:xxxxx)가 죽어 403이 뜰 때는 GitHub PAT를 직접 사용한다.

```bash
# ~/.git-credentials 에 PAT 저장돼 있음
git remote set-url origin https://cgejej-cloud:<PAT>@github.com/cgejej-cloud/study.git
git push -u origin <branch>
```

PAT 위치: `~/.git-credentials` (credential.helper=store)
