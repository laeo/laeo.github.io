# Kubeadm 创建 Kubernetes 集群备忘录

> Author : laeo

> Date : 2019/01/04

> License: CC BY-NC-SA 3.0

许久不曾写点东西，这次迫于安装 Kubeadm 过程有点麻烦，想了想还是写下来，以后使用的时候也省的再费脑细胞。

## 配置要求

基础的服务器硬件要求参照 [官方文档](https://kubernetes.io/docs/setup/independent/install-kubeadm/#before-you-begin)。

### 云服务器提供商？

慎重选择阿里云之类的有公共网关的云服务，因为这些提供商所提供的公网 IP 是没有绑定到虚拟服务器上的，而是通过路由设施映射过去。Kubeadm 在创建集群的时候，会让 etcd 监听在其获取的本地网卡 IP 上，如果采用阿里云这样的提供商，它获取的网卡 IP 只会是内网 IP。结果就是，其它外网的节点无法正常链接上主节点的 etcd 服务，所以集群无法正常使用。

### Swap 禁止使用？

根据官方文档的说明，Kubernetes 集群需要的是稳定性，而依托于硬盘空间而生的 swap 空间，在读写性能上无法比肩常规内存空间，稳定性无法得到保证，所以禁止使用它。

有的服务器默认就启用了 swap 空间，我们只需编辑 `/etc/fstab` 文件，注释掉其中 swap 类型的挂载操作，并重启服务器即可。

### 内核参数调整？

参照 Kubeadm 安装文档执行以下命令，

```bash
cat <<EOF >  /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF
sysctl --system
```

#### /proc/sys/net/bridge/bridge-nf-call-iptables not found

参照 [issue](https://github.com/weaveworks/weave/issues/2789)，执行以下指令

```bash
modprobe br_netfilter
```

即可解决。

## 使用 Docker-CE 作为运行时

Kubernetes 每个版本都有其兼容的 docker 版本，为了新特性一般都安装最新版 docker-ce，除了参照 [官方文档](https://docs.docker.com/install/linux/docker-ce/centos/)，最简单的安装方式

```bash
wget -qO- get.docker.com | bash
```

该命令会自动安装最新版 docker-ce，但是这常常会带来兼容性问题，Kubeadm 在创建集群时会提示当前兼容的最高版本号，我们可以根据该版本号来安装指定版本。在获取到最高兼容版本号后，可以使用如 CentOS 7 下的包管理工具查询 `yum list --showduplicates docker-ce`，我们可以在输出中看到有不同的版本可以选择，如下输出

```
...
docker-ce.x86_64    17.12.0.ce-1.el7.centos  docker-ce-edge
docker-ce.x86_64    17.12.1.ce-1.el7.centos  docker-ce-edge
docker-ce.x86_64    18.01.0.ce-1.el7.centos  docker-ce-edge
docker-ce.x86_64    18.02.0.ce-1.el7.centos  docker-ce-edge
docker-ce.x86_64    18.03.0.ce-1.el7.centos  docker-ce-edge
docker-ce.x86_64    18.03.1.ce-1.el7.centos  docker-ce-edge
docker-ce.x86_64    18.04.0.ce-3.el7.centos  docker-ce-edge
docker-ce.x86_64    18.05.0.ce-3.el7.centos  docker-ce-edge
docker-ce.x86_64    18.06.0.ce-3.el7         docker-ce-edge
...
```

比如我们要安装 `18.06` 这个版本，所以直接安装 `docker-ce-18.06.0.ce-3.el7` 这个软件包即可。

## 使用 kubeadm 创建集群主节点

万事俱备，只欠一条 `kubeadm init` 命令。但是，在运行该命令前，我们需要考虑在集群中采用什么样的 [Pod Network Addon](https://kubernetes.io/docs/setup/independent/create-cluster-kubeadm/#pod-network)，不知道这玩意怎么翻译好，Pod 网络插件？我们要根据选用的插件来传递 `--pod-network-cidr` 参数给 `kubeadm init` 指令。

### Hostname？

初始化操作默认会为 `apiserver` 创建一份证书，kubeadm 会默认将主机名加入到证书的 DNS 字段中，如果你的主机名不是有效的域名，可以通过 `--apiserver-cert-extra-sans` 设置域名。

## 使用 kubeadm 创建子节点

前期操作都相同，只是这里不执行 `kubeadm init`，而是使用创建主节点后输出的一条指令（类似 `kubeadm join --token <token> <master-ip>:<master-port> --discovery-token-ca-cert-hash sha256:<hash>`）来加入集群。啥？没注意记录？不用着急，官方提供了手动创建该指令的一系列命令。

通过在子节点执行 `kubeadm join`，就可以在集群中增加一个节点。

### 快捷创建 join 指令

主节点执行 `kubeadm token create --print-join-command` 即可创建新 token 并输出完整 join 指令。

### 手动创建 join 指令

在主节点中执行 `kubeadm token create`，可以获取一份 `token`。然后再执行

```bash
openssl x509 -pubkey -in /etc/kubernetes/pki/ca.crt | openssl rsa -pubin -outform der 2>/dev/null | \
   openssl dgst -sha256 -hex | sed 's/^.* //'
```

即可找回 `hash`。

将上述命令输出拼装成 `kubeadm join --token <token> <master-ip>:<master-port> --discovery-token-ca-cert-hash sha256:<hash>` 格式，其中 `master-ip` 为主节点 IP，`master-port` 为 apiserver 监听端口（默认 6443）。最后在子节点中执行该指令即可。
