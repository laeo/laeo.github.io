---
title: "TOTP原理介绍及PHP实现展示"
date: 2016-07-26
license: "CC BY-NC-SA 3.0"
---

## 什么是 “TOTP”

`TOTP` 是 `Time-based One-time Password` 的英文缩写，翻译为中文即“基于时间的一次性密码”。

## 有什么作用

快节奏的社会，一切讲究快捷、方便，但是安全相关，实在方便不起来， `TOTP` 应运而生。使用该技术可以在降低身份认证复杂度的同时，将安全系数大幅度提高。君不见现在多少网站使用的动态口令功能，基本都是以该技术的为基础。Google Authenticator、Authy 等等软件都使用的该技术，我个人的域名注册商、服务器商也都接入了该技术。

使用该技术来进行身份认证，可以加快认证速度，提高安全性。每个用户的认证口令是随着时间而变化的，无疑给 “黑手党” 们加大了许多难度。

## “TOTP” 的原理

该技术的着重点就在于基于时间，时间是不断变化的，所以基于时间而计算出来的 “密码” 也会是不断变化的。如果我们要使用该技术来进行身份认证，那么就一定要控制好时间变化的速度，否则时间无时无刻都在变化，我们如何进行认证？连输入密码也做不到吧。

所以，控制时间是务必要做到的。那么，这就有点扯淡了。区区凡人还想控制时间？╭(╯^╰)╮

看看下面的PHP代码：

```php

$time       = time(); //取得实际时间，单位秒（unix时间戳）

$validity   = 30; //设置动态密码有效期，给用户输入密码的时间

$realtime   = $time / $validity; //相除得到 “真实时间”

```

发明该算法的大师们很厉害，既然无法控制时间，那么我们就换个方式，变相控制时间。什么方式呢？除法！如果把时间看做被除数，把我们设置的密码有效期看做除数，把计算的结果看做我们取到的 `真实时间` 。如此一来，每当 `实际时间` 走过 `密码有效期` 那么久后，我们取到的 `真实时间` 的数值才会 `+1` 。

说到这里，如果我的表述没有问题的话，看官一定已经大致明白 `TOTP` 到底如何实现了。使用这种方式取到的“时间”，就不必担心时间不停的流逝，毕竟只要没有超过密码有效期，该数值是不会变化的。

细心的朋友一定注意到了，除法可能还有小数呢，到时候小数不停变化，不也一样影响最终结果么？

这是肯定的，所以我推荐使用PHP内置的 `floor()` 函数，该函数可以直接抹去浮点数的小数点后的部分。

> 其实我自己使用的是 `Math` 函数库提供的 `intdiv()` 函数，效果都是一样的，甚至你可以直接 `intval()` 。

## 代码实例

最主要的问题解决后，其它问题基本就不是问题了。下面附上实现代码：

```php
class TwoFactor
{
    /**
     * @var integer
     */
    private $delay = 30;

    /**
     * @var string
     */
    private $secret = null;

    /**
     * Create TwoFactor instance
     *
     * @param string $secret
     */
    public function __construct($secret)
    {
        $this->secret = $secret;
    }

    /**
     * Returns the authenticate code
     *
     * @return string
     */
    public function getCode()
    {
        $atom = floor(time() / $this->delay);
        $hash = sha1($this->secret . dechex($atom));
        $last = substr($hash, -1);
        $pos  = hexdec($last);
        $hex  = substr($hash, $pos, 8);
        $code = (string) hexdec($hex);
        return substr($code, -6);
    }

    /**
     * Try to authenticate
     *
     * @param  string $code
     * @return boolean
     */
    public function auth($code)
    {
        return (boolean) (strval($code) === $this->getCode());
    }
}
```

> [laeo/totp](https://github.com/laeo/totp)

## 最后

仅个人粗浅见识，如有遗漏、误缺，还请见谅。
