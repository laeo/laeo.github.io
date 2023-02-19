---
title: '为 k8s 集群安装 traefik 作为 Ingress 提供商'
date : 2019-01-12
license: CC BY-NC-SA 3.0
---

在上一篇文章中，我提到了使用 Ingress 来暴露集群内部服务到公网，那如何为私有的 K8S 集群配置一个 Ingress 服务呢？

## 什么是 Ingress

> Ingress, added in Kubernetes v1.1, exposes HTTP and HTTPS routes from outside the cluster to services within the cluster. Traffic routing is controlled by rules defined on the ingress resource.

根据文档说明，Ingress 是一种通过规则来对外网到集群内的 HTTP/HTTPS 流量进行路由控制的资源。

官方推荐了数个 Ingress 控制器，具体可以查看 [这里](https://kubernetes.io/docs/concepts/services-networking/ingress/#ingress-controllers)。由于之前有过 [Traefik](https://github.com/containous/traefik) 相关使用经验，所以  在挑选控制器的时候我依然选择了 Traefik。

## 安装 Traefik

参照  文档的说明可以手动安装，获得更强的自定义能力。因为方便和可控，我依然选择使用 Helm 来安装，也是在[官方文档](https://docs.traefik.io/user-guide/kubernetes/#deploy-traefik-using-helm-chart)中说明的流程。

```bash
helm install -n traefik --namespace kube-system --values values.yaml stable/traefik
```

其中 `values.yaml` 文件存放了该包的配置项，可以通过 `helm inspect stable/traefik` 查看该包的简介，在其中可以查看到所有的配置选项。

比如，我自己在安装过程中就设置了如下设置项

```yaml
imageTag: v1.7.7
externalIP: 192.168.0.1
dashboard:
  enabled: true
  domain: traefik.example.com
rbac:
  enabled: true
ssl:
  enabled: true
  enforced: true
  insecureSkipVerify: true
acme:
  enabled: true
  staging: false
  email: acme@example.com
  challengeType: http-01
  persistence:
    storageClass: ceph
    size: 100Mi
```

查看上述设置项，可以大致清楚一些事情。

`imageTag` 指定了所使用的 docker 镜像的版本标签，可以通过修改该字段的值自定义需要使用的版本。

`externalIP` 指定了外部流量的入口 IP，该字段如果不设定，最终的 Service 状态中，externalIP 字段将会一直处于 pending 状态。

`dashboard` 字段指明需要启用仪表盘功能，并且自动以指定域名创建 Ingress 资源。

`acme` 字段指明自动申请 let's encrypt 证书所需的参数，比如邮箱地址，域名认证的方式（为了方便直接使用基于 http 请求的方式）。需要特别说明的是 `acme.persistence` 字段通过指定 StorageClass 的名称以及所需存储空间的大小（100Mi）来向集群提交一份 `PersistentVolumeClaim` 声明，用于为自动申请的证书提供固化存储。

通过 helm 可以很方便的安装基于 traefik 的 Ingress 控制器，一旦操作成功，我们就可以通过 `kubectl -n kube-system get svc -o wide` 来观测 traefik 服务的创建状态。

要观察到具体有些什么操作，可以执行 `kubectl -n kube-system get events` 查看事件记录查看是否存在报错信息。

## 使用 Traefik 处理外部流量

东西装好了总是需要使用的，那么如何使用我们刚刚安装、配置好的 Ingress 控制器呢？

首先我们就可以访问下 Traefik 自带的仪表盘服务，

> 注意！访问之前一定记得将域名解析到对应 IP 上，否则 http-01 验证失败会导致无法取得有效证书。

仪表盘会显示当前创建的所有 Ingress 资源，并关联显示其对应的后端 Service。我们还可以在仪表盘中看到一些数据，比如请求总数、平均响应时长、失败请求数等等。

仪表盘正常工作了，那如何对外暴露其它服务呢？

以之前文章中的 rook-ceph 集群为例，该集群在创建时也设置了开启仪表盘功能，所以其内部也有一个仪表盘系统在运行。我们只需要找到相关的服务，然后为其创建 Ingress 资源即可。

首先来找找这个服务，执行 `kubectl -n rook-ceph get svc` ，我们可以看到其中有个名为 `rook-ceph-mgr-dashboard` 的服务，也就是文档中所说的仪表盘所在服务。只要将该服务暴露到外网，我们就能在  外网直接访问它。

那么就是为其创建 Ingress 资源，描述如下

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: ceph-dashboard
  namespace: rook-ceph
  annotations:
    kubernetes.io/ingress.class: traefik
spec:
  rules:
    - host: ceph.rook.example.com
      http:
        paths:
          - backend:
              serviceName: rook-ceph-mgr-dashboard
              servicePort: 8443
```

我们在描述文件中定义一个名为 `ceph-dashboard` ，位于 `rook-ceph` 命名空间，类型为 `Ingress` 的资源。然后为其添加了值为 `traefik` 的注释 `kubernetes.io/ingress.class` ，用于标记只有该名称的 Ingress 控制器可以处理这个资源。

然后在资源的具体描述（spec 字段）中，指定了对主机名为 ceph.rook.example.com 的流量，全部路由到 `serviceName` 为 `rook-ceph-mgr-dashboard`  的服务的 `8443` 端口。

接着通过 `kubectl create -f ceph-dashboard.yaml` 来将该描述文件提交给集群控制器，相应的资源会被自动创建。我们可以通过 `kubectl -n rook-ceph get ingress` 来查看该资源是否正常被创建。

一旦查看到相关资源的存在，我们就可以通过设定的主机名（域名）来访问它了。当然，一定记住的是在访问之前要保证域名的正确解析！

## 结尾

K8S 的 Ingress 类型资源的作用远远不止是提供一个流量入口这么简单，它还能通过不同的 URI 前缀对流量进行路由，可以轻松实现流量的拆分，更多的用法还是要参照官方文档来实现。
