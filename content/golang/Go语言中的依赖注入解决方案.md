---
title: 'Go 语言中的依赖注入解决方案'
date: 2020-08-16
license: CC BY-NC-SA 3.0
---

Go 语言在我的认知中，是一种面向过程的函数式编程语言。所以通常我开发时，基本都是一把梭，并没有太过注重代码的结构。但是最近在开发“奋斗社”社区系统时，一直有感于代码结构太冗杂、混乱，所以有寻找相应的工具来处理。

根据我在实际开发过程中的感受，我认为我首先就需要一个能够对结构体注入给定数据的工具，比如数据库连接实例，如果没有自动注入的工具，那么在我调用各种函数时

1. 要么手动在初始化结构体时注入连接实例。
2. 要么将实例存储在独立包中的导出变量中。

之前一直是使用的第二种方式，但不管那种方式，都没有写 PHP 这类动态脚本语言的方便顺手，因此我在社区搜索了相关的依赖注入的实现。

## 依赖注入（DI）

依赖注入是面向对象编程常用的代码解耦方法，通常是通过 `反射` 来获取调用者所需的参数信息，并根据相应的类型，从对象容器中查找相应的实例，最后将确定出的依赖以参数的形式传递给调用者。

从实现的逻辑来看，依赖注入就是很简单直接的，将“我要”转变为“给我”，从主动的强依赖，变为被动的弱依赖。并且使用注入的形式提供调用依赖，可以方便的进行测试。

## Go 语言的 DI

我所搜到的热门的依赖注入工具有三个，分别是由谷歌推出的 [wire](https://github.com/google/wire) 和由 Uber 推出的 [dig](https://github.com/uber-go/dig)。当然还有其它的一些实现，但是时间精力有限，我就先看这两个✨数量比较高的。

从各自文档以及示例中可以看出两个仓库虽然实现方式不同，但总的工作逻辑还是相同的，都是基于预设的基础依赖项，解析并填充关联的依赖项，直到最终的入口点。

`wire` 是通过代码生成完成的依赖分析与注入， `dig` 则是运行时通过“反射”进行依赖分析与注入，明显前者性能要比后者好，所以我选择用前者。

## wire

在接入 wire 之前，我先从现有代码结构上观察，哪些是需要（且能够）进行依赖分析注入的。我从 “奋斗社” 的代码中，找出了需要依赖注入的地方

* 控制器 Controller
* 数据服务 Service

其它的比如模型、钩子函数、纯函数之类的，无法用代码生成的形式处理依赖问题，只能手写。

为了达到为控制器注入依赖的目的，我为每个控制器结构添加了一个构造函数，比如用户控制器的构造函数如下

```go
func NewUserController() runtime.Controller {
	wire.Build(
		pkg.ApplicationSet,
		wire.Struct(new(User), "*"),
		wire.Bind(new(runtime.Controller), new(*User)),
	)
	return nil
}
```

通过在同级目录下执行 `wire` 命令，自动生成同名函数，外部可直接调用并获取注入完依赖的控制器实例。

然后在将 `控制器` 注入到 `路由器` 时，遇到问题了。每个控制器都是一个 Provider，如果要为控制器注册相应路由规则，那么就需要另一个 Provider 依赖一个控制器，这样的话，有多少个控制器就要写多少个相应的 Provider。最大的问题是，wire 不支持同一个类型作为入参与出参，也不支持没有出参，所以无法直接使用它来处理路由规则的注册。

为了处理路由规则注册的问题，我为项目添加了一个接口 `runtime.Controller` ，这个接口要求结构必须实现一个函数 `RegisterRoute` ，在这个函数中注册控制器下的各个方法到路由。然后我们就可以在提供者（Provider）中声明，需要注入控制器切片（[]runtime. Controller）类型的依赖项。

```go
func createServerMux(wrapper muxie.Wrapper, cs []runtime.Controller) *muxie.Mux {
	m := muxie.NewMux()
	m.PathCorrection = true
	m.Use(wrapper)

	for _, ctrl := range cs {
		ctrl.RegisterRoute(m.Of("v1"))
	}

	return m
}
```

看 Issue 列表里有其他人也提到过类似问题，暂时只能手写 Provider 来初始化控制器切片，麻烦是麻烦点，至少还能用嘛。

```go
func resolveControllerSet() []runtime.Controller {
	return []runtime.Controller{
		app.NewUserController(),
		app.NewTopicController(),
		app.NewNotificationController(),
		app.NewCommentController(),
		app.NewAnnounceController(),
	}
}
```

## 单例模式

对于数据库这类通常自带连接池的库，我们通常只需要初始化一个实例就行，wire 要实现单例模式，可以使用 `wire.Value` 或者 `wire.InterfaceValue` 来实现，也可以在 Provider 函数中实现单例逻辑，如我在 “奋斗社” 程序中就使用如下方式实现了单例数据库实例

```go
var db *pg.DB

// ProvideSingleton provides singleton DB instance.
func ProvideSingleton() *pg.DB {
	if db == nil {
		c := config.ProvideSingleton()

		db = pg.Connect(&pg.Options{
			Addr:     c.DB.Addr,
			User:     c.DB.User,
			Password: c.DB.Secret,
			Database: c.DB.Name,
		})

		if c.Debug {
			db.AddQueryHook(dbLogger{})
		}

		if _, err := db.Exec("select 1"); err != nil {
			panic(err)
		}
	}

	return db
}
```

逻辑一目了然，全局变量存储连接实例，供应函数内判断是否初始化过，没初始化就走初始化流程，唯一有点问题的或许就是报错后直接 panic 吧。

## 总结

大概的用法就写这些就足够了，实际上对比两种依赖注入方式，都是将“面向过程编程”中的部分过程，单独抽离为一个函数体，以便复用。比如数据库的初始化，每个控制器函数都要用到，如果没有依赖注入，或者放到单独的包里维护，那么每个控制器函数里都要写一遍数据库连接的逻辑。而依赖注入正是将这一部分单独抽离，作为一个独立的代码块进行执行，并将结果用参数的形式提供给原函数。

目前来看，Go 语言的依赖注入功能还非常僵硬，对于单纯的函数调用还无法做到自动注入依赖（或许某些使用反射实现的工具可以做到），还有就是比如数据库模型库的钩子函数也无法很好的兼容，只能在内部进行各种初始化工作。希望范型正式发布后，能够给 Go 的生态带来地震般变化吧。
