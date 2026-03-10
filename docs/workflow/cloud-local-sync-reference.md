# Cloud ↔ Local Git Sync Reference

Use this quick checklist whenever you switch between cloud work and local VS Code.

## 1) Before you start work (any environment)

```bash
git fetch origin
git status -sb
git branch -vv
```

- Confirm you are on the expected branch.
- Confirm whether your branch is ahead/behind upstream.
- If behind, sync before editing.

## 2) Safe sync from remote

```bash
git pull --rebase
```

- Prefer `--rebase` to keep history linear.
- If conflicts appear, resolve them, then run `git rebase --continue`.

## 3) During work

```bash
git status
```

- Use often to verify what is modified and staged.
- Nothing is shared automatically across machines until you commit + push.

## 4) Publish cloud changes for local pickup

```bash
git add -A
git commit -m "<meaningful message>"
git push -u origin <branch>
```

- Your local VS Code will only see cloud progress after this push.

## 5) Resume on local VS Code

```bash
git fetch origin
git status -sb
git pull --rebase
```

- This brings local branch up to date with cloud-pushed commits.

## Troubleshooting

### "I think I am behind"

```bash
git fetch origin
git log --oneline --decorate --graph --max-count=20
```

Look for remote commits not present locally.

### "I have uncommitted work but need to sync"

```bash
git stash push -m "wip before sync"
git pull --rebase
git stash pop
```

Resolve any conflicts from `stash pop` and continue.

### "No remote configured"

```bash
git remote -v
```

If blank, add remote first:

```bash
git remote add origin <repo-url>
```
