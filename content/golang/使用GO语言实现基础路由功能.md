---
title: '使用GO语言实现基础路由功能'
date: 2016-09-04
license: CC BY-NC-SA 3.0
---

## 什么是 “路由器” ？

“路由器” 是一个抽象的描述，是对WEB框架中负责解析、管理URL的组件的统一称呼。使用 “路由器” 来方便URL的管理（生成、解析），由于现代WEB应用的复杂程度日渐加深，“路由器” 的使用变得愈加普遍。

## “路由器” 的基本原理

“路由器” 本质上是通过对客户端请求的 `URI` 进行解析，从而对系统的运行加以引导的工具。在PHP中可以使用 `$_SERVER` 全局变量获取到用户请求的URI，然后通过解析该URI，执行 `路由器` 中注册的对应的 `控制器方法` ，到此路由器的工作就已完成。

## GO语言下的 “路由器” 实现

在实现该功能之前，我们需要先搞清楚自己到底需要做些什么，这样才不会漫无目的的 “瞎整”。

看看以下摘自GO语言官方文档的代码

```golang
http.HandleFunc("/bar", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, %q", html.EscapeString(r.URL.Path))
})

log.Fatal(http.ListenAndServe(":8080", nil))
```

它实现了一个基本的WEB服务器功能，通过引入 `net/http` 包来快速构建WEB服务器，使用 `http.HandleFunc` 来注册控制器函数，使用 `http.ListenAndServe` 来启动WEB服务器。

查看文档之后发现该方法不足以称之为 “路由器”，因为其只能简单的实现 `URI到控制器函数` 的导航，并不能满足大部分WEB应用的实现需要。我们需要对它进行扩展，增强它的功能。

在 `net/http` 包的文档中可以查找到， `http.ListenAndServe` 方法支持两个参数，第一个参数接收HTTP服务监听的地址，而第二个参数接收的是一个 `接口实例` 。我们要实现自己的 `路由器` ，该接口是重点。

根据官方文档描述，开发者可以自由定义属于自己的WEB服务器，通过实现 `ServeHTTP` 方法来手动分发客户端请求。

```golang
type router struct{}

func (r *router) ServeHTTP(rw http.ResponseWriter, rq *http.Request) {
    // 在此处分发客户端请求
}
```

如上述方式构建一个属于你的 `路由器` 组件，通过实现 `ServeHTTP` 接收者来增强其功能，比如增加URI参数提取、模糊匹配等等。

路由器的重点是 `匹配URL` ，那么肯定需要用到 `正则表达式` 。Go语言提供了处理正则表达式的支持库，所以我们只需要知道如何使用即可。

```golang
//下述代码是不完整的代码，完整代码请查看我的github仓库，谢谢
//只是为了说明而截取的部分代码
func (r *router) ServeHTTP(rw http.ResponseWriter, rq *http.Request) {
        //生成正则匹配实例，用于之后的匹配
        //实际使用中，由于golang的编译型语言的特性，我们可以将该过程放置在路由规则的设置阶段
        //也就相当于预先编译生成好匹配规则，方便服用，避免新请求到达后重复编译的性能损失
        re := regexp.MustCompile("/(?P<handler>[a-zA-z0-9]+)")

        //匹配URL，不能匹配则跳过
        if re.MatchString(rq.URL.Path) {
            ns := re.SubexpNames()[1:] //取得正则表达式中命名切片，忽略第一个
            vs := re.FindStringSubmatch(rq.URL.Path)[1:] //取得匹配到的值得切片，忽略第一个

            //检查命名子式数量是否匹配
            //正常情况下一定是一个子匹配项对应一个匹配结果，否则不应该标记为匹配成功
            if len(ns) != len(vs) {
                panic(string("URL parameter mismatch"))
            }

            //循环生成键值对并存储到context变量中
            //也就是将URL中得“变量”提取出来方便取用
            for i, k := range ns {
                c.Params[k] = vs[i]
            }

            //执行对应的回调函数
            //这个函数应该与上述编译的正则表达式相对应，也就是一个路由规则（正则表达式）至少对应一个回调函数
            //不然你的业务逻辑该在什么地方调用呢？
            fn(rw, rq, c)

            //终止匹配
            return
        }
}
```

看起来很简单是不是？ 确实很简单。大部分“路由器”组件都是通过正则来匹配预设的规则与客户端请求的链接的，虽然会损失一些性能，但是更加灵活、方便。

如果需要查看详细的例子，请查看我的github仓库：

> [laeo/gorest](https://github.com/laeo/gorest)

## 最后

写得或许有些浅薄，不过我学习golang也并不久，还有很多坑等着我踩，这算是预热吧。
