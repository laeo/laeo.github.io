# GIT修改提交者信息

> Author : laeo

> Date   : 2018/04/03

> License: CC BY-NC-SA 3.0

终端切换到项目目录，切换到需要更改的分支，执行以下 `shell` 命令。

> 手动修改命令中的 `author` 和 `author@example.org` 为目标值。

```
git filter-branch --commit-filter '
    export GIT_AUTHOR_NAME=author;
    export GIT_AUTHOR_EMAIL=author@example.org;
    export GIT_COMMITTER_NAME=author;
    export GIT_COMMITTER_EMAIL=author@example.org;
    git commit-tree "$@"
'
```

执行完成后，使用以下命令将改动提交到远程仓库。

```
git push --force --tags origin 'refs/heads/*'
```

> 多人合作中改动过往记录会对提交历史产生破坏，谨慎操作！