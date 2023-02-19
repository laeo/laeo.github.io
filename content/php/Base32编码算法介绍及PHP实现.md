---
title: 'Base32编码算法介绍及PHP实现'
date: 2016-07-27
license: CC BY-NC-SA 3.0
---

## 什么是Base32编码算法

Base32不知道，那么Base64你肯定知道吧？它们都是用于对字符串数据进行编码的一种算法。Base64比Base32更加常见，PHP只内置了Base64编码算法的实现函数。如果不是研究 `TOTP` 的时候发现谷歌的两步验证软件使用到了这种算法，我都不会知道有它。

## 有什么作用

限于我个人的认知范围，目前只知道谷歌两步验证功能中使用到了它。它与Base64是差不多的，差异只在于字符集的大小。

## 字符集哈希表

> 该字符集哈希表来源于算法文章 [RFC4648](https://tools.ietf.org/html/rfc4648)

|  index  |  value  |  index  |  value  |  index  |  value  |  index  |  value  |
|---------|---------|---------|---------|---------|---------|---------|---------|
|    0    |    A    |    8    |    I    |    16   |    Q    |    24   |    Y    |
|    1    |    B    |    9    |    J    |    17   |    R    |    25   |    Z    |
|    2    |    C    |    10   |    K    |    18   |    S    |    26   |    2    |
|    3    |    D    |    11   |    L    |    19   |    T    |    27   |    3    |
|    4    |    E    |    12   |    M    |    20   |    U    |    28   |    4    |
|    5    |    F    |    13   |    N    |    21   |    V    |    29   |    5    |
|    6    |    G    |    14   |    O    |    22   |    W    |    30   |    6    |
|    7    |    H    |    15   |    P    |    23   |    X    |    31   |    7    |

> ABCDEFGHIJKLMNOPQRSTUVWXYZ234567

## 算法

首先给定一串字符串，作为待编码的字符串。之后按字符分割该字符串，将其分割为单个字符串为一个元素的数组。接下来就是循环该数组，将其中的每个字符串转换为ASCII值。将得到的所有ASCII值分别转换为二进制值，同时要对每一次转换后的结果进行判断，保证转换后的二进制值为 `八位` 二进制。

然后把所有的二进制值依照原字符的顺序依次拼接成字符串，现在我们得到了一个由 `0` 和 `1` 组成的字符串，接下来要对其进行操作。

将该字符串分割成五位字符一组的数组，因为二进制的 `011111` 转为十进制后的值是 `31` ，所以我们取五位字符为一组，这样子每组二进制的最大十进制数值就是 `31` 。

> 在分割二进制字符串的时候，我们可能会遇到 `不足五位` 的情况，解决的办法是 `右补零` 。

这下一切都清晰了吧？将分割好的二进制字符分别转换为十进制，然后到上述哈希表中查找对应字符，将所有对应的字符拼接起来，就成了Base32编码算法的计算结果。

> 根据资料来看，我们需要保证最终的结果字符串需要保证 `40 Bits Aligned` ，所以我们需要判断结果字符串是否已经对齐，如果没有对齐，就在末尾填补上 `=` 。

## PHP实现

```php
class Base32
{
    /**
     * @type string
     */
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Base32 Encoder
     *
     * @param  string $str
     * @return string
     */
    public static function encode($str)
    {
        static $map;

        // Generates the chars map
        if (is_null($map)) {
            $map = str_split(self::ALPHABET);
        }

        // Returns null if no data given
        if (!$str) {
            return null;
        }

        // Process the given str
        $str = str_split(strval($str));
        $str = array_map(function ($char) {
            return str_pad(base_convert(strval(ord($char)), 10, 2), 8, '0', STR_PAD_LEFT);
        }, $str);

        $binary   = join('', $str);
        $fiveBits = str_split($binary, 5); // 000000 => 0 && 011111 => 31
        $maped    = array_map(function ($bit) use ($map) {
            $bit   = strval($bit);
            $bit   = str_pad($bit, 5, '0', STR_PAD_RIGHT);
            $index = base_convert($bit, 2, 10);
            return $map[$index];
        }, $fiveBits);

        $encoded = join('', $maped);
        $pad     = strlen($encoded) % 8;

        return $encoded . str_repeat('=', $pad ? 8 - $pad : 0);
    }

    /**
     * Base32 Decoder
     *
     * @param  string $str
     * @return string
     */
    public static function decode($str)
    {
        static $map;

        // Generates the chars map
        if (is_null($map)) {
            $map = str_split(self::ALPHABET);
            $map = array_flip($map);
        }

        // Returns null if no data given
        if (!$str) {
            return null;
        }

        $str      = rtrim($str, '=');
        $maped    = str_split($str);
        $fiveBits = array_map(function ($char) use ($map) {
            $index = $map[$char]; // Exp: ($char = A) => ($index = 0)
            return str_pad(decbin($index), 5, '0', STR_PAD_LEFT);
        }, $maped);

        $binary = join('', $fiveBits);
        $binary = str_split($binary, 8);
        $chars  = array_map(function ($bin) {
            $ascii = bindec($bin);
            return chr($ascii);
        }, $binary);

        return join('', $chars);
    }

}
```

> [laeo/base32](https://github.com/laeo/base32)

## 最后

代码写得比较乱，主要是方便一步步弄懂。其中各种函数的使用、闭包的使用，都是为了方便查看，顺便熟悉它们。上述代码已经经过我自己的测试，编码、解码的结果跟某在线编、解码的网站计算的结果完全相同。

才疏学浅，万望见谅。
