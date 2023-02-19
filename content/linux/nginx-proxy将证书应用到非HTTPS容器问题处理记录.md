---
title: 'nginx-proxy将证书应用到非HTTPS容器问题处理记录'
date: 2019-03-17
license: CC BY-NC-SA 3.0
---

## 问题描述

某台 ECS 实例之前就以 docker + nginx-proxy + letsencrypt-nginx-proxy-companion 的形式托管了数个 WEB 服务，但是因为前端挂了 CDN 的缘故，都没有做证书配置等操作。这次由于将另外一台服务器的 gitea 代码管理服务迁移过来，考虑到要提供 SSH 协议的代码克隆服务，故前端没有使用 CDN，而是通过 let's encrypt 组件自动申请的证书来配置 HTTPS。

然而在配置完整个环境并完成数据迁移后，gitea 是可以正常以 HTTPS 协议访问了，之前本就存在的服务却全都无法正常访问，浏览器不断跳转以至于警告并自动停止请求。查看了 nginx-proxy 的容器日志，发现请求并没有到达此处，于是就在想是不是 CDN 出了问题。在临时取消了 CDN 接入后，依旧不能正常访问，只不过错误形式由原有的循环跳转变成了连接不安全！

看了具体错误信息，才发现在取消 CDN 接入后，本该是 HTTP 协议的请求，变成了使用 gitea 容器所用证书的 HTTPS 协议的加密请求。那么就要看看是不是配置错误了……

## 探索发现

反复查看 nginx-proxy 与 letsencrypt-nginx-proxy-companion 的文档，也并没有发觉有使用方式上的问题，在创建 gitea 容器的时候，也只是依照文档说明指定了 `VIRTUAL_HOST`  `VIRTUAL_PORT`  `LETSENCRYPT_HOST`  `LETSENCRYPT_EMAIL` 这几个环境变量，并无再多设置。那么为何会有这种情况呢……

是不是域名的问题？gitea 服务我绑定的域名是 `t.cn` (privacy protected)，而其余服务都是该域名的二级域名，是否是该原因导致在 nginx 配置生成过程中，产生了错误的判断？

终于……文档中出现了这段话 [wildcard-certificates](https://github.com/jwilder/nginx-proxy#wildcard-certificates)：

> Wildcard certificates and keys should be named after the domain name with a .crt and .key extension. For example VIRTUAL_HOST=foo.bar.com would use cert name bar.com.crt and bar.com.key.

厉害了我的 nginx-proxy，就是这个原因，这货把根域名的证书默认就当特么 “野卡” 证书用了。

没想到还有这个坑……

## 解决方案

* 重建容器，并指定 HTTPS_METHOD=nohttps 禁止为该容器配置 HTTPS 服务；
* 重建容器，指定其它域名；
* 重建容器，配置自动生成 let's encrypt 证书；
* 重建容器，指定根域名创建的证书类型为通配符证书；

数个方案，没一个合我心意，但是能解决问题。
