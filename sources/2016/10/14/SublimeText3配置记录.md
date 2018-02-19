# SublimeText3配置记录

> Author : laeo

> Date   : 2016/10/14

> License: CC BY-NC-SA 3.0

一直以来，Sublime Text 3都是我搬砖的主力工具，我实在太喜欢轻量级的软件了。使用方便、启动迅速、插件丰富、扩展性强，是我选择它的主要理由。

搜索一款插件的资料时，突然想到我应该将环境的配置步骤都一一记录下来，以免以后的工作中出现配置缺漏的情况，导致开发效率降低。

## 设置

对于新安装的 `Sublime Text 3` 首要安装的就是 `Package Control`，然后是选择一款自己喜爱的主题，我选择的是 `Material Theme`，它有一款扩展的 `Appbar` 组件，建议同时安装，增强体（zhuang）验（13）。

安装完主题之后，仿照系统自身的配置文件，修改出属于自己的个性化配置文件。我的配置文件如下：

```
{
    "always_show_minimap_viewport": true,
    "auto_find_in_selection": true,
    "color_scheme": "Packages/Material Theme/schemes/Material-Theme.tmTheme",
    "default_line_ending": "unix",
    "font_face": "DejaVu Sans Mono",
    "font_size": 10,
    "ignored_packages":
    [
        "Vintage"
    ],
    "indent_guide_options":
    [
        "draw_normal",
        "draw_active"
    ],
    "indent_to_bracket": true,
    "line_padding_bottom": 3,
    "line_padding_top": 3,
    "match_brackets_angle": true,
    "material_theme_tree_headings": true,
    "overlay_scroll_bars": "enabled",
    "shift_tab_unindent": true,
    "show_encoding": true,
    "show_line_endings": true,
    "theme": "Material-Theme.sublime-theme",
    "translate_tabs_to_spaces": true,
    "trim_trailing_white_space_on_save": true
}
```

可以看出字体方面我选择的是 `YaHei-Consolas-Hybrid`，大体上还不错。之前一直使用的 `Source-Code-Pro Yahei Hybrid`，不是对称字体，效果不怎么好。

> 2018/2/19 更新后字体选择了 DejaVu Sans Mono，本来用的是 Droid Sans Mono 的，但是发现中英文不等高，所以选择了它。

## 插件

因为个人职业和爱好的原因，我选择了以下插件：

- A File Icon
- Babel
- CodeFormatter
- DocBlockr
- Dockerfile Syntax Highlighting
- GitGutter
- Gitignore
- Laravel Blade Highlighter
- Material Theme
- Material Theme - Appbar
- Package Control
- PHP Completions Kit
- SublimeCodeIntel
- SublimeLinter
- SublimeLinter-json
- SublimeLinter-php
- VAlign
- Vue Syntax Highlight
- Vuejs Snippets

> 2018/2/19 删减部分插件

上述插件是我在之前不小心 `rm -rf` 了自己的个人目录之后重新摸索安装的，有的插件功能是有重复的，但是我没有去细心折腾。

之前那次配置是最完美的，可惜那时候没想到要把这些东西记录下来，于是就废了。

### DocBlockr

```
{
  "jsdocs_spacer_between_sections": true,
  "jsdocs_lower_case_primitives": true,
}
```

## 未完待更

等以后有改动了，会不停修改本文，也算是增强记忆吧。
