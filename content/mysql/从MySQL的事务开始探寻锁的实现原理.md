---
title: '从MySQL的事务开始探寻锁的实现原理'
date: 2018-10-31
license: CC BY-NC-SA 3.0
---

## MySQL 事务的四大特性

MySQL 事务的四大特性分别为：原子性、一致性、隔离性、持久性，英文简写 `ACID` 。在深入该部分知识的过程中，突然想到 “锁” 在事务中的作用，进而又思考起 “锁” 的实现原理起来。

## MySQL 事务中的锁

在实现事务的过程中，为了独占某资源，一定离不开锁的使用。对资源加锁，在 MySQL 中存在两种类型的锁，即 “共享锁” 和 “独享锁”。在数据记录上调用共享锁后，其它事务仍然可以继续为其添加共享锁，但是不能添加独享锁。这意味着，不同事务可以同时锁定并读取相同的数据记录。而独享锁则是事务独占该条数据记录，独享锁是用于修改数据的。

那么，锁是如何实现的呢？

## “锁”的实现

从代码层面来讲，如果要纯手动实现一个锁，那么无非就是在内存中存储一个记录，用于标记锁的开关状态。但是仔细想想，用于操作该记录的操作，是否是原子的呢？操作系统层面来讲，它如何保证我在多线程环境下对该 “锁” 的操作的原子性？

如果我们的 CPU 是单核心的，那么可以猜到，所有指令都是一条一条执行的，那么我们在内存中标记一个锁，就可以认为从操作系统层面来讲，该锁的状态切换是原子性的。然而事实并非如此，因为指令的执行是可以中断的。假设我们在读取到锁的状态后，即将对该状态进行判断的一瞬间，操作被中断了，操作系统自动调度了其它线程，刚好该线程也来进行加锁。结果就是两个线程都加锁成功，所以就算是单核心也无法使用这种姿势来实现原子锁。

而在多核心环境下，甚至不需要等到操作被中断，只需要多个核心同时进行加锁操作，锁的原子性瞬间毁灭。

那么到底如何实现真正的原子锁呢？最终还是需要硬件来提供特性支持。查询资料得知，硬件层面的 CPU 提供了锁内存总线的功能，只要在锁内存总线的状态下执行原子操作即可实现原子锁。果然最终还是得靠硬件层面的支持，上层的所有锁实现都基于此。
