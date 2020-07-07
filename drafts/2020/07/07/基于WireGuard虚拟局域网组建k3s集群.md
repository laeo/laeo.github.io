# 基于WireGuard虚拟局域网组建k3s集群

> Author : laeo

> Date   : 2020/07/07

> License: CC BY-NC-SA 3.0

上一篇文章记录了在VPS上通过 WireGuard 组建虚拟局域网的过程，也提到是在为搭建k3s集群做准备，这两天总算是搞定了 `Longhorn` 存储系统的问题，可以把搭建的流程以及所需的 YAML 文件都贴出来，也方便以后再用到时查找。

## k3s

`k3s`(官网是 [k3s.io](https://k3s.io))是一个精简版本的 Kubernetes(k8s)，也是用于实现容器编排与管理功能，但它更加轻量，精简了许多复杂的内容，却能达到与k8s差不多的功能。官网上写着 “The certified Kubernetes distribution built for IoT & Edge computing”，但是个人项目或者小型项目也是可以用用的，比较相对于k8s所需的硬件配置，它的需求简直不值一提。

## 环境初始化

- VPC: 阿里云国际站 轻量服务器 新加坡节点 2C2G80G30M
- OS: CentOS 7 with kernel 5.7

配置好 WireGuard 后，根据 Rancher 官方文档中的 [节点调优](https://rancher2.docs.rancher.cn/docs/best-practices/optimize/os/_index/) 小节，处理系统参数的优化、打开流量转发等工作。

## 安装记录

根据官方文档的说明，安装主控节点，个人使用不考虑主控的高可用，单主即可。然后添加被控，参数改改就行，非常简单。

### 主控

由于我此次使用了阿里云的VPC，又通过WireGuard进行了虚拟组网，因此需要设置部分初始化参数，以兼容当前环境。最终调整后的结果如下所示

```bash
curl -sfL https://get.k3s.io | sh -s - --node-label region=sg --node-external-ip 149.172.63.24 --advertise-address 149.172.63.24 --disable traefik --node-ip 10.20.30.1 --flannel-iface wg0
```

解释下上述参数的作用

- `--node-label region=sg` 为节点打上region标签，这样在创建部署时，就可以根据业务需要，调整Pod或其它资源分布的节点。
- `--node-external-ip 149.172.63.24` 为节点设置外部IP，阿里云VPC的外网IP并未直接绑定到虚拟机网卡上，所以我要设置这个参数，避免k3s组件在设置loadbalance时，将内网IP当作公网IP使用。
- `--advertise-address 149.172.63.24` 用于设置kubectl工具以及子节点进行通讯使用的地址，可以是IP，也可以是域名，在创建apiserver证书时会将此设置到有效域中。
- `--disable traefik` k3s自带Ingress组件 Traefik，但是并不好用，我使用后无法正常生成 ACME 免费证书，所以禁用它，换成 ingress-nginx 与 certmanager 的组合。
- `--node-ip 10.20.30.1` 如果不设置这个参数，那么第一张网卡设备上的IP就会被选中，所以这个IP常是内网IP。但我自行组建了虚拟局域网，所以需要指定虚拟局域网的IP（也就是WireGuard的IP）。
- `--flannel-iface wg0` wg0是WireGuard创建的网卡设备，我需要使用虚拟局域网来进行节点间的通信，所以这里需要指定为wg0。

另外就是，由于WireGuard的所有流量都是加密传输的，通过它来进行节点间的通信，就已经能够保证通信安全，也就没有必要改用其它的CNI驱动，使用默认的就可以了。

在主节点执行上述命令后，一分钟不到就可以看到脚本提示安装完成。通过命令查看下主控端的运行情况

```
sudo systemctl status k3s
```

如果运行正常，那么就看看容器的运行状态是否正常

```
kubectl get pod -A -o wide
```

`-A` 参数用于查看所有命名空间，如果容器都处于 running 状态，那么安装就成功了，接下来要可以添加被控节点。

### 被控

有了上述安装主控的经验，被控安装更加简单，参数需要一定的调整

```
curl -sfL https://get.k3s.io | K3S_TOKEN=K10b5a114775238ba75568d6387a31633a2c08bd377271b59e8797568b7cf56a841::server:54340df706c7090febf56ed0ae553492 K3S_URL=https://10.20.30.1:6443 sh -s - --node-label region=hk --node-external-ip 8.210.153.27 --node-ip 10.20.30.2 --flannel-iface wg0
```

参数不必过多解释

- `K3S_Token` 根据文档说明，去 `/var/lib/rancher/k3s/server/node-token` 获取即可。
- `K3S_URL` 需要设置主控的通信地址端口，端口默认是6443，IP地址就是虚拟网域的IP，这样流量就会通过WireGuard加密传输。
- `--node-label` 不必多说，这服务器是香港节点。

另外两个参数也不必多说，与主控一样的逻辑。执行后稍等一会，安装成功后，照例查看服务运行状态

```
sudo systemctl status k3s-agent
```

如果有报错就根据报错查找解决方案。

## 组件

### Nginx + CertManager

前面提到我弃用了 Traefik，改用 Nginx，下面把相关 YAML 文件贴出来

*nginx.yaml*

```yaml
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: nginx-ingress
  namespace: kube-system
spec:
  chart: stable/nginx-ingress
  valuesContent: |-
    controller:
      kind: DaemonSet
      daemonset:
        useHostPort: true
      nodeSelector:
        role: edge
      service:
        type: ClusterIP
```

安装 Nginx Ingress 非常简单，创建一个 HelmChart 类型的资源即可通过控制器自动部署好，非常方便，不知是 K8S 新增的，还是 k3s 添加的。

另外就是 CertManager 了，直接使用官方文档中提供的命令来安装

```
kubectl apply --validate=false -f https://github.com/jetstack/cert-manager/releases/download/v0.15.0/cert-manager.yaml
```

然后 `kubectl -n cert-manager get pod -w`等待所有Pod都正常运行后就可以继续下一步了。创建 ClusterIssuer 资源，YAML如下

*acme-issuer.yaml*

```yaml
apiVersion: cert-manager.io/v1alpha2
kind: ClusterIssuer
metadata:
  name: acme
spec:
  acme:
    email: acme@example.org
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: acme
    solvers:
    - http01:
        ingress:
          class: nginx
---
apiVersion: cert-manager.io/v1alpha2
kind: ClusterIssuer
metadata:
  name: acme-prod
spec:
  acme:
    email: acme@example.org
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: acme-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

修改其中 `email` 字段并创建，然后我们就能够通过设置 Ingress 的注解，来指定使用哪一个 Issuer 签发证书了。`acme` 是用于调试的,生成无效证书，不确定YAML编写是否有问题、部署是否成功前，最好都使用它来进行证书签发，避免出发频率限制。`acme-prod` 自然就是用于签发有效证书的。

如果证书签发失败或遇到问题，可以检查下 `CertificateRequest` 类型的资源，查看其事件记录来排错。

### Longhorn存储

`Longhorn` 是k3s官方文档中，存储相关文档中提及的分布式块存储解决方案。迫于 local-path 不好用，rook-ceph 又太重，别无选择，只能用它。

首先需要在每一台需要部署 Longhorn 的节点上安装一个软件包，在 CentOS 7 下是 `iscsi-initiator-utils`, 直接yum安装就好，其它发行版的只能搜索下了。

```bash
kubectl apply -f https://raw.githubusercontent.com/longhorn/longhorn/master/deploy/longhorn.yaml
```

执行上述指令，安装好 Longhorn 后，等待容器全部正常运行，然后为其WEB面板创建 Ingress 入口

*longhorn-ingress.yaml*

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: longhorn-ingress
  namespace: longhorn-system
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/ssl-redirect: 'false'
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: 'Authentication Required '
spec:
  tls:
  - hosts:
    - long.example.org
    secretName: longhorn-tls
  rules:
  - host: long.example.org
    http:
      paths:
      - path: /
        backend:
          serviceName: longhorn-frontend
          servicePort: 80
```

修改域名并创建，然后创建用于认证所使用的账号密码

```bash
USER=<USERNAME_HERE>; PASSWORD=<PASSWORD_HERE>; echo "${USER}:$(openssl passwd -stdin -apr1 <<< ${PASSWORD})" >> auth

kubectl -n longhorn-system create secret generic basic-auth --from-file=auth
```

然后就可以访问域名，登录并管理存储引擎了。

> k3s与longhorn配合似乎有问题，一定要有WEB面板进行操作后才能正常挂载到容器中。


### Kubernetes Dashboard

参照 [文档](https://rancher.com/docs/k3s/latest/en/installation/kube-dashboard/) 创建好相关部署与角色，然后创建一个Ingress开放访问即可。

*dashboard-ingress.yaml*

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    cert-manager.io/cluster-issuer: "acme-prod"
    kubernetes.io/ingress.class: "nginx"
    ingress.kubernetes.io/protocol: https
    nginx.ingress.kubernetes.io/backend-protocol: https
  name: dashboard
  namespace: kubernetes-dashboard
spec:
  tls:
  - hosts:
    - dash.example.org
    secretName: dashboard-tls
  rules:
  - host: dash.example.org
    http:
      paths:
      - backend:
          serviceName: kubernetes-dashboard
          servicePort: 443
        path: /
```

等待一会，访问试试，选用Token认证并填入Token即可。


## 总结

至此所有必须的组件都部署完成，下一篇会记录如何在集群中部署 `gitea` 服务，并恢复老的备份到其中。