---
title: 'Eloquent模型子类MorphToMany调用doesntHave失效问题'
date: 2018-08-11
license: CC BY-NC-SA 3.0
---

## 编写BUG之路

在私人项目中使用了 `laravel-permission` 包做权限管理，用户表 `users` 需要扩展出不同的角色。考虑到项目规模，我将用户数据和后台客服数据统一存放在用户表中，然后根据角色信息来判断账户的归类。如此，我在 `App\User` 模型中进行登录认证等统一的用户操作，但是新建 `App\Client` 模型来专门管理普通用户的数据，该类继承自用户模型类，可以方便的共享一些通用属性。

```php
namespace App;

class Client extends User
{
    protected $table = 'users';
}
```

为了方便使用用户模型查找数据，我在 `App\Client` 中增加了 `全局作用域` 来自动过滤有权限的用户：

```php
// 在 app/Client.php 中
static::addGlobalScope('client', function (Builder $builder) {
    $builder->doesntHave('roles');
});
```

原本我以为加上上述代码后，就可以正常取出没有权限的普通账户了，可惜事实并非如此，该作用域完全没有起到作用，所有用户数据都被取出来了。我写了一个BUG！

## 解决BUG之路

出现这样的问题，首先想到的就是去该包的 issue 页面搜索，看看有没有相关的资料，可能是我关键词有问题，并没有搜索到相关资料。搜索引擎也是相同的结果，没查到 `doesntHave` 失效的原因。

那就只能自己动手咯。

首先想到打印执行的 SQL 出来看看：

```php
// app/Providers/EventServiceProvider.php 中

DB::listen(function ($query) {
    Log::debug($query->time . '@' . $query->sql, $query->bindings);
});
```

通过注册上述监听器后，在日志文件中找到了相关的 SQL 记录。看了下提交的参数，其中有个 `App\\Client` 引起我的注意，在我从数据库中查询到的数据里，都是存储的原始的 `App\User` ，那么只需要将这个参数改正确就行了。我猜测是因为普通用户的模型是继承的，多对多关联的代码在执行的时候自动获取了当前实例的类名，所以才导致查询不到记录。

找到问题所在就好办了，编辑器里跟着源码挨个跳转，最终找到了它

![screenshot](/static/images/2018-08-11-eloquent-morphToMany.png)

在 `Illuminate\Database\Eloquent\Relations\MorphToMany` 中我找到了一个关键函数 `getMorphClass` ，这货就是给多对多关联提供模型类名的，所以我果断在 `App\Client` 中重写了该方法，以使之返回固定的 `App\User` 。

修改过后，系统运行果断正常起来。**BUG FIXED！**
