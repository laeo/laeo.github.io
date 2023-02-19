---
title: 'kubernetes 集群安装分布式存储组件 rook-ceph'
date : 2019-01-12
license: CC BY-NC-SA 3.0
---

## 技术选型

根据[官方文档](https://kubernetes.io/docs/concepts/storage/volumes/)说明，k8s 提供了不同存储系统，可以直接根据需求选择不同的存储系统进行部署。由于分布式系统的特点，优先选择同样支持分布式部署的存储系统。为了方便部署，我采用 rook 来部署和管理存储集群。

## 什么是 rook？

> Rook is an open source cloud-native storage orchestrator, providing the platform, framework, and support for a diverse set of storage solutions to natively integrate with cloud-native environments.

来自官方文档的说明，云原生的存储适配器。根据实际使用体验，rook 是用来对开源云原生存储系统的部署、管理进行管理的工具。通过 rook 可以快捷的部署一套私有的存储集群系统，从[官网文档](https://rook.io/docs/rook/v0.9/)也可以看出其适配了多个云存储集群系统。

## 部署 rook-ceph 集群

参照 [快速上手指导](https://rook.io/docs/rook/v0.9/quickstart-toc.html) 所列各个存储引擎的版本状态，选择采用已发布正式版本的 ceph 存储系统。

> Ceph is a highly scalable distributed storage solution for block storage, object storage, and shared file systems with years of production deployments.

为了快速可控的部署 rook 服务，采用开源的 kubernetes 包管理器 helm 来安装，如果希望获得更多自定义能力，可以参照 [官方部署文档](https://rook.io/docs/rook/v0.9/ceph-quickstart.html) 部署 rook-operator，有关 helm 的安装自行查询官方文档。

执行下述指令安装稳定版本的 rook-ceph 组件，

```
helm repo add rook-stable https://charts.rook.io/stable
helm install --namespace rook-ceph-system --name rook-ceph rook-stable/rook-ceph
```

然后使用下述描述文件创建存储集群所需角色，

```yaml
#################################################################################
# This example first defines some necessary namespace and RBAC security objects.
# The actual Ceph Cluster CRD example can be found at the bottom of this example.
#################################################################################
apiVersion: v1
kind: Namespace
metadata:
  name: rook-ceph
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rook-ceph-osd
  namespace: rook-ceph
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph
---
kind: Role
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: rook-ceph-osd
  namespace: rook-ceph
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
---
# Aspects of ceph-mgr that require access to the system namespace
kind: Role
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: rook-ceph-mgr-system
  namespace: rook-ceph
rules:
  - apiGroups:
      - ""
    resources:
      - configmaps
    verbs:
      - get
      - list
      - watch
---
# Aspects of ceph-mgr that operate within the cluster's namespace
kind: Role
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph
rules:
  - apiGroups:
      - ""
    resources:
      - pods
      - services
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - batch
    resources:
      - jobs
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - delete
  - apiGroups:
      - ceph.rook.io
    resources:
      - "*"
    verbs:
      - "*"
---
# Allow the operator to create resources in this cluster's namespace
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: rook-ceph-cluster-mgmt
  namespace: rook-ceph
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: rook-ceph-cluster-mgmt
subjects:
  - kind: ServiceAccount
    name: rook-ceph-system
    namespace: rook-ceph-system
---
# Allow the osd pods in this namespace to work with configmaps
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: rook-ceph-osd
  namespace: rook-ceph
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: rook-ceph-osd
subjects:
  - kind: ServiceAccount
    name: rook-ceph-osd
    namespace: rook-ceph
---
# Allow the ceph mgr to access the cluster-specific resources necessary for the mgr modules
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: rook-ceph-mgr
subjects:
  - kind: ServiceAccount
    name: rook-ceph-mgr
    namespace: rook-ceph
---
# Allow the ceph mgr to access the rook system resources necessary for the mgr modules
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: rook-ceph-mgr-system
  namespace: rook-ceph-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: rook-ceph-mgr-system
subjects:
  - kind: ServiceAccount
    name: rook-ceph-mgr
    namespace: rook-ceph
---
# Allow the ceph mgr to access cluster-wide resources necessary for the mgr modules
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: rook-ceph-mgr-cluster
  namespace: rook-ceph
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: rook-ceph-mgr-cluster
subjects:
  - kind: ServiceAccount
    name: rook-ceph-mgr
    namespace: rook-ceph
```

将其保存为 rook-ceph-cluster.yaml 后，执行 `kubectl create -f rook-ceph-cluster.yaml` 在集群中创建相关资源。然后再通过使用相关 CRD 创建 ceph 集群，

```yaml
#################################################################################
# The Ceph Cluster CRD example
#################################################################################
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    # For the latest ceph images, see https://hub.docker.com/r/ceph/ceph/tags
    image: ceph/ceph:v13.2.2-20181023
  dataDirHostPath: /var/lib/rook
  dashboard:
    enabled: true
  mon:
    count: 3
    allowMultiplePerNode: true
  storage:
    useAllNodes: true
    useAllDevices: false
    config:
      databaseSizeMB: "1024"
      journalSizeMB: "1024"
```

该资源描述使用了 `ceph.rook.io/v1` 规范，并创建一个 CephCluster 类型的资源，名称为 rook-ceph 并存放于 rook-ceph 命名空间下。

我在使用上述资源描述创建 ceph 集群后，执行 `kubectl -n rook-ceph get pods -o wide` 会看到 dashboard 相关 pod 存在。但是在我使用更新版本的 image 后，该 pod 却并不存在了，致使我一度认为集群出现错误。

> 通过访问 https://hub.docker.com/r/ceph/ceph/tags 查询新版本的镜像 tag，然后修改上述描述的 image 字段，以达到使用新版 ceph 的目的。

同样的执行 `kubectl create` 操作后，就可以通过 `kubectl -n rook-ceph get pod -o wide` 查询相关 pod 的运行状态了，这个启动过程或许会  消耗多达 10 分钟时间，是根据主机配置决定的。

## 创建 StorageClass

存储集群已经创建完成，检测 pods 状态也都处于正常，我们就可以开始使用它来存储数据了么？并不是。

之前的操作我们只是基于 k8s 集群创建了一个存储集群，我们的 k8s 集群并不知道该  集群是做什么的， 有什么作用，它只是  提供了一个运行平台。要让 k8s 集群在部署新服务时，根据服务的描述文件自动在 ceph 集群中创建一个存储空间，我们还需要创建一个 StorageClass 类型的资源。

 先看下面的资源描述，

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ceph-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 2
  failureDomain: osd
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph
provisioner: ceph.rook.io/block
parameters:
  pool: ceph-pool
  clusterNamespace: rook-ceph
```

 在上述描述中，我  定义了一个 CephBlockPool 的资源，查阅 rook-ceph 的有关文档，可以知道这是在存储集群中创建了一个 block 存储池，我们的 app 所需的存储空间都从该存储池中分配。

> “app 所需的存储空间” 指的是在资源描述文件中定义的 PVC 类型的固化存储声明。

有了资源池，我们就可以根据 k8s 文档中的描述，创建一个 StorageClass 存储分类。上述资源描述文件中我创建了一个名为 `ceph` 的存储分类，该分类用于标记当 PersistentVolumeClaim 中出现使用该 StorageClass 的存储声明时，从指定 pool 中获取 PersistentVolume。

到这一步，基于 rook-ceph 的存储集群就已经正式准备就绪了，可以准备开始使用咯。

## 外网访问 dashboard

默认的 dashboard 是无法从集群之外访问，如果要在集群之外访问它，有几种方式：

1. kube-proxy
2. NodePort
3. LoadBalancer
4. Ingress

最简单的就是使用方式一，在本地执行 `kubectl proxy` 启动流量转发，来访问集群内部服务。

为了便于使用，最佳方案是使用第四种方案，创建 Ingress 资源。

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
    - host: rook-ceph.example.com
      http:
        paths:
          - backend:
              serviceName: rook-ceph-mgr-dashboard
              servicePort: 8443
```

上述资源声明了一个处于 `rook-ceph` 命名空间、 `Ingress` 类型的资源，名为 `ceph-dashboard` ，使用注释语句 `kubernetes.io/ingress.class` 指明使用哪一个 Ingress 提供商，这里我指定使用 traefik 作为 Ingress 服务提供商。

在 spec 字段中，通过 `host` 来指定入口域名，通过 `backend` 字段指定后端 `Service` 。入口服务提供商会根据上述配置，自动创建反向代理，就能够将集群内部的服务暴露到公网。
