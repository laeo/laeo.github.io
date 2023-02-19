---
title: 'k8s中drone-kube-runner容器无网络问题'
date: 2020-03-05
license: CC BY-NC-SA 3.0
---

## 起因

用腾讯云CVM组的K8S集群跑drone的drone-kube-runner，执行项目的容器镜像构建逻辑，但是出现构建流程卡住的问题。
多重试几次，偶尔还能正常构建起来。但是今天重试了好几次，一直卡住。卡住的地方还都一样， `apk update` 这里。
因为基础镜像是用的 *alpine*，就将其自带的apk的更新地址换为了华中科大的镜像站，并没有多少改善，还是卡住。
然后又换到阿里云的镜像站，最后换到腾讯云的镜像站，一直都这样，很奇怪。
实在没招，直接 `kubectl exec` 进容器里看看到底啥情况。
进去之后下意识执行了 `apk update` ，发现报了几个网络错误。然后又看了下容器的IP地址、网卡配置，都没啥问题。
尝试 `ping` 了下百度，无用。又看了 NS 服务器的配置，也正常，但是执行 `nslookup` 报错。
彻底没招，谷歌走起……

## 搜集资料

谷歌搜了下 `k8s drone no network` ，第一条记录就引起了我的注意：[Drone in Kubernetes has network issue](https://discourse.drone.io/t/drone-in-kubernetes-has-network-issue/6244)。
查看了下这个帖子，其中一条说他自己的解决方案的，我感觉有可能也是这个问题，遂跟着对方给的连接看了过去。
然后又在自己的容器内外查看、对比了下情况，发现我的网卡 MTU 设置跟他的一样，问题定位到了。
当然为了确保判断正确，我还是手动执行了下 `ifconfig docker0 mtu 1440 up` 来测试网络是否正常，当然结果确实是正常了。

## 解决它

找到问题，人家回复中又给出了修正的方法，那不必多说，直接拷贝其给出的环境变量配置到项目的 `.drone.yaml` 文件中，提交完事儿！

```
environment:
    PLUGIN_MTU: 1440
```

为了方便我是直接设置的 Pipeline 等级的环境变量。
