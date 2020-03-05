# 腾讯云CVM搭建最新K8S集群过程记录

> Author : laeo

> Date   : 2020/02/05

> License: CC BY-NC-SA 3.0

## 说明

*穷人专用的*在腾讯云不同账号下的CVM上搭建K8S集群。

## 原料

1. [官方指南一份](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)
2. 腾讯云CVM一份（配置2C4G5M）（运行CentOS 7.4）
3. [微软CN提供的gcr.io镜像一份](https://mirror.azure.cn/help/gcr-proxy-cache.html)
4. [阿里云提供的k8s镜像一份](https://developer.aliyun.com/mirror/kubernetes)

## 烹饪

1. 根据 [容器运行时](https://kubernetes.io/zh/docs/setup/production-environment/) 文档介绍选择中意的容器运行时程序，跟以往不同，我没有选择 *docker*，而是选择了 *containerd*，差别请前往 [如何选择 Containerd 和 Docker](https://cloud.tencent.com/document/product/457/35747) 这篇文档。

> 腾讯云连 Docker 的源太慢了，还是用阿里提供的镜像吧。

> 需要注意的是，当我们根据文档中的说明生成了默认的 *containerd* 配置文件后，我们需要手动将其中的 `plugins.cri.sandbox_image` 的地址改为微软CN提供的 *镜像* 的地址，否则下载不到沙盒镜像，集群将无法正常启动。

> 还需要注意的是，containerd 的 CLI 工具是 `crictl`，常用命令与 docker 一致，具体需要查询官网。安装好 containerd 后是无法直接使用 crictl 查看容器信息的，会报错连接超时。原因是 crictl 默认的后端地址是 `unix:///var/run/dockershim.sock`，而 containerd 使用的地址是 `unix:///run/containerd/containerd.sock`，可以设置环境变量 `CONTAINER_RUNTIME_ENDPOINT` 来便于使用。

> 编辑 containerd 的配置文件，使用 docker registry 的镜像地址 `https://dockerhub.azk8s.cn` 来加速镜像拉取。

2. 根据 [官方文档](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/) 安装 kubeadm，安装过程中使用阿里云k8s镜像来加速安装 kubeadm、kubelet、kubectl 等软件。

> 安装前需要根据文档做系统初始化，打开流量转发等功能。记得一定要执行 `modprobe br_netfilter`，否则预检会报错 /proc/sys/net/bridge/bridge-nf-call-iptables contents are not set to 1。

> 需要注意最后安装完成要记得指定 kubelet 的 --cgroup-driver 为 systemd，保持跟 containerd 一致。

> 腾讯云CVM需要修改 `/etc/sysctl.conf` 文件来强制打开 `ip_forward`。

3. 根据 [官方文档](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/) 使用 kubeadm 创建集群。

> 需要注意的是，腾讯云CVM网卡绑定的 IP 并非公网 IP，所以我们需要指定 `--control-plane-endpoint` 参数，便于其它节点通过公网加入到集群。

> 根据不同的网络插件，我们可能需要指定 `--pod-network-cidr` 参数，具体需要查看网络插件列表中的描述。

> kubeadm 初始化集群所需的容器全部存储于 gcr.io 中，由于奇怪的原因我们不能直接访问该网站，所以这就用到原料中的 *微软CN* 提供的 gcr.io 镜像网站。通过附加 `--image-repository gcr.azk8s.cn/google_containers` 来指明从镜像站下载镜像。

> 穷人专用笔记，将公网IP作为虚拟IP绑定到CVM上，然后修改 `/etc/sysconfig/kubelet` 指定 `--node-ip` 参数。

```
cp /etc/sysconfig/network-scripts/ifcfg-eth0 /etc/sysconfig/network-scripts/ifcfg-eth0:0

cat > /etc/sysconfig/network-scripts/ifcfg-eth0:0 <<EOF
DEVICE=eth0:0      #此处添加:0，保持和文件名一致，添加多个IP依次递增
ONBOOT=yes                      #是否开机激活
BOOTPROTO=static              #静态IP，如果需要DHCP获取请输入dhcp
IPADDR=<公网IP>            #此处修改为要添加的IP
NETMASK=255.255.255.0
EOF

systemctl restart network
```

> 穷人专用笔记，绑定好虚拟IP后，我们还需要在 `kubeadm init` 时指定 `--apiserver-advertise-address` 参数为该虚拟IP，这样在创建 `ipvs` 规则的时候，才能正确将流量重定向到公网，否则 worker 节点将无法正常与 master节点通信，因为工作节点上创建的 ipvs 规则，会将 10.96.0.1 这个 VIP 的流量导向 master 服务器的内网IP。

4. 安装网络插件，等待初始化完成。

> 安装 Flannel 时，从 quay.io 拉取镜像也非常缓慢，使用镜像 `quay.azk8s.cn` 加速它！

5. 使用 [rook](https://rook.io/docs/rook/v1.2/ceph-quickstart.html) 安装存储供应商，


# 上面的骚操作全不需要了，因为我人傻了！腾讯云提供了一个功能叫*对等联网*，还有新提供的 *云联网* 都可以将不同账号的CVM降维打击成内网互通。虽然没有实验过，但想来不会比我上面一堆又麻烦又没用的操作更无用了。就这样吧……吐了
