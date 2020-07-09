# 三节点K3S集群部署Gitea记录

> Author : laeo

> Date   : 2020/07/09

> License: CC BY-NC-SA 3.0

接前文所言，记录下gitea的搭建过程，处理Longhorn存储系统挂载失败的问题，并且处理老数据迁移问题。

## Gitea

Gitea 是一个开源社区驱动的轻量级代码托管解决方案，后端采用 Go 编写，采用 MIT 许可证.

## 部署

Gitea文档中并未提供K8S部署相关的说明，但是我从其github仓库中找到了官方提供的YAML部署文件，地址是 `https://github.com/go-gitea/gitea/blob/master/contrib/k8s/gitea.yml`，直接下载到本地，然后根据需要进行修改即可。下面是我修改后的

*gitea.yaml*

```yaml
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: gitea-data
  namespace: gitea
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 1Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gitea
  namespace: gitea
  labels:
    app: gitea
spec:
  replicas: 1
  template:
    metadata:
      name: gitea
      labels:
        app: gitea
    spec:
      containers:
      - name: gitea
        image: gitea/gitea:1.12
        imagePullPolicy: Always
        volumeMounts:
          - mountPath: "/data"
            name: "data"
        ports:
          - containerPort: 22
            name: ssh
            protocol: TCP
          - containerPort: 3000
            name: http
            protocol: TCP
      restartPolicy: Always
      securityContext:
        fsGroup: 1000
      volumes:
      - name: "data"
        persistentVolumeClaim:
          claimName: gitea-data
  selector:
    matchLabels:
      app: gitea
---
apiVersion: v1
kind: Service
metadata:
  name: gitea-web
  namespace: gitea
  labels:
    app: gitea-web
spec:
  ports:
  - port: 80
    targetPort: 3000
    name: http
  selector:
    app: gitea
---
apiVersion: v1
kind: Service
metadata:
  name: gitea-ssh
  namespace: gitea
  labels:
    app: gitea-ssh
spec:
  ports:
  - port: 22
    targetPort: 22
    nodePort: 30022
    name: ssh
  selector:
    app: gitea
  type: NodePort
---
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: gitea
  namespace: gitea
  annotations:
    cert-manager.io/cluster-issuer: "acme-prod"
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    - git.example.org
    secretName: gitea-web
  rules:
  - host: git.example.org
    http:
      paths:
      - backend:
          serviceName: gitea-web
          servicePort: 80
```

首先是声明了数据存储所用的PVC，因为我之前的部署是使用的SQLite，这里依旧沿用，不需要外部数据库，那么这个PVC就将存储所有数据。因为Longhorn存储是允许动态扩容的，所以先声明1G容量，不够再加。

然后创建两个Service类型的服务，分别对外暴露WEB和SSH入口，最后为WEB入口创建Ingress，并创建好正式的SSL证书。

那么执行 `kubectl create ns gitea`，然后执行 `kubectl create -f gitea.yaml` 即可。

## Longhorn 挂载问题

创建相关部署后，我发现容器始终处于`ContainerCreating`状态，然后`describe`了容器，发现事件列表中出现如下内容

```
Events:
  Type     Reason              Age              From                     Message
  ----     ------              ----             ----                     -------
  Warning  FailedScheduling    <unknown>        default-scheduler        running "VolumeBinding" filter plugin for pod "gitea-d89bf4b95-6qrqv": pod has unbound immediate PersistentVolumeClaims
  Warning  FailedScheduling    <unknown>        default-scheduler        running "VolumeBinding" filter plugin for pod "gitea-d89bf4b95-6qrqv": pod has unbound immediate PersistentVolumeClaims
  Normal   Scheduled           <unknown>        default-scheduler        Successfully assigned gitea/gitea-d89bf4b95-6qrqv to izj6cd9x6l987sieuxvhrwz
  Warning  FailedAttachVolume  0s (x2 over 1s)  attachdetach-controller  AttachVolume.Attach failed for volume "pvc-83693576-6378-4714-848c-02e68740476c" : rpc error: code = Internal desc = Action [attach] not available on [&{pvc-83693576-6378-4714-848c-02e68740476c volume map[self:http://longhorn-backend:9500/v1/volumes/pvc-83693576-6378-4714-848c-02e68740476c] map[]}]
```

然后又 `describe` 了相关的PVC及PV资源，发现均处于正常绑定状态。通过Longhorn UI查看相关的存储卷，发现始终处于 *Not Ready* 状态。

反复查找相关资料，又翻了项目仓库的issue列表，什么都没有发现……最后只能自己各种尝试，因为没有人提示过相关问题，所以我认为这个可能是环境、服务器配置等外部因素引起。
经过一番折腾，几次重装（感谢之前保存的各个YAML文件），总算找到了解决方案

1. 通过 Longhorn UI 删除并重新创建同名 Volume；
2. 将相关部署（Deployment）规模缩小为0；
3. 等待相关容器被清理后，重新将规模扩大到1；

等待容器创建后，你会从 Longhorn UI 中发现相关存储卷已处于正常绑定状态，容器也能正常读写挂载的目录了。

## 老数据迁移

因为之前部署是用的SQLite数据库，数据库文件也存储在 `/data` 目录中，所以直接将该目录打包复制即可。至于为何不用 Gitea 自带的 dump 指令进行备份……我只能说不好用、不会用、懒得用。

所以得到了打包好的 .zip 文件后，我们只需将该文件复制到 Pod 里，并解压到 `/data` 目录即可。那么怎么才能复制文件到 Pod 中呢？答案是 `kubectl cp` 命令，具体可以查询下帮助信息。

## 总结

部署过程中最麻烦的就是存储那块的问题，因为服务器都是在阿里云，又没有内网通信的能力，公网带宽上限30M，所以一直担心是不是带宽不足引起的存储卷调度错误。不过折腾半天后总算能用了，感觉还是不错的。有点别扭的是，K8S的 NodePort 类型的服务限制了端口区间，不能为 Gitea 的SSH入口分配22端口，看起来还是有点强迫症的。总的来说能在阿里云新手2.0套餐到期前将代码仓库迁移到一个高可用的、分布式的环境中，感觉还是非常不错的，也希望相关记录能帮助到你。

下一篇文章不出意外，应该是处理整个集群的日志收集问题，因为我在 Longhorn 项目提了个 issue，然后有维护人员让我帮忙提取日志，结果由于日志太多太杂，命令行模式又不便查找，就搁置了。我要部署一个完整的日志收集、展示系统，便于接下来辅助官方的维护人员，查找存储卷处于 *Not Ready* 状态的原因。