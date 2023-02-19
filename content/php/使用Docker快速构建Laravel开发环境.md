---
title: '使用Docker快速构建Laravel开发环境'
date: 2016-10-21
license: CC BY-NC-SA 3.0
---

## Docker简介

Docker是一个虚拟化容器引擎，跟虚拟机类似，不过更加轻量级。对于开发者来说，Docker的出现无疑是种福音。借助Docker，我们可以快速批量构建相同的环境，可以更加方便的对应用进行伸缩，以便更加灵活的控制应用的负载能力。我们还可以将其应用在开发中，使用Dockerfile快速构建统一的开发环境，避免因环境问题导致的BUG。许多云服务企业提供商业化的Docker容器资源，通过可定制的Dockerfile脚本来描述你需要的环境，以便快速构建生产环境和对生产环境进行伸缩控制。

## Dockerfile简介

Dockerfile是Docker容器的“说明书”，用来描述Docker容器的构建过程。在同一份Dockerfile下，只能生成同一种环境，这种 `唯一性` 一定程度上保证了应用运行在容器中的可靠性。

Dockerfile的关键字只有寥寥几个，所以学习成本非常低。你可以很快速的学会Dockerfile的编写，但是要写出好的Dockerfile，还得多多琢磨。

Dockerfile中常用的关键词大概就 `FROM`  `RUN`  `WORKDIR`  `CMD`  `ENTRY` ，搞清楚它们的用法就基本学会了Dockerfile的编写方法，所以说它非常简单。

## docker-compose简介

`docker-compose` 是一种快速整合Docker容器的辅助工具，它通过读取 `docker-compose.yml` 文件来分析其中所定义的各项 `service` 之间关系，然后自动关联好。这大大简化了应用运行环境的构建，使我们可以更加方便的构建出完整的应用运行环境。

> 大多数情况下，一个应用所需要依赖的服务都不止一个。以一个最基础的PHP应用来说，一般情况下至少会依赖 NginX MySQL PHP 三种软件，为了充分体现出容器化应用的优势，我们一般会将这三种软件独立构建成三种服务（service），然后相互关联起来（NginX关联PHP，PHP关联MySQL），这样一旦某一服务的负载过高，我们就可以通过使用相同的Dockerfile快速生成相同的服务，提高整个系统的吞吐能力。

## 构建Laravel开发环境

### 需求分析

Laravel作为一个PHP应用框架，最基础的运行环境就是 `LNMP` 。现代WEB应用的运行环境大多需要使用到NoSQL服务，所以一个 `Redis` 服务就显得很有存在的必要了。

所以需要构建的服务大致如下列：

* Linux
* NginX
* MySQL
* PHP
* Redis

### 软件挑选

确定了要构建的服务，我们需要为服务所用软件挑选一个合适的版本，既不能太过”时髦“，也不能太过”守旧“。

为了压缩生成好的容器的大小，我选择了 `Alpine` 作为容器的系统，版本则选用其最新稳定版本3.4。

> Alpine是一个非常非常小的Linux系统，非常适合作为Docker容器的操作系统，其内置的包管理器存放了大部分常用软件，强烈推荐。

由于系统软件仓库的限制，以及对开发环境下的具体要求的考虑，其余软件都是直接使用官方仓库最新版本。

### 编写Dockerfile

因为是开发环境，不要求负载和伸缩能力，所以我将PHP和NginX放在一个容器中，这样可以方便配置NginX和PHP-FPM。

取一个Redis容器的Dockerfile贴这方便看，当个例子吧。

```
FROM alpine:3.4

RUN apk -f update
RUN apk -f add redis

COPY redis.conf /etc/redis.conf

EXPOSE 6379

CMD ["/usr/bin/redis-server", "/etc/redis.conf"]
```

### 编写docker-compose.yml

容器的构建脚本编写好后，我们需要将各个容器关联起来，这样才能形成一个完整的应用运行环境。

使用docker-compose来快速关联容器，示例如下：

```yaml
version: "2"
services:
  web:
    build: "web"
    volumes:
      - "..:/www"
      - "./web/logs:/var/log/web"
    ports:
      - "8080:80"
    links:
      - db
      - redis
  db:
    build: "mysql"
    volumes:
      - "./mysql/data:/var/lib/mysql"
    environment:
      MYSQL_ROOT_PASSWORD: "root"
      MYSQL_DATABASE: "app"
  redis:
    build: "redis"
```

`services` 节点下就是各个服务了，服务下的 `links` 节点定义了依赖服务，通过它可以快速声明服务之间的依赖关系。

### 生成容器并运行

在docker-compose.yml所在目录下执行 `docker-compose build` 命令，它会自动分析yml文件并自动构建容器。等待容器全部构建完成后，执行 `docker-compose up` 就可以直接启动所有服务了。该启动方式是交互式的，方便DEBUG，如果确定没有任何问题了，可以使用 `docker-compose up -d` 让其后台运行。

常用命令：

* docker-compose build 用于构建yml文件中定义的各项服务所需的容器
* docker-compose up    交互式运行服务，方便DEBUG
* docker-compose up -d 非交互式运行服务
* docker-compose stop  停止yml文件中定义的服务
* docker-compose exec [service_name] [...command] 在对应服务所在容器中执行指定命令

## 总结

Docker容器技术大大方便了开发者统一开发环境，也增强了应用的抗压能力。它的出现，无论是对于开发者，还是对于运维，都是一件大好事。我对Docker的认知还很浅薄，并没有系统的去查看其官方文档，也没有阅读任何有关书籍，文中内容难免有不当之处，看官请海涵。

我将自己写好的构建脚本开源在了Github上，如果您有兴趣，可以访问 [laeo/booster](https://github.com/laeo/booster) 进行查看。
