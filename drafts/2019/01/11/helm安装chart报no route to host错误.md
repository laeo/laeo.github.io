# helm 安装 chart 报 no route to host 错误

> Author : laeo

> Date : 2019/01/11

> License: CC BY-NC-SA 3.0

## 错误信息

```
$ k8s helm install stable/nginx-ingress --name nginx --set rbac.create=true --namespace kube-system

Error: forwarding ports: error upgrading connection: error dialing backend: dial tcp *.*.*.*:10250: connect: no route to host
```

## 解决方案

清理对应节点的 iptables 规则即可，

```
systemctl stop kubelet
systemctl stop docker
iptables --flush
iptables -tnat --flush
systemctl start kubelet
systemctl start docker
```

重新一试果然正常了，但是直勾勾重启节点上的 kubelet 和 docker，又导致 rook 安装的 ceph 存储集群炸了，相关的 pod 处于 pending 状态。
