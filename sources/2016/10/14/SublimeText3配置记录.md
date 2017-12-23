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
    "auto_close_tags": true,
    "bold_folder_labels": true,
    "close_windows_when_empty": true,
    "color_scheme": "Packages/Material Theme/schemes/Material-Theme.tmTheme",
    "default_line_ending": "unix",
    "ensure_newline_at_eof_on_save": true,
    "folder_exclude_patterns":
    [
        ".svn",
        ".git",
        ".hg",
        "CVS",
        ".phpintel",
        ".idea"
    ],
    "font_face": "YaHei-Consolas-Hybrid",
    "font_options":
    [
        "gray_antialias"
    ],
    "font_size": 12,
    "highlight_line": true,
    "highlight_modified_tabs": true,
    "ignored_packages":
    [
        "Nodejs",
        "Vintage"
    ],
    "indent_guide_options":
    [
        "draw_normal",
        "draw_active"
    ],
    "indent_to_bracket": true,
    "line_padding_bottom": 1,
    "line_padding_top": 1,
    "material_theme_tree_headings": true,
    "overlay_scroll_bars": "enabled",
    "reveal-on-activate": false,
    "scroll_past_end": true,
    "shift_tab_unindent": true,
    "show_encoding": true,
    "show_full_path": true,
    "show_line_endings": true,
    "theme": "Material-Theme.sublime-theme",
    "translate_tabs_to_spaces": true,
    "trim_trailing_white_space_on_save": true,
    "update_check": false
}
```

可以看出字体方面我选择的是 `YaHei-Consolas-Hybrid`，大体上还不错。之前一直使用的 `Source-Code-Pro Yahei Hybrid`，不是对称字体，效果不怎么好。

## 插件

因为个人职业和爱好的原因，我选择了以下插件：

- Autoprefixer
- Babel
- CodeFormatter
- ConvertToUTF8
- DocBlockr
- Dockerfile Syntax Highlighting
- Generic Config
- Git Config
- GitGutter
- JSX
- Laravel 5 Snippets
- Laravel Blade Highlighter
- LESS
- MarkdownEditing
- Minify
- Nodejs
- PHP Completions kit
- PHPIntel
- SublimeCodeIntel
- SublimeLinter
- SublimeLinter-contrib-eslint
- SublimeLinter-jslint
- SublimeLinter-json
- SublimeLinter-php
- SyncedSideBar
- VAlign

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
