# 深度Linux下SS智能分流

> Author : laeo

> Date   : 2018/04/05

> License: CC BY-NC-SA 3.0

## 起因

今天在使用 `dep` 包管理器接管以前写的一个 Go 语言项目时，突然报错无法下载某个包。仔细检查后，无奈的宣布系统设置的全局代理没起作用。

## 处理

查了资料，发现可以用 `ss-redir` + `iptables` + `chnroute` 来做智能分流。

首先，我需要从 `shadowsocks-libev` 中取得 `ss-redir` 程序，在终端中执行

```bash
sudo apt install shadowsocks-libev
```

即可取得我想要的程序，其所在目录为 `/usr/bin/ss-redir`。

然后，我需要获取所有属于中国的 IP 地址，这个可以从 apnic 网站获得，经搜索后找到如下命令

```bash
wget -qO- http://ftp.apnic.net/stats/apnic/delegated-apnic-latest | awk -F '|' '/CN/&&/ipv4/ {print $4 "/" 32-log($5)/log(2)}' | cat > chnroutes.txt
```

经过过滤处理后的路由列表存放于当前目录，名为 `chnroutes.txt` 的文本文件。

最后，我只需想办法将该路由表导入到 iptables 中，然后将符合规则的数据包转发到 ss-redir 提供的透明代理地址即可。

经过搜索，我发现可以使用 `ipset` 程序来完成这一操作，使用下述命令创建路由集

```bash
ipset -N chnroute hash:net maxelem 65536
```

然后循环将之前路由表中取得的路由添加进去

```bash
for ip in $(cat chnroutes.txt); do
  ipset add chnroute $ip
  echo "added $ip"
done
```

然后创建 iptables 规则

```bash
# 在nat表中新增一个链，名叫：SHADOWSOCKS
iptables -t nat -N SHADOWSOCKS

#                                    #
# 这里记住要替换为 SS 后端服务器地址！！！ #
#                                    #
iptables -t nat -A SHADOWSOCKS -d $SOCKS_SERVER -j RETURN

# Ignore LANs and any other addresses you'd like to bypass the proxy
# See Wikipedia and RFC5735 for full list of reserved networks.
# See ashi009/bestroutetb for a highly optimized CHN route list.
iptables -t nat -A SHADOWSOCKS -d 0.0.0.0/8 -j RETURN
iptables -t nat -A SHADOWSOCKS -d 10.0.0.0/8 -j RETURN
iptables -t nat -A SHADOWSOCKS -d 127.0.0.0/8 -j RETURN
iptables -t nat -A SHADOWSOCKS -d 169.254.0.0/16 -j RETURN
iptables -t nat -A SHADOWSOCKS -d 172.16.0.0/12 -j RETURN
iptables -t nat -A SHADOWSOCKS -d 192.168.0.0/16 -j RETURN
iptables -t nat -A SHADOWSOCKS -d 224.0.0.0/4 -j RETURN
iptables -t nat -A SHADOWSOCKS -d 240.0.0.0/4 -j RETURN

# Allow connection to chinese IPs
iptables -t nat -A SHADOWSOCKS -p tcp -m set --match-set chnroute dst -j RETURN
iptables -t nat -A SHADOWSOCKS -p udp -m set --match-set chnroute dst -j RETURN

# 如果你想对 icmp 协议也实现智能分流，可以加上下面这一条
# iptables -t nat -A SHADOWSOCKS -p icmp -m set --match-set chnroute dst -j RETURN

#
# 如果 ss-redir 配置的本地代理端口不是 1080，则必须将下述命令中的 1080 改为正确的值
#
iptables -t nat -A SHADOWSOCKS -p tcp -j REDIRECT --to-port 1080
iptables -t nat -A SHADOWSOCKS -p udp -j REDIRECT --to-port 1080

# 如果你想对 icmp 协议也实现智能分流，可以加上下面这一条
# iptables -t nat -A SHADOWSOCKS -p icmp -j REDIRECT --to-port 1080

# 将SHADOWSOCKS链中所有的规则追加到OUTPUT链中
iptables -t nat -A OUTPUT -p tcp -j SHADOWSOCKS
iptables -t nat -A OUTPUT -p udp -j SHADOWSOCKS

# 如果你想对 icmp 协议也实现智能分流，可以加上下面这一条
# iptables -t nat -A OUTPUT -p icmp -j SHADOWSOCKS
```

上述操作执行完成后，通过修改配置文件 `/etc/shadowsocks-libev/config.json` 填写好连接信息，然后通过该配置文件运行 ss-redir 即可。

为了方便我创建了一个 systemd 服务文件

```bash
sudo cat > /etc/systemd/system/deepin-xwall.service <<EOF
[Unit]
Description=Deepin Xwall Service
After=network.target

[Service]
ExecStart=/usr/bin/ss-redir -u -n 65535 -c "/etc/shadowsocks-libev/config.json"

[Install]
WantedBy=multi-user.target
EOF
```

然后将其设为开机启动即可

```bash
sudo systemctl start deepin-xwall
sudo systemctl enable deepin-xwall
```

至此，整个系统所有程序都进入了翻墙模式，不需要再设置什么环境变量啥的，也不需要程序自身做兼容。我的 Go 语言项目的依赖包也能正常下载了，真是美滋滋。