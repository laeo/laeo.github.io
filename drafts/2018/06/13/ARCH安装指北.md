# ARCH安装指北

> Author : laeo

> Date   : 2018/06/13

> License: CC BY-NC-SA 3.0

## 制作安装盘

首先去 ARCH 官网 [下载](https://www.archlinux.org/download/) 最新版本的 ISO 镜像文件。

下载好后，使用启动盘制作工具制作U盘启动盘，制作工具推荐 [rufus](https://rufus.ie)。

## 设置安装环境

开机选择 U盘 进行引导，大部分情况下即可正常进入到命令行模式的安装环境了。

> ARCH 安装环境并没有图形界面，因为安装非常简单。

安装需要联网下载系统依赖包，我这里使用 WIFI 进行联网。

在终端执行 `wifi-menu` 进入简单的图形界面，选择要连接的 WIFI 名称，点击回车后输入密码，稍等片刻即可连接成功。

> 可以使用 `ping -c4 www.baidu.com` 确定联网是否成功。

联网成功后，执行 `pacman -Syy` 同步包管理数据，然后执行 `pacman -S reflector` 安装用于筛选软件源的工具。

```bash
reflector -c CN -l 3 --sort=rate -p https --save /etc/pacman.d/mirrorlist
```

上述命令用于测试并挑选出下载速率最快的、所属中国区并使用 HTTPS 协议的三个源，并将其写入配置文件中。
如此一来，就不会因为下载速度而影响安装速度了。

> 注意，由于 ARCH 的软件更新非常频繁，各大镜像节点速度的限制，安装时有可能出现找不到软件包的 404 报错，稍候再试即可。

## 硬盘分区

首先需要查看系统分区信息

```bash
lsblk
```

输出的内容类似于

```
NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
sda           8:0    0 931.5G  0 disk 
└─sda1        8:1    0 931.5G  0 part 
nvme0n1     259:0    0 953.9G  0 disk 
├─nvme0n1p1 259:1    0   565M  0 part 
├─nvme0n1p2 259:2    0 100.6G  0 part 
├─nvme0n1p3 259:3    0   101G  0 part 
├─nvme0n1p4 259:4    0 750.9G  0 part 
└─nvme0n1p5 259:5    0  1003M  0 part
```

我系统的分区如上，`nvme0n1p1` 是 `UEFI` 分区，`nvme0n1p2` 是 WIN10 所在分区， `nvme0n1p3` 将用于安装 ARCH，`nvme0n1p4` 用于存储数据。

双系统可以在 WIN10 下使用磁盘管理器先调整好分区，也可以使用 ARCH 提供的 `cfdisk` 来进行可视化分区。必须要记住的是，至少要分一个 `EFI System` 分区和一个 `Linux File System`分区。

> 根据网上资料，EFI 分区至少要保证有 500MB 容量。

分区完成后，使用 Linux 命令对分区进行格式化

```bash
#格式化EFI分区
mkfs.fat -F 32 /dev/nvme0n1p1

#格式化Linux分区
mkfs.ext4 /dev/nvme0n1p3
```

> 存储设备在未挂载到系统前，都以设备文件的形式存在于 `/dev` 路径下，格式化之前可以先挂载到系统检查下。

## 安装基础系统

首先挂载系统分区

```bash
mount /dev/nvme0n1p3 /mnt

mkdir /mnt/boot

mount /dev/nvme0n1p1 /mnt/boot
```

将系统分区挂载到 `/mnt`，然后手动创建 `/mnt/boot`，再将引导分区挂载过去。
然后只需简单的执行 `pacstrap /mnt base` 即可自动安装系统。

> 可选的 `base-devel` 用于支撑 `AUR` 上的软件包的本地编译。

当命令执行完毕后，需要更新 `fstab` 文件

```bash
genfstab -U /mnt /mnt/etc/fstab
```

最后需要安装 `systemd-boot` 引导，但是留到下一节写吧。

## 初始化系统

通过执行 `arch-chroot /mnt` 切换到刚安装好的系统中，然后我需要对系统做一些初始的操作，以便第一次启动能够正常运行

### 安装 UEFI 引导

```bash
bootctl --path=/boot installl
```
简单快捷，装好了，但是还没彻底完成，需要手动处理配置文件（这点没有 GRUB 省心）。

> 注意，双系统在执行上述命令前需要安装 `efibootmgr` 软件来检测开机引导信息。

```bash
cp /usr/share/systemd/bootctl/arch.conf /boot/loader/entries/
```

将内置的配置模板拷贝到配置文件目录下，然后执行 `blkid /dev/nvme0n1p3` 查询系统所在分区的 UUID。

修改上述配置文件中的`PARTUUID`为分区的 UUID，将 `rootfstype` 改为 `ext4`。

最后，执行

```bash
mkinitcpio -p linux
```

生成初始内存盘。

### 设置主机名

```bash
echo laptop > /etc/hostname
```

### 设置时区

```bash
ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
```

### 创建个人账户

```bash
useradd -m -G users,wheel -s /bin/bash laeo
```

### 修改登录密码

```bash
passwd root

passwd laeo
```

### 安装基础程序

```bash
pacman -S vim git dialog wpa_supplicant wireless_tools sudo
```

### 设置账户权限

执行 `vim /etc/sudoers` 并删除文件中 `%wheel` 前的注释符，现在所有处于 `wheel` 用户组的账号都可以使用 `sudo` 命令来调用管理员权限了。

### 重启系统

至此，整个安装流程就基本完成了，所有操作都可以从 ARCH 官方 WIKI 中找到。

## 安装桌面环境

重启后还是一块黑白屏，我需要图形界面！

图形界面我个人习惯 `KDE` 和 `DDE`，两者皆是开源产物，只不过后者是国内企业开发并开源的，所以后者对国内软件支持比较优秀。

无论哪一个，都需要安装最基础的 `xorg-server` 全家桶，当然你也可以使用 `wayland`，但是 DDE 目前为止不支持，理由是不够稳定。

安装非常简单，依照 ARCH WIKI 中的指导一步步安装就行了，懒得写了。

## 英伟达“易爆炸”

双显卡机器安装 Linux 很容易遇到双显卡引起的各种扯淡毛病，我自己就遇到过各种各样的。

有系统的安装环境是图形界面，加载不进去。有的装好了系统，开机黑屏。有的开机进了登录界面，刚登录进桌面就卡死。

各种搜索，无非就是内核参数加 `nomodeset`，屏蔽开源独显驱动 `nouveau`，甚至还有疯到让屏蔽集显驱动的……

我都试了，没用，`lspci` 执行就卡死。后来在 Gayhub 搜到个 [Issue](https://github.com/Bumblebee-Project/Bumblebee/issues/764#issuecomment-234494238)，照着回复里尝试加了内核参数后，总算不卡死了。

现在我是每天开电脑第一件事，就是执行 `sudo pacman -Syyu` 滚动更新，我等着下一次的“卡死”。