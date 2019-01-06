# docker-proxy 实现新建容器后自动创建 nginx 代理

> Author : laeo

> Date : 2018/10/23

> License: CC BY-NC-SA 3.0

## docker-proxy 介绍

[docker-proxy](https://github.com/jwilder/nginx-proxy) 是一款开源的、根据容器自动创建 nginx 反向代理的软件，基于 docker-gen 开发。使用该软件，我们可以实现在创建 web 项目时，快速构建线上测试环境，免去手动配置 nginx 的痛苦。另外，搭配另一款软件——[letsencrypt-nginx-proxy-companion](https://github.com/JrCs/docker-letsencrypt-nginx-proxy-companion)，更能实现自动申请 let's encrypt 免费证书，轻松搭建 HTTPS 站点，可以方便的用于某些线上环境。

## 动手使用

该软件使用非常简单，全程基于 docker 容器软件，只需两步即可。此处我放置的示例命令来自 letsencrypt-nginx-proxy-companion 的使用说明，推荐构建 HTTPS 站点。

```bash
mkdir /var/certs #创建证书存放目录

docker run -d -p 80:80 -p 443:443 \
    --name nginx-proxy \
    -v /var/certs:/etc/nginx/certs:ro \
    -v /etc/nginx/vhost.d \
    -v /usr/share/nginx/html \
    -v /var/run/docker.sock:/tmp/docker.sock:ro \
    --label com.github.jrcs.letsencrypt_nginx_proxy_companion.nginx_proxy \
    --restart=always \
    jwilder/nginx-proxy

docker run -d \
    -v /var/certs:/etc/nginx/certs:rw \
    -v /var/run/docker.sock:/var/run/docker.sock:ro \
    --volumes-from nginx-proxy \
    --restart=always \
    jrcs/letsencrypt-nginx-proxy-companion
```

上述命令执行完成后，我们就正式运行起了 docker-proxy 与 letsencrypt-nginx-proxy-companion 服务。

在此之后，我们在创建新容器的时候，如果需要构建反向代理，那么只需设置一个环境变量 `VIRTUAL_HOST` 即可，docker-gen 软件会通过 docker 的接口取得相关容器的配置信息，并根据该容器的网络配置信息，自动生成 nginx 的配置文件片段，并自动重载 nginx 服务。

如果需要自动申请 SSL 证书，那么还需要设置 `LETSENCRYPT_HOST` 和 `LETSENCRYPT_EMAIL` 两个环境变量，分别表示证书所关联的域名和申请人的邮箱地址，域名必须解析到该服务器上，邮箱必须是真实存在的邮箱。

## 异常排除

### 配置文件无 upstream 或只有 127.0.0.1 down

我在配置好整个系统后，访问发现报 502 错误，然后发现 nginx 的配置文件里，upstream 一栏只有一条

```
server 127.0.0.1 down;
```

经过不断查找，我发现了[它](https://github.com/jwilder/nginx-proxy/issues/793)，阅读后才恍然大悟。

我使用 docker-compose 来整体部署一个项目，但是该工具部署的容器会自有一个 network，与我们直接通过 docker 命令启动的容器不在同一个 network，所以无法直接通信。所以我在项目的 docker-compose.yml 文件中，将每一个服务都设置为 bridge 模式的 network，该问题终于解决。

### 容器未指定 expose 端口

docker-proxy 使用容器指定的 expose 端口来自动设置 upstream，所以如果容器在 Dockerfile 中没有指定一个端口的  话，我们可以使用 docker 命令行的 -p 参数来指定，也可以使用 docker-compose.yml 中的 expose 指令来指定要暴露出来的端口号。

### 容器暴露多个端口

文档中已说明，

> If your container exposes multiple ports, nginx-proxy will default to the service running on port 80. If you need to specify a different port, you can set a VIRTUAL_PORT env var to select a different one. If your container only exposes one port and it has a VIRTUAL_HOST env var set, that port will be selected.

所以可以使用 `VIRTUAL_PORT` 来指定端口。
