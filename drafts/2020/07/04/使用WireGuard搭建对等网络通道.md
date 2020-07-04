# 使用WireGuard搭建对等网络通道

> Author : laeo

> Date   : 2020/07/04

> License: CC BY-NC-SA 3.0

由于阿里云国际站停止了新手套餐2.0的续费，导致我自建的代码仓库、持续集成、容器镜像存储与代理等系统，全部需要迁移到轻量服务器上。之前是用 Docker Swarm 作为容器编排工具，这次正好换成 Kubernetes 的简化版——k3s。

由于轻量服务器内网是不互通的，为了便于以后增加服务器、扩容资源啥的，就试着用 WireGuard 来进行组网。它轻量、便捷、高效，而且数据全程加密传输，是依托公网组建虚拟局域网的优秀选择。

## 安装

安装流程非常简单，目前是可以参照官网的[安装指南](https://www.wireguard.com/install/)进行安装，也可以选择更新系统内核，它已经被合并到内核中了。

我这里是直接将 CentOS 内核更新到目前最新的 5.7 版本，其中就已经包含了 WireGuard 的内核模块，只需要安装 `wireguard-tools` 这个 yum 包就行了。

## 配置

`wireguard-tools` 包提供了我们所需的工具 `wg` 和 `wg-quick`，可以使用它们来分别完成手动部署和自动部署。

先按照官方文档描述的形式，生成好 *主机A* 用于加密解密的密钥，其实就只需一行命令

```bash
wg genkey | tee privatekey | wg pubkey > publickey
```

这样在当前目录下就生成了 `privatekey` 和 `publickey` 两个文件，其中密钥是配置到本机的，而公钥是配置到其它机器里的。

```bash
$ cat privatekey && cat publickey
6TpHfNWc2H2NuM6ajQMMLkUWTgCf3xlwTTCiayz7Jmo=
kUWTgCf3xlwTTCiayz7Jmo6TpHfNWc2H2NuM6ajQMML=
```

假如现在有一台需要与上述主机对等联网的 *主机B*，其公网IP（或者内网IP，只要能与上述主机通信即可）是 172.17.3.1，我们首先依照上面的流程安装 WireGuard 并生成好主机B的密钥。

然后编写 *主机A* 完整的配置文件，以供 `wg-quick` 使用，在主机A的 `/etc/wireguard/wg0.conf` 中写入

```
[Interface]
PrivateKey = 6TpHfNWc2H2NuM6ajQMMLkUWTgCf3xlwTTCiayz7Jmo=
Address = 10.0.0.1
ListenPort = 51820

[Peer]
PublicKey = 主机B的publickey
EndPoint = 172.17.3.1:51820
AllowedIPs = 10.0.0.2/32
```

及其简单的配置了，一看就懂。Interface 小节是属于主机A（也就是本机）的配置，其中 `Address` 是你给这台主机分配的虚拟IP，而 `ListenPort` 是主机之间通讯使用的端口，是 *UDP* 协议的。

Peer 是属于需要通信的主机B的信息，有多少需要通信的主机，就添加多少个 Peer 小节。其中 `EndPoint` 是主机B的公网IP与WireGuard监听的UDP端口，这个IP不一定是公网，如果你的机器通过内网也能通信，直接用内网IP也可以，当然要注意这个IP需要所有加入局域网的主机都能通信才行。`AllowedIPs` 是指本机发起连接的哪些IP应该将流量转发到这个节点去，比如我们给主机B分配了内网IP 10.0.0.2，那么在主机A上发送到 10.0.0.2 的数据包，都应该转发到这个 EndPoint 上，它其实起的是一个过滤作用。而且如您所想，多个 Peer 时，这里配置的IP地址不能有冲突。

配置好主机A后，照猫画虎，将主机B也配置好，无非就是密钥信息改改，IP地址改改就行了。

## 启动

配置文件写好后，使用 `wg-quick` 工具来创建虚拟网卡，

```bash
wg-quick up wg0
```

上面命令中的 `wg0` 对应的是 `/etc/wireguard/wg0.conf` 这个配置文件，其自动创建的网卡设备，名字就是 wg0，这对应关系自不必多言。

将主机A和B的网卡设备都安装配置好后，就能使用 `wg` 命令来观察组网情况了

```bash
$ wg
interface: wg0
  public key: 6TpHfNWc2H2NuM6ajQMMLkUWTgCf3xlwTTCiayz7Jmo=
  private key: (hidden)
  listening port: 51820

peer: neFHhQdYDXhmJLhImyr0QoDCpukRMJlwMN7bpkTnjxc=
  endpoint: 172.17.3.1:51820
  allowed ips: 10.0.0.1/32
  latest handshake: 1 hour, 14 minutes, 54 seconds ago
  transfer: 656 B received, 656 B sent
```

可以看到列出了对等联网的节点信息，还有通信测量数据。然后可以通过 ping 另一台主机的虚拟IP，来检查网络通信是否正常。

## 总结

之前有段时间一直折腾腾讯云CVM组建 K8S 集群，但是由于跨地域内网不通，又因 K8S 许多组件写死了绑定网卡IP，导致最终失败了。虽然找到许多替代方案，但无疑需要加钱！

现在发现了 WireGuard，性能好不说，使用还简单，还全程加密，可以说要组建点低端集群来玩耍，会很方便了。

当然问题还是存在的，比如数据全部走公网了，速率会收到公网带宽限制，而且公网稳定性也无保障。说来说去，还是穷，有钱直接配置拉满不就好了哈哈。
